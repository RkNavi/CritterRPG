const fs = require('fs');
const path = require('path');
const db = require('../db/db'); // your existing db pool

async function seedCritters() {
  try {
    const filePath = path.join(__dirname, '../data/critters.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const critters = JSON.parse(data); // this is a flat array

    for (const critter of critters) {
      const {
        name, type, rank, str, end, dex, spd, int, cha, description, img
      } = critter;

      await db.query(
        `INSERT INTO critters (name, type, rank, str, "end", dex, spd, int, cha, description, img)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [name, type, rank, str, end, dex, spd, int, cha, description, img]
      );

      console.log(`✅ Seeded critter: ${name}`);
    }

    console.log('🎉 All critters seeded!');
  } catch (err) {
    console.error('❌ Error seeding critters:', err);
    process.exit(1);
  }
}

module.exports = seedCritters;