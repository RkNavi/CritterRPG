const { EmbedBuilder } = require('discord.js');
const db = require('../db/db');

async function challenge(message, args) {
  const challengerId = message.author.id;
  const challengedUser = message.mentions.users.first();

  if (!challengedUser) {
    return message.reply('```Please mention a user to challenge. Example: !challenge @username```');
  }

  const challengedId = challengedUser.id;

  // Check if both players have active Critters
  const [challengerCritter, challengedCritter] = await Promise.all([
    db.query(`SELECT * FROM player_critters WHERE user_id = $1 AND active = TRUE`, [challengerId]),
    db.query(`SELECT * FROM player_critters WHERE user_id = $1 AND active = TRUE`, [challengedId])
  ]);

  if (!challengerCritter.rows.length || !challengedCritter.rows.length) {
    return message.reply('```Both players must have an active Critter to start a battle.```');
  }

  const embed = new EmbedBuilder()
    .setTitle('⚔️ Challenge Issued!')
    .setDescription(`${message.author.username} has challenged ${challengedUser.username} to a battle!`)
    .setColor(0xff0000)
    .setFooter({ text: 'Type !accept or !decline to respond.' });

  message.channel.send({ embeds: [embed] });

  // Store challenge in memory (or database if needed)
  global.activeChallenges = global.activeChallenges || {};
  global.activeChallenges[challengedId] = { challengerId, challengedId };
};

module.exports = challenge;