const { EmbedBuilder } = require('discord.js');
const db = require('../db/db');

module.exports = async function setactive(message, args) {
  const userId = message.author.id;
  const targetName = args.join(' ').trim();

  if (!targetName) {
    return message.reply('```Please specify the name of the Critter you want to set as active.```');
  }

  try {
    // Get player ID
    const playerRes = await db.query('SELECT id FROM players WHERE user_id = $1', [userId]);
    if (playerRes.rows.length === 0) {
      return message.reply('```You are not registered. Use !register to begin your journey.```');
    }
    const playerId = playerRes.rows[0].id;

    // Find the critter in player's collection
    const critterRes = await db.query(`
      SELECT pc.id AS player_critter_id, c.* FROM player_critters pc
      JOIN critters c ON pc.critter_id = c.id
      WHERE pc.user_id = $1 AND c.name ILIKE $2
    `, [playerId, targetName]);

    if (critterRes.rows.length === 0) {
      return message.reply(`\`\`\`You don't own a Critter named "${targetName}".\`\`\`\u200B`);
    }

    const playerCritterId = critterRes.rows[0].player_critter_id;
    const critter = critterRes.rows[0];

    // Clear previous active critters
    await db.query('UPDATE player_critters SET active = FALSE WHERE user_id = $1', [playerId]);

    // Set the selected one as active
    await db.query('UPDATE player_critters SET active = TRUE WHERE id = $1', [playerCritterId]);

    // Create Embed
    const embed = new EmbedBuilder()
      .setTitle(`🌟 ${critter.name} is now your active Critter!`)
      .setDescription(`This Critter will now appear in battles, events, and exploration.`)
      .addFields(
        { name: 'Level', value: `${critter.level || 1}`, inline: true },
        { name: 'XP', value: `${critter.xp || 0}`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'STR', value: `${critter.str}`, inline: true },
        { name: 'END', value: `${critter.end}`, inline: true },
        { name: 'DEX', value: `${critter.dex}`, inline: true },
        { name: 'SPD', value: `${critter.spd}`, inline: true },
        { name: 'INT', value: `${critter.int}`, inline: true },
        { name: 'CHA', value: `${critter.cha}`, inline: true }
      )
      .setColor(0x00ff99)
      .setThumbnail(critter.img || 'https://cdn.discordapp.com/emojis/1234567890123456789.png') // replace default
      .setFooter({ text: `Use !critters to view your full collection.` });

    message.channel.send({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error in !setactive:', err);
    message.reply('```Something went wrong while setting your active Critter.```');
  }
};