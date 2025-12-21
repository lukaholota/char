const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  console.log('Connecting to:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
  try {
    const start = Date.now();
    const client = await pool.connect();
    console.log('Connected in', Date.now() - start, 'ms');
    const res = await client.query('SELECT NOW()');
    console.log('Query result:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('Connection error:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

test();
