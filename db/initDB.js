const db = require('./db'); // your database connection

async function initTables() {
  try {
    // Players Table
    await db.query(`
        CREATE TABLE IF NOT EXISTS players (
          user_id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          gold INTEGER DEFAULT 0,
          registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

    // Critters Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS critters (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        rank TEXT CHECK (rank IN ('Proto', 'Starter', 'Intermediate', 'Apex', 'Legendary')),
        str INTEGER NOT NULL,
        "end" INTEGER NOT NULL,
        dex INTEGER NOT NULL,
        spd INTEGER NOT NULL,
        int INTEGER NOT NULL,
        cha INTEGER NOT NULL,
        description TEXT NOT NULL,
        img TEXT NOT NULL
      );
    `);

    // Status Effects Table
    await db.query(`
        CREATE TABLE IF NOT EXISTS status_effects (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        effect_type TEXT CHECK (effect_type IN ('Burn', 'Bleed', 'Poison', 'Paralyze', 'Freeze', 'Confuse', 'Stun')),
        chance_to_apply INTEGER NOT NULL DEFAULT 25
      );
    `)

    // Player Critters Table
    await db.query(`
        CREATE TABLE IF NOT EXISTS player_critters (
          id SERIAL PRIMARY KEY,
          user_id TEXT REFERENCES players(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
          critter_id INTEGER REFERENCES critters(id) ON DELETE CASCADE ON UPDATE CASCADE,
          level INTEGER NOT NULL,
          xp INTEGER NOT NULL,
          health INTEGER NOT NULL,
          energy INTEGER NOT NULL,
          str INTEGER NOT NULL,
          "end" INTEGER NOT NULL,
          dex INTEGER NOT NULL,
          spd INTEGER NOT NULL,
          int INTEGER NOT NULL,
          cha INTEGER NOT NULL,
          move_list JSONB NOT NULL DEFAULT '{}'::jsonb,
          active BOOLEAN DEFAULT FALSE,
          current_status_effect INTEGER REFERENCES status_effects(id),
          status_duration INTEGER DEFAULT 0
        );
      `);      

    // Items Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS items (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        value INTEGER DEFAULT 0,
        biome TEXT CHECK (biome IN ('City', 'Forest', 'Mountain', 'Desert')),
        img TEXT,
        description TEXT,
        emoji TEXT
      );
    `);

    // Player Items Table
    await db.query(`
        CREATE TABLE IF NOT EXISTS player_items (
          user_id TEXT REFERENCES players(user_id) ON DELETE CASCADE,
          item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
          quantity INTEGER DEFAULT 1,
          PRIMARY KEY (user_id, item_id)
        );
      `);
      

    // Merges (Evolutions) Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS merges (
        id SERIAL PRIMARY KEY,
        from_critter_id INTEGER REFERENCES critters(id) ON DELETE CASCADE ON UPDATE CASCADE,
        result_critter_id INTEGER REFERENCES critters(id) ON DELETE CASCADE ON UPDATE CASCADE,
        required_count INTEGER DEFAULT 3
      );
    `);

    // Special Moves Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS special_moves (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        base_damage INTEGER NOT NULL,
        description TEXT NOT NULL,
        energy_cost INTEGER NOT NULL,
        status_effect_id INTEGER REFERENCES status_effects(id),
        status_chance INTEGER DEFAULT 0,
        dice_sides INTEGER NOT NULL,
        rank TEXT CHECK (rank IN ('Proto', 'Starter', 'Intermediate', 'Apex', 'Legendary'))
      );
    `);

    // Critter Special Moves Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS critter_special_moves (
        id SERIAL PRIMARY KEY,
        critter_id INTEGER REFERENCES critters(id) ON DELETE CASCADE ON UPDATE CASCADE,
        special_move_id INTEGER REFERENCES special_moves(id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // Levels Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS levels (
        level INTEGER PRIMARY KEY,
        xp_required INTEGER NOT NULL
      );
    `);

     // Recipes Table
     await db.query(`
        CREATE TABLE IF NOT EXISTS recipes (
          id SERIAL PRIMARY KEY,
          critter_id INTEGER REFERENCES critters(id) ON DELETE CASCADE ON UPDATE CASCADE,
          required_items JSONB NOT NULL
        );
      `);

    console.log('✅ All tables created successfully!');
    process.exit();
  } catch (err) {
    console.error('❌ Error creating tables:', err);
    process.exit(1);
  }
}

initTables();