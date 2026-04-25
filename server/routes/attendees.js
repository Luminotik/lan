import express from 'express';

import pool from '../db.js';
import { createLogger } from '../lib/logger.js';
const logger = createLogger('attendees');

const router = express.Router();

router.get('/', async (req, res) => {
	try {
		const configResult = await pool.query(
			`SELECT	show_inactive_attendees
			 FROM	config
			 LIMIT	1`);
		const { show_inactive_attendees } = configResult.rows[0];

		const result = await pool.query(
			`SELECT	steam_id,
					persona_name,
					avatar,
					avatar_medium,
					avatar_full,
					first_name,
					last_name,
					role,
					level,
					is_new
			 FROM	attendees
			 ${show_inactive_attendees ? '' : 'WHERE	active = true'}
			 ORDER BY	role ASC,
						level DESC,
						is_new ASC,
						first_name ASC`
		);
		res.json(result.rows);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.get('/:steam_id', async (req, res) => {
	try {
		const configResult = await pool.query(
			`SELECT	show_inactive_attendees
			 FROM	config
			 LIMIT	1`);
		const { show_inactive_attendees } = configResult.rows[0];

		const result = await pool.query(
			`SELECT	steam_id,
					persona_name,
					avatar,
					avatar_medium,
					avatar_full,
					first_name,
					last_name,
					role,
					level,
					is_new
			 FROM	attendees
			 WHERE	steam_id = $1
			 ${show_inactive_attendees ? '' : 'AND	active = true'}`,
			[req.params.steam_id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Attendee not found' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

export default router;
