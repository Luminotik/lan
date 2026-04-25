import pg from 'pg';
import dotenv from 'dotenv';
import { createLogger } from './lib/logger.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT,
	database: process.env.DB_NAME,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
});

const logger = createLogger('db');

pool.on('error', (err) => {
	logger.error('Unexpected database pool error', err);
});

export default pool;