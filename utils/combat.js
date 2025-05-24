const { EmbedBuilder } = require('discord.js');
const db = require('../db/db');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startCombat(challengerId, challengedId, channel) {
  const [challengerCritter, challengedCritter] = await Promise.all([
    db.query(`SELECT * FROM player_critters WHERE user_id = $1 AND active = TRUE`, [challengerId]),
    db.query(`SELECT * FROM player_critters WHERE user_id = $1 AND active = TRUE`, [challengedId])
  ]);

  const critterA = challengerCritter.rows[0];
  const critterB = challengedCritter.rows[0];

  // Initiative Roll
  const initiativeA = rollDice(20) + critterA.spd;
  const initiativeB = rollDice(20) + critterB.spd;

  const first = initiativeA >= initiativeB ? critterA : critterB;
  const second = first === critterA ? critterB : critterA;

  await channel.send(`🎲 Initiative Roll: ${first.name} goes first!`);
  await delay(2000); // Add delay for real-time pacing

  // Combat Loop
  let round = 1;
  while (critterA.health > 0 && critterB.health > 0) {
    await channel.send(`⚔️ **Round ${round}** ⚔️`);
    await delay(2000); // Add delay for real-time pacing

    // First Critter's Turn
    await applyStatusEffects(first, channel);
    if (first.health > 0 && first.can_act !== false) {
      await takeTurn(first, second, channel);
    }
    await delay(2000); // Add delay for real-time pacing

    if (second.health <= 0) break;

    // Second Critter's Turn
    await applyStatusEffects(second, channel);
    if (second.health > 0 && second.can_act !== false) {
      await takeTurn(second, first, channel);
    }
    await delay(2000); // Add delay for real-time pacing

    round++;
  }

  const winner = critterA.health > 0 ? critterA : critterB;
  await channel.send(`🏆 **${winner.name} wins the battle!**`);
}

function generateBar(current, max, length = 10) {
  if (max <= 0) max = 1; // Prevent division by zero or invalid max values
  current = Math.max(0, Math.min(current, max)); // Clamp current to be between 0 and max

  const filledLength = Math.round((current / max) * length);
  const emptyLength = Math.max(0, length - filledLength); // Ensure emptyLength is non-negative
  const healthBar = '❤️  ' + '█'.repeat(filledLength) + '░'.repeat(emptyLength); // Add heart emoji for health
  return healthBar;
}

function generateEnergyBar(current, max, length = 10) {
  if (max <= 0) max = 1; // Prevent division by zero or invalid max values
  current = Math.max(0, Math.min(current, max)); // Clamp current to be between 0 and max

  const filledLength = Math.round((current / max) * length);
  const emptyLength = Math.max(0, length - filledLength); // Ensure emptyLength is non-negative
  const energyBar = '⚡ ' + '█'.repeat(filledLength) + '░'.repeat(emptyLength); // Add thunderbolt emoji for energy
  return energyBar;
}

