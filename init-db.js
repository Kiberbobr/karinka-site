require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function initDB() {
  try {
    console.log('Initializing database...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        url TEXT NOT NULL,
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS anime (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        rating DECIMAL(3,1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dates (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Database initialized successfully!');
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

initDB();