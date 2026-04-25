import express from 'express';

import pool from '../db.js';
import { createLogger } from '../lib/logger.js';
const logger = createLogger('config');

const router = express.Router();

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT	event_date,
					motd_title,
					motd_body,
					use_twitch
			 FROM	config`
		);
		res.json(result.rows[0]);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

export default router;