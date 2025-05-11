const seedItems = require('../seeders/seedItems');
const seedCritters = require('../seeders/seedCritters');
const seedRecipes = require('../seeders/seedRecipes');
const seedMerges = require('../seeders/seedMerges');
const seedCritterSpecialMoves = require('../seeders/seedCritterSpecialMoves');
const seedStatusEffects = require('../seeders/seedStatusEffects');
const seedSpecialMoves = require('../seeders/seedSpecialMoves');

async function runAllSeeders() {
  try {
    console.log('🌱 Seeding items...');
    await seedItems();

    console.log('🌱 Seeding critters...');
    await seedCritters();

    console.log('🌱 Seeding status effects...');
    await seedStatusEffects();

    console.log('🌱 Seeding special moves...');
    await seedSpecialMoves();

    console.log('🌱 Seeding recipes...');
    await seedRecipes();

    console.log('🌱 Seeding merges...');
    await seedMerges();

    console.log('🌱 Seeding critter special moves...');
    await seedCritterSpecialMoves();

    console.log('✅ All data successfully seeded!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running seeders:', error);
    process.exit(1);
  }
}

runAllSeeders();