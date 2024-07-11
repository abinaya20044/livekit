import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config(); 

const pool = new Pool({
  user: 'Postgress',
  host: 'localhost',
  database: 'meet',
  password: 'Abinaya@123',
  port: 5433,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Connected to the database successfully');
    client.release();
  } catch (err) {
    console.error('Error connecting to the database:', err);
  }
}

testConnection();

export default pool;