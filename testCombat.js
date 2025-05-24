const { startCombat } = require('./utils/combat');

// Mock channel object
const mockChannel = {
  send: (message) => {
    if (typeof message === 'string') {
      console.log(message);
    } else if (message.embeds && message.embeds.length > 0) {
      const embed = message.embeds[0];
      console.log(embed.data.title || 'Embed has no title', embed.data.description || 'Embed has no description');
      if (embed.data.fields) {
        embed.data.fields.forEach((field) => {
          console.log(`${field.name}: ${field.value}`);
        });
      }
    } else {
      console.log('Unknown message format or empty embed:', message);
    }
  },
};

// Mock database query
const db = require('./db/db');
db.query = async (query, params) => {
  if (query.includes('player_critters')) {
    if (params[0] === 1) {
      return {
        rows: [
          {
            user_id: 1,
            critter_id: 1,
            name: 'CritterA',
            spd: 10,
            health: 100,
            max_health: 100,
            dex: 8,
            str: 12,
            end: 10,
            energy: 50,
            current_status_effect: null,
            status_duration: 0,
          },
        ],
      };
    } else if (params[0] === 2) {
      return {
        rows: [
          {
            user_id: 2,
            critter_id: 2,
            name: 'CritterB',
            spd: 8,
            health: 100,
            max_health: 100,
            dex: 7,
            str: 10,
            end: 12,
            energy: 50,
            current_status_effect: null,
            status_duration: 0,
          },
        ],
      };
    }
  } else if (query.includes('critter_special_moves')) {
    return {
      rows: [
        {
          special_move_id: 1,
          name: 'Flame Burst',
          type: 'Special',
          base_damage: 20,
          dice_sides: 6,
          energy_cost: 10,
          status_effect_id: 1,
          status_effect_name: 'Burn',
          status_chance: 50,
        },
      ],
    };
  } else if (query.includes('status_effects')) {
    return {
      rows: [
        {
          id: 1,
          name: 'Burn',
        },
      ],
    };
  }
  return { rows: [] };
};

// Run the combat simulation
(async () => {
  await startCombat(1, 2, mockChannel);
})();