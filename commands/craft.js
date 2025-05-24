const db = require('../db/db');
const recipes = require('../data/recipes.json');
const evolutionChains = require('../data/evolutionChains.json');
const { EmbedBuilder } = require('discord.js');

async function craft(message, args) {
  const userId = message.author.id;
  const targetName = args.join(' ').trim();
  if (!targetName) {
    // Fetch the user's inventory
    const playerResult = await db.query('SELECT user_id FROM players WHERE user_id = $1', [userId]);
    if (playerResult.rows.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Not Registered')
        .setDescription('You must register before crafting. Use `!register`.')
        .setColor(0xff5555);
      return message.channel.send({ embeds: [embed] });
    }
    const inventoryResult = await db.query(
      `SELECT i.name, pi.quantity FROM player_items pi JOIN items i ON pi.item_id = i.id WHERE pi.user_id = $1`,
      [userId]
    );
    const inventory = {};
    for (const row of inventoryResult.rows) {
      inventory[row.name] = row.quantity;
    }
    // Find all craftable critters
    const craftable = [];
    for (const recipe of recipes) {
      const missing = [];
      for (const [itemName, qty] of Object.entries(recipe.required_items)) {
        if (!inventory[itemName] || inventory[itemName] < qty) {
          missing.push(`${qty}x ${itemName}`);
        }
      }
      if (missing.length === 0) {
        // User can craft this critter
        craftable.push({
          name: recipe.critter_name,
          items: Object.entries(recipe.required_items).map(([item, qty]) => `${qty}x ${item}`)
        });
      }
    }
    if (craftable.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Craftable Critters')
        .setDescription('You do not have enough items to craft any critters.')
        .setColor(0xffaa00);
      return message.channel.send({ embeds: [embed] });
    }
    // Build embed with craftable critters
    const embed = new EmbedBuilder()
      .setTitle('🛠️ Craftable Critters')
      .setDescription('You can craft the following critters with your current inventory:')
      .setColor(0x00bfff);
    for (const c of craftable) {
      embed.addFields({ name: c.name, value: c.items.join(', '), inline: false });
    }
    return message.channel.send({ embeds: [embed] });
  }

  try {
    const targetResult = await db.query('SELECT * FROM critters WHERE name = $1', [targetName]);
    if (targetResult.rows.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Critter Not Found')
        .setDescription(`The Critter "${targetName}" does not exist.`)
        .setColor(0xff5555);
      return message.channel.send({ embeds: [embed] });
    }

    const targetCritter = targetResult.rows[0];
    const targetRank = targetCritter.rank;

    let requiredCritterName = null;
    let requiredCritterId = null;
    let requiredCount = 0;

    if (targetRank !== 'Proto') {
      const baseChain = evolutionChains.find(chain =>
        chain.forms.some(form => form.name === targetName)
      );

      if (!baseChain) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Evolution Chain Not Found')
          .setDescription('Could not find evolution chain for this Critter.')
          .setColor(0xff5555);
        return message.channel.send({ embeds: [embed] });
      }

      const currentFormIndex = baseChain.forms.findIndex(f => f.name === targetName);
      const previousForm = baseChain.forms[currentFormIndex - 1];
      if (!previousForm) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Invalid Evolution Stage')
          .setDescription('This Critter cannot be crafted due to an invalid evolution stage.')
          .setColor(0xff5555);
        return message.channel.send({ embeds: [embed] });
      }

      const prevFormResult = await db.query('SELECT id FROM critters WHERE name = $1', [previousForm.name]);
      if (prevFormResult.rows.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Previous Form Not Found')
          .setDescription('The previous evolution form is missing in the database.')
          .setColor(0xff5555);
        return message.channel.send({ embeds: [embed] });
      }

      requiredCritterName = previousForm.name;
      requiredCritterId = prevFormResult.rows[0].id;
      requiredCount = 3;

      const countResult = await db.query(
        'SELECT COUNT(*) FROM player_critters WHERE user_id = (SELECT id FROM players WHERE user_id = $1) AND critter_id = $2',
        [userId, requiredCritterId]
      );

      if (parseInt(countResult.rows[0].count) < requiredCount) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Not Enough Critters')
          .setDescription(`You need at least ${requiredCount} ${requiredCritterName}s to merge into ${targetName}.`)
          .setColor(0xff5555);
        return message.channel.send({ embeds: [embed] });
      }
    }

    const recipe = recipes.find(r => r.critter_name === targetName);
    if (!recipe) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Recipe Found')
        .setDescription('This Critter cannot be crafted because no recipe exists.')
        .setColor(0xff5555);
      return message.channel.send({ embeds: [embed] });
    }

    for (const [itemName, itemQty] of Object.entries(recipe.required_items)) {
      const itemResult = await db.query(
        `SELECT pi.quantity FROM player_items pi
         JOIN items i ON pi.item_id = i.id
         WHERE pi.user_id = $1 AND i.name = $2`,
        [userId, itemName]
      );

      if (itemResult.rows.length === 0 || itemResult.rows[0].quantity < itemQty) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Missing Items')
          .setDescription(`You are missing ${itemQty}x ${itemName}.`)
          .setColor(0xffaa00);
        return message.channel.send({ embeds: [embed] });
      }
    }

    for (const [itemName, itemQty] of Object.entries(recipe.required_items)) {
      await db.query(
        `UPDATE player_items SET quantity = quantity - $1
         WHERE user_id = $2
         AND item_id = (SELECT id FROM items WHERE name = $3)`,
        [itemQty, userId, itemName]
      );
    }

    if (requiredCritterId) {
      await db.query(
        `DELETE FROM player_critters
         WHERE id IN (
           SELECT id FROM player_critters
           WHERE user_id = $1
           AND critter_id = $2
           LIMIT 3
         )`,
        [userId, requiredCritterId]
      );
    }

    await db.query(
      `INSERT INTO player_critters (
         user_id, critter_id, level, xp, health, energy,
         str, "end", dex, spd, int, cha, active
       ) VALUES (
         $1, $2, 1, 0, 100, 100,
         $3, $4, $5, $6, $7, $8, FALSE
       )`,
      [userId, targetCritter.id,
       targetCritter.str, targetCritter.end, targetCritter.dex,
       targetCritter.spd, targetCritter.int, targetCritter.cha]
    );

    const embed = new EmbedBuilder()
      .setTitle('✅ Crafting Success!')
      .setDescription(`You successfully crafted **${targetName}**!`)
      .setColor(0x00ff99)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error in !craft:', err);
    const embed = new EmbedBuilder()
      .setTitle('❌ Crafting Error')
      .setDescription('Something went wrong while crafting.')
      .setColor(0xff0000);
    message.channel.send({ embeds: [embed] });
  }
}

module.exports = craft;