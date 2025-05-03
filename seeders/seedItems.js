const fs = require('fs');
const path = require('path');
const db = require('../db/db'); // your existing db pool

async function seedItems() {
  try {
    const filePath = path.join(__dirname, '../data/items.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const items = JSON.parse(data);

    for (const item of items) {
      const { name, value, biome, img, description, emoji } = item;

      await db.query(
        `INSERT INTO items (name, value, biome, img, description, emoji)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, value, biome, img, description, emoji]
      );

      console.log(`✅ Seeded item: ${name}`);
    }

    console.log('🎉 All items seeded!');
  } catch (err) {
    console.error('❌ Error seeding items:', err);
    process.exit(1);
  }
}

module.exports = seedItems;