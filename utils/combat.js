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

async function takeTurn(attacker, defender, channel) {
  const move = await selectMove(attacker);
  const embed = new EmbedBuilder().setColor(0x00ff00);

  if (move.type === 'Attack') {
    const accuracy = rollDice(20) + attacker.dex;
    const dodge = rollDice(20) + defender.spd;

    if (accuracy >= dodge) {
      const damage = Math.max(0, rollDice(12) + attacker.str - defender.end / 2);
      defender.health -= damage;

      embed.setTitle(`**${attacker.name}** attacks!`)
        .setDescription(`It hits **${defender.name}** for \`${damage}\` damage!`);
    } else {
      embed.setTitle(`**${attacker.name}** attacks!`)
        .setDescription('But it misses!');
    }
  } else if (move.type === 'Guard') {
    const guardValue = rollDice(12) + attacker.end;
    embed.setTitle(`**${attacker.name}** guards!`)
      .setDescription(`It reduces incoming damage by \`${guardValue}\` this turn.`);
  } else if (move.type === 'Special') {
    if (attacker.energy >= move.energy_cost) {
      attacker.energy -= move.energy_cost;

      const accuracy = rollDice(20) + attacker.dex;
      const dodge = rollDice(20) + defender.spd;

      if (accuracy >= dodge) {
        const baseDamage = move.base_damage + rollDice(move.dice_sides);
        const damage = Math.max(0, baseDamage - defender.end / 2);
        defender.health -= damage;

        embed.setTitle(`**${attacker.name}** uses **${move.name}**!`)
          .setDescription(`It hits **${defender.name}** for \`${damage}\` damage!`);

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
  }

  await channel.send({ embeds: [embed] });
}

async function selectMove(critter) {
  const moves = ['Attack', 'Guard'];

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

  return moves[Math.floor(Math.random() * moves.length)];
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