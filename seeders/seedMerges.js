const evolutionChains = require('../data/evolutionChains.json');
const db = require('../db/db');

async function seedMerges() {
try {
  for (const chain of evolutionChains) {
    for (let i = 0; i < chain.forms.length - 1; i++) {
      const from = chain.forms[i].name;
      const to = chain.forms[i + 1].name;

      const fromRes = await db.query('SELECT id FROM critters WHERE name = $1', [from]);
      const toRes = await db.query('SELECT id FROM critters WHERE name = $1', [to]);

      if (fromRes.rows.length === 0 || toRes.rows.length === 0) {
        console.error(`❌ Could not find critter(s): ${from} or ${to}`);
        continue;
      }

      const fromId = fromRes.rows[0].id;
      const toId = toRes.rows[0].id;

      await db.query(
        'INSERT INTO merges (from_critter_id, result_critter_id, required_count) VALUES ($1, $2, $3)',
        [fromId, toId, 3]
      );

      console.log(`✅ Merge set: ${from} (ID ${fromId}) → ${to} (ID ${toId})`);
    }
  }
  console.log('✅ All merges seeded!');
} catch (err) {
  console.error('❌ Error seeding merges:', err);
  process.exit(1);
 }
}
module.exports = seedMerges;