async function takeTurn(attacker, defender, channel) {
  const move = await selectMove(attacker);
  const embed = new EmbedBuilder().setColor(0x00ff00);

  if (move.type === 'Attack') {
    const baseAccuracyBonus = 5; // Add a base accuracy bonus to improve hit chances
    const accuracy = rollDice(20) + attacker.dex + baseAccuracyBonus;
    const dodge = rollDice(20) + defender.spd;

    console.log(`Attack Roll: Accuracy (${accuracy}) vs Dodge (${dodge})`);

    if (accuracy >= dodge) {
      const baseDamage = rollDice(12) + attacker.str;
      const damageReduction = defender.guardValue || 0; // Only apply guard reduction if guard was used
      let damage = baseDamage - damageReduction; // Calculate raw damage without base defense
      damage = Math.max(0, damage); // Clamp damage to zero only if it is negative
      const defenderHealthBefore = defender.health;
      defender.health -= damage;
      defender.guardValue = 0; // Reset guard value after applying it to ensure no stacking
      const attackRollMessage = `🎲 Attack Roll: Accuracy (${accuracy}) vs Dodge (${dodge})`;
      const reductionMessage = damageReduction > 0
        ? `, but it is reduced by \`-${damageReduction}\` from **${defender.name}**'s guard! The attack only lands \`${damage}\` dmg!`
        : ''; // No reduction message if no guard was used

      const description = damageReduction > 0
        ? `It would have hit **${defender.name}** for \`${baseDamage}\` damage, but it is reduced by \`-${damageReduction}\` from **${defender.name}**'s guard!! (It only hits for \`${damage}\` dmg)`
        : `It hits **${defender.name}** for \`${damage}\` damage!`;

      embed.setTitle(`**${attacker.name}** uses **${move.name || 'Attack'}**!`)
        .setDescription(
          `\n${attackRollMessage}\n` +
          `${description}\n` +
          `**${defender.name}**: ${generateBar(defender.health, defender.max_health)} ${defender.health}/${defender.max_health} HP (-${damage} dmg against ${defenderHealthBefore} hp)`
        );
    } else {
      embed.setTitle(`**${attacker.name}** uses **${move.name || 'Attack'}**!`)
        .setDescription('But it misses!');
    }
  } else if (move.type === 'Guard') {
    const guardValue = rollDice(12) + (attacker.end / 2); // Adjusted guard value calculation
    attacker.guardValue = guardValue; // Store guard value for the next attack

    embed.setTitle(`**${attacker.name}** guards!`)
      .setDescription(
        `It reduces incoming damage by \`${guardValue}\` against the next attack.\n` +
        `**${attacker.name}**: ${generateBar(attacker.health, attacker.max_health)} ${attacker.health}/${attacker.max_health} HP`
      );
  } else if (move.type === 'Special') {
    if (attacker.energy >= move.energy_cost) {
      attacker.energy -= move.energy_cost;

      const accuracy = rollDice(20) + (attacker.dex / 2);
      const dodge = rollDice(20) + (defender.spd / 2);

      if (accuracy >= dodge) {
        const baseDamage = move.base_damage + rollDice(move.dice_sides);
        const damageReduction = defender.guardValue || 0; // Only apply guard reduction if guard was used
        let damage = baseDamage - damageReduction; // Calculate raw damage
        damage = Math.max(0, damage); // Clamp damage to zero only if it is negative
        const defenderHealthBefore = defender.health;
        defender.health -= damage;
        defender.guardValue = 0; // Reset guard value after applying it

        const reductionMessage = damageReduction > 0
          ? `It would have hit **${defender.name}** for \`${baseDamage}\` damage, but it is reduced by \`${damageReduction}\` from **${defender.name}**'s guard!! (It only hits for \`${damage}\` dmg)`
          : `It hits **${defender.name}** for \`${damage}\` damage!`;

        embed.setTitle(`**${attacker.name}** uses **${move.name}**!`)
          .setDescription(
            `${reductionMessage}\n` +
            `**${defender.name}**: ${generateBar(defender.health, defender.max_health)} ${defender.health}/${defender.max_health} HP (-${damage} dmg against ${defenderHealthBefore} hp)`
          );

        if (move.status_effect_id && rollDice(100) <= move.status_chance) {
          defender.current_status_effect = move.status_effect_id;
          defender.status_duration = 3; // Example duration

          embed.addFields({ name: 'Status Effect', value: `**${defender.name}** is now affected by **${move.status_effect_name}**!` });
        }
      } else {
        embed.setTitle(`**${attacker.name}** uses **${move.name}**!`)
          .setDescription('But it misses!');
      }
    } else {
      embed.setTitle(`**${attacker.name}** tries to use **${move.name}**!`)
        .setDescription('But it doesn’t have enough energy!');
    }
  } else {
    embed.setTitle(`**${attacker.name}** is confused!`)
      .setDescription('It does nothing this turn.');
  }

  embed.addFields(
    { name: `${attacker.name} Stats`, value: `HP: ${generateBar(attacker.health, attacker.max_health)} ${attacker.health}/${attacker.max_health}\nEnergy: ${generateEnergyBar(attacker.energy, 50)} ${attacker.energy}/50` },
    { name: `${defender.name} Stats`, value: `HP: ${generateBar(defender.health, defender.max_health)} ${defender.health}/${defender.max_health}\nEnergy: ${generateEnergyBar(defender.energy, 50)} ${defender.energy}/50` }
  );

  await channel.send({ embeds: [embed] });
}

async function selectMove(critter) {
  const moves = [
    { type: 'Attack' },
    { type: 'Guard' }
  ];

  // Fetch special moves from the database
  const specialMoves = await db.query(
    `SELECT sm.* FROM critter_special_moves csm
     JOIN special_moves sm ON csm.special_move_id = sm.id
     WHERE csm.critter_id = $1`,
    [critter.critter_id]
  );

  for (const move of specialMoves.rows) {
    moves.push({ type: 'Special', ...move });
  }

  const selectedMove = moves[Math.floor(Math.random() * moves.length)];

  return selectedMove;
}

