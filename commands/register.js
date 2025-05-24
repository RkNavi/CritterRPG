const path = require('path');
const db = require('../db/db');
const { EmbedBuilder } = require('discord.js');

module.exports = async function register(message) {
  const userId = message.author.id;
  const username = message.author.username;

  try {
    // 1. Check if the player is already registered
    const existingPlayer = await db.query('SELECT * FROM players WHERE user_id = $1', [userId]);
    if (existingPlayer.rows.length > 0) {
      const alreadyEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('❌ Already Registered')
        .setDescription(`You are already registered, ${message.member.displayName}.`);
      return message.reply({ embeds: [alreadyEmbed] });
    }

    // 2. Create new player with 100 gold
    await db.query(
      `INSERT INTO players (user_id, username, gold)
       VALUES ($1, $2, $3)`,
      [userId, username, 100]
    );

    // 3. Get Proto recipes from the database
    const protoRecipesResult = await db.query(`
      SELECT r.required_items, c.name AS critter_name
      FROM recipes r
      JOIN critters c ON r.critter_id = c.id
      WHERE c.rank = 'Proto'
    `);
    const protoRecipes = protoRecipesResult.rows;

    // 4. Pick 3 random Proto recipes
    const selectedRecipes = protoRecipes.sort(() => 0.5 - Math.random()).slice(0, 3);

    // 5. Collect required items from the 3 recipes
    const itemQuantities = {};
    for (const recipe of selectedRecipes) {
      let requiredItems = recipe.required_items;
      if (typeof requiredItems === 'string') {
        try {
          requiredItems = JSON.parse(requiredItems);
        } catch (e) {
          console.error('Failed to parse required_items for recipe:', recipe, e);
          continue;
        }
      }
      console.log('Selected recipe:', recipe.critter_name, 'Required items:', requiredItems);
      for (const [itemName, quantity] of Object.entries(requiredItems)) {
        itemQuantities[itemName] = (itemQuantities[itemName] || 0) + quantity;
      }
    }

    // 6. Insert items into player inventory
    for (const [itemName, quantity] of Object.entries(itemQuantities)) {
      const itemRes = await db.query('SELECT id FROM items WHERE name = $1', [itemName]);
      if (itemRes.rows.length === 0) {
        console.warn(`⚠️ Item not found in DB: ${itemName}`);
        continue;
      }

      const itemId = itemRes.rows[0].id;

      await db.query(
        `INSERT INTO player_items (user_id, item_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, item_id)
         DO UPDATE SET quantity = player_items.quantity + EXCLUDED.quantity`,
        [userId, itemId, quantity]
      );
    }

    // 7. Embed response
    const critterList = selectedRecipes.map(r => `• **${r.critter_name}**`).join('\n');

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('✅ Welcome to CritterRPG!')
      .setDescription(`You’ve been successfully registered, ${message.member.displayName}!`)
      .addFields(
        { name: '💰 Starting Gold', value: '100', inline: true },
        {
          name: '🎒 Starting Items',
          value: `You received enough materials to craft one of these Critters:\n${critterList}`
        },
        {
          name: '📦 What to do next',
          value: 'Use `!inventory` to see your items, and `!craft [critter name]` when ready.'
        },
        {
          name: '⚠️ Note',
          value: 'You can only craft **one** of these now. To craft others later, collect more materials!'
        }
      );

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error in register command:', err);
    const errorEmbed = new EmbedBuilder()
      .setColor('Red')
      .setTitle('❌ Registration Error')
      .setDescription('Something went wrong while registering. Please try again later.');
    return message.reply({ embeds: [errorEmbed] });
  }
};