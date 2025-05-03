const { EmbedBuilder } = require('discord.js');
const db = require('../db/db');

module.exports = async function profile(message) {
  const userId = message.author.id;

  try {
    // 1. Check if the player exists
    const playerRes = await db.query(
      `SELECT * FROM players WHERE user_id = $1`,
      [userId]
    );

    if (playerRes.rows.length === 0) {
      return message.reply('```❌ You are not registered yet. Use !register to begin your journey.```');
    }

    const player = playerRes.rows[0];

    // 2. Get total number of Critters
    const totalCrittersRes = await db.query(
      `SELECT COUNT(*) FROM player_critters WHERE user_id = $1`,
      [userId]
    );
    const totalCritters = parseInt(totalCrittersRes.rows[0].count, 10);

    // 3. Get active Critter (if any)
    const activeCritterRes = await db.query(
      `SELECT c.name, c.img FROM player_critters pc
       JOIN critters c ON pc.critter_id = c.id
       WHERE pc.user_id = $1 AND pc.active = TRUE`,
      [userId]
    );

    let activeCritter = 'None';
    let activeCritterImg = null;

    if (activeCritterRes.rows.length > 0) {
      activeCritter = activeCritterRes.rows[0].name;
      activeCritterImg = activeCritterRes.rows[0].img;
    }

    // 4. Format the embed
    const embed = new EmbedBuilder()
      .setColor('#faa61a')
      .setTitle(`🐾 ${message.member.displayName}'s Profile`)
      .setThumbnail(activeCritterImg || message.author.displayAvatarURL())
      .addFields(
        { name: '💰 Gold', value: `${player.gold}`, inline: true },
        { name: '📅 Registered', value: new Date(player.registered_at).toDateString(), inline: true },
        { name: '📦 Total Critters', value: `${totalCritters}`, inline: true },
        { name: '🎯 Active Critter', value: activeCritter }
      )
      .setFooter({ text: 'Use !inventory to view items • Use !craft to build Critters' });

    return message.reply({ embeds: [embed] });

  } catch (err) {
    console.error('❌ Error in profile command:', err);
    return message.reply('```❌ Something went wrong while fetching your profile.```');
  }
};
