const fs = require('fs');
const path = require('path');
const db = require('../db/db');

async function seedSpecialMoves() {
  try {
    const filePath = path.join(__dirname, '../data/specialmoves.json');
    const specialMoves = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const move of specialMoves) {
      await db.query(
        `INSERT INTO special_moves (name, base_damage, description, energy_cost, status_effect_id, status_chance, dice_sides, rank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          move.name,
          move.base_damage,
          move.description,
          move.energy_cost,
          move.status_effect_id,
          move.status_chance,
          move.dice_sides,
          move.rank
        ]
      );
    }

    console.log('✅ Special moves seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding special moves:', err);
    process.exit(1);
  }
}

module.exports = seedSpecialMoves;