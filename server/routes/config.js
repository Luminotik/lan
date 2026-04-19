import express from 'express';

import pool from '../db.js';

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
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

export default router;