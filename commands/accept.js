const { startCombat } = require('../utils/combat');

async function accept(message) {
  const challengedId = message.author.id;

  if (!global.activeChallenges || !global.activeChallenges[challengedId]) {
    return message.reply('```You have no pending challenges.```');
  }

  const { challengerId } = global.activeChallenges[challengedId];
  delete global.activeChallenges[challengedId];

  // Start combat
  startCombat(challengerId, challengedId, message.channel);
};

module.exports = accept;
// This function will be called when the user accepts a challenge