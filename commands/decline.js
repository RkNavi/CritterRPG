const { EmbedBuilder } = require('discord.js');

async function decline(message) {
  const challengedId = message.author.id;

  if (!global.activeChallenges || !global.activeChallenges[challengedId]) {
    return message.reply('```You have no pending challenges to decline.```');
  }

  const { challengerId } = global.activeChallenges[challengedId];
  delete global.activeChallenges[challengedId];

  const embed = new EmbedBuilder()
    .setTitle('❌ Challenge Declined')
    .setDescription(`${message.author.username} has declined the challenge.`)
    .setColor(0xff0000);

  message.channel.send({ embeds: [embed] });
}

module.exports = decline;