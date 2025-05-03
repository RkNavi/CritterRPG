const fs = require('fs');
const path = require('path');
const db = require('../db/db'); // adjust path if different

async function seedRecipes() {
  try {
    const filePath = path.join(__dirname, '../data/recipes.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const recipes = JSON.parse(data);

    for (const recipe of recipes) {
      const { critter_name, required_items } = recipe;

      // Get critter_id by name
      const result = await db.query(
        'SELECT id FROM critters WHERE name = $1',
        [critter_name]
      );

      if (result.rows.length === 0) {
        console.warn(`⚠️  Critter not found: ${critter_name}`);
        continue;
      }

      const critter_id = result.rows[0].id;

      // Insert recipe
      await db.query(
        'INSERT INTO recipes (critter_id, required_items) VALUES ($1, $2)',
        [critter_id, required_items]
      );

      console.log(`✅ Seeded recipe for ${critter_name}`);
    }

    console.log('🎉 All recipes seeded!');
  } catch (err) {
    console.error('❌ Error seeding recipes:', err);
    process.exit(1);
  }
}

module.exports = seedRecipes;