const { EmbedBuilder } = require('discord.js');
const db = require('../db/db');

module.exports = async function critters(message) {
  const userId = message.author.id;

  try {
    // Get player's critters with detailed info
    const result = await db.query(`
      SELECT c.*, pc.level, pc.xp, pc.health, pc.energy, pc.active
      FROM player_critters pc
      JOIN critters c ON pc.critter_id = c.id
      WHERE pc.user_id = (SELECT user_id FROM players WHERE user_id = $1)
      ORDER BY pc.active DESC, pc.level DESC, c.rank ASC, c.name ASC
    `, [userId]);

    const critters = result.rows;
    if (critters.length === 0) {
      return message.reply("```You don't have any Critters yet. Use !craft to make one!```")
    }

    const embed = new EmbedBuilder()
      .setTitle(`🧬 Your Critters: (${critters.length})`)
      .setColor(0x00b5cc)
      .setFooter({ text: 'Use !setactive [critter name] to assign an active Critter.' });

    for (const critter of critters) {
      embed.addFields({
        name: `${critter.active ? '⭐ ' : ''}${critter.name} (${critter.rank})`,
        value: `Level: ${critter.level} | XP: ${critter.xp}\nHP: ${critter.health} | EN: ${critter.energy}\nType: ${critter.type}\nStats: STR ${critter.str}, END ${critter.end}, DEX ${critter.dex}, SPD ${critter.spd}, INT ${critter.int}, CHA ${critter.cha}`,
        inline: false
      });
    }

    message.reply({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error in !critters command:', err);
    return message.reply('❌ Something went wrong while fetching your Critters.');
  }
};
