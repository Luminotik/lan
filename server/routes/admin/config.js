import express from 'express';
import pool from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT	*

			 FROM	config

			 LIMIT	1`);
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.put('/', async (req, res) => {
	const { event_date, motd_title, motd_body, use_twitch, game_ttl, attendee_ttl, show_inactive_games, show_inactive_attendees, update_inactive_games, update_inactive_attendees } = req.body;
	try {
		const result = await pool.query(
			`UPDATE	config

			 SET	event_date                = $1,
                	motd_title                = $2,
                	motd_body                 = $3,
                	use_twitch                = $4,
                	game_ttl                  = $5,
                	attendee_ttl              = $6,
                	show_inactive_games       = $7,
                	show_inactive_attendees   = $8,
                	update_inactive_games     = $9,
                	update_inactive_attendees = $10

             RETURNING	*`,
			[event_date, motd_title, motd_body, use_twitch, game_ttl, attendee_ttl, show_inactive_games, show_inactive_attendees, update_inactive_games, update_inactive_attendees]
		);
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

export default router;