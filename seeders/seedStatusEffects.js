const fs = require('fs');
const path = require('path');
const db = require('../db/db');

async function seedStatusEffects() {
  try {
    const filePath = path.join(__dirname, '../data/statusEffects.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const statusEffects = JSON.parse(data);

    for (const effect of statusEffects) {
      const { name, description, effect_type, chance_to_apply } = effect;

      await db.query(
        `INSERT INTO status_effects (name, description, effect_type, chance_to_apply)
         VALUES ($1, $2, $3, $4)`,
        [name, description, effect_type, chance_to_apply]
      );

      console.log(`✅ Seeded status effect: ${name}`);
    }

    console.log('🎉 All status effects seeded!');
  } catch (err) {
    console.error('❌ Error seeding status effects:\n', err);
    process.exit(1);
  }
}

module.exports = seedStatusEffects;