async function applyStatusEffects(critter, channel) {
  if (!critter.current_status_effect) return;

  const statusEffect = await db.query(
    `SELECT * FROM status_effects WHERE id = $1`,
    [critter.current_status_effect]
  );

  if (statusEffect.rows.length === 0) return;

  const effect = statusEffect.rows[0];
  const embed = new EmbedBuilder().setColor(0xff0000);

  switch (effect.name) {
    case 'Burn':
      const burnDamage = Math.floor(critter.max_health * 0.1);
      critter.health = Math.max(0, critter.health - burnDamage);

      embed.setTitle(`${critter.name} is Burned!`)
        .setDescription(`It takes ${burnDamage} damage over time.`);
      break;

    case 'Bleed':
      const bleedDamage = Math.floor(critter.max_health * 0.05);
      critter.health = Math.max(0, critter.health - bleedDamage);
      embed.setTitle(`${critter.name} is Bleeding!`)
        .setDescription(`It takes ${bleedDamage} damage due to bleeding.`);
      break;

    case 'Hasted':
      critter.spd += 5;
      embed.setTitle(`${critter.name} is Hasted!`)
        .setDescription(`Its speed increases temporarily.`);
      break;

    case 'Slowed':
      critter.spd = Math.max(0, critter.spd - 5);
      embed.setTitle(`${critter.name} is Slowed!`)
        .setDescription(`Its speed decreases temporarily.`);
      break;

    case 'Paralyzed':
      critter.can_act = false;
      embed.setTitle(`${critter.name} is Paralyzed!`)
        .setDescription(`It cannot act this turn.`);
      break;

    case 'Rooted':
      critter.can_dodge = false;
      embed.setTitle(`${critter.name} is Rooted!`)
        .setDescription(`It cannot dodge attacks.`);
      break;

    case 'Blinked':
      critter.dodge_chance += 20;
      embed.setTitle(`${critter.name} is Blinked!`)
        .setDescription(`It has a higher chance to dodge attacks.`);
      break;

    case 'Enraged':
      critter.can_use_special_moves = false;
      critter.attack_damage += 10;
      embed.setTitle(`${critter.name} is Enraged!`)
        .setDescription(`It can only use basic attacks but deals more damage.`);
      break;

    case 'Confused':
      if (Math.random() < 0.5) {
        const selfDamage = Math.floor(critter.health * 0.1);
        critter.health = Math.max(0, critter.health - selfDamage);
        embed.setTitle(`${critter.name} is Confused!`)
          .setDescription(`It attacks itself for ${selfDamage} damage.`);
      }
      break;

    case 'Silenced':
      critter.can_use_special_moves = false;
      embed.setTitle(`${critter.name} is Silenced!`)
        .setDescription(`It cannot use special moves.`);
      break;

    case 'Mind Fogged':
      critter.accuracy -= 10;
      embed.setTitle(`${critter.name} is Mind Fogged!`)
        .setDescription(`Its accuracy is greatly reduced.`);
      break;

    case 'Shocked':
      const shockDamage = Math.floor(critter.max_health * 0.08);
      critter.health = Math.max(0, critter.health - shockDamage);
      if (Math.random() < 0.3) {
        critter.can_act = false;
        embed.setTitle(`${critter.name} is Shocked!`)
          .setDescription(`It takes ${shockDamage} damage and is interrupted.`);
      } else {
        embed.setTitle(`${critter.name} is Shocked!`)
          .setDescription(`It takes ${shockDamage} damage.`);
      }
      break;

    case 'Drained':
      critter.energy = Math.max(0, critter.energy - 5);
      embed.setTitle(`${critter.name} is Drained!`)
        .setDescription(`It loses energy over time.`);
      break;

    default:
      embed.setTitle(`${critter.name} is affected by ${effect.name}!`)
        .setDescription(`No specific logic implemented for this effect.`);
      break;
  }

  critter.status_duration -= 1;
  if (critter.status_duration <= 0) {
    critter.current_status_effect = null;
    embed.addFields({ name: 'Status Ended', value: `${effect.name} has worn off.` });
  }

  await channel.send({ embeds: [embed] });
}

function rollDice(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

module.exports = { startCombat };