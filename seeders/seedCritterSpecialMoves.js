const fs = require('fs');
const path = require('path');
const db = require('../db/db');

async function seedCritterSpecialMoves() {
  try {
    const filePath = path.join(__dirname, '../data/evolutionChains.json');
    const evolutionChains = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const chain of evolutionChains) {
      for (const form of chain.forms) {
        const critterName = form.name;
        const specialMoveName = form.special;

        if (!specialMoveName) continue; // Skip if no special move

        // Get critter ID
        const critterRes = await db.query('SELECT id FROM critters WHERE name = $1', [critterName]);
        if (critterRes.rows.length === 0) {
          console.error(`❌ Could not find critter: ${critterName}`);
          continue;
        }
        const critterId = critterRes.rows[0].id;

        // Get special move ID
        const moveRes = await db.query('SELECT id FROM special_moves WHERE name = $1', [specialMoveName]);
        if (moveRes.rows.length === 0) {
          console.error(`❌ Could not find special move: ${specialMoveName}`);
          continue;
        }
        const specialMoveId = moveRes.rows[0].id;

        // Insert into critter_special_moves
        await db.query(
          `INSERT INTO critter_special_moves (critter_id, special_move_id) VALUES ($1, $2)`,
          [critterId, specialMoveId]
        );
        console.log(`✅ Linked ${critterName} to special move: ${specialMoveName}`);
      }
    }

    console.log('🎉 All critter special moves seeded successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding critter special moves:', err);
    process.exit(1);
  }
}

module.exports = seedCritterSpecialMoves