const { EmbedBuilder } = require('discord.js');
const db = require('../db/db');

module.exports = async function critter(message, args) {
  const userId = message.author.id;
  const critterName = args.join(' ').trim();

  if (!critterName) {
    return message.reply('```Please specify the name of the Critter. Example: !critter Vixitron```');
  }

  try {
    const result = await db.query(`
      SELECT c.*, pc.level, pc.xp, pc.health, pc.energy
      FROM player_critters pc
      JOIN critters c ON pc.critter_id = c.id
      WHERE pc.user_id = (SELECT user_id FROM players WHERE user_id = $1)
      AND c.name ILIKE $2
      LIMIT 1
    `, [userId, critterName]);

    if (result.rows.length === 0) {
      return message.reply(`\`\`\`❌ You don't have a Critter named "${critterName}".\`\`\``);
    }

    const critter = result.rows[0];

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle(`📘 ${critter.name} (${critter.rank})`)
      .setDescription(critter.description)
      .setThumbnail(critter.img)
      .addFields(
        { name: '🔹 Type', value: critter.type, inline: true },
        { name: '🔸 Level', value: critter.level.toString(), inline: true },
        { name: '✨ XP', value: critter.xp.toString(), inline: true },
        { name: '❤️ HP', value: critter.health.toString(), inline: true },
        { name: '⚡ Energy', value: critter.energy.toString(), inline: true },
        { name: '📊 Stats', value: `STR ${critter.str} | END ${critter.end} | DEX ${critter.dex} | SPD ${critter.spd} | INT ${critter.int} | CHA ${critter.cha}` }
      )
      .setFooter({ text: 'Use !critters to view your full roster.' });

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error in !critter command:', err);
    return message.reply('```❌ Something went wrong while fetching your Critter info.```');
  }
};