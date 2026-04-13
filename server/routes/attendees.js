import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT id, 
                    steam_id, 
                    persona_name,
					avatar,
					avatar_medium,
					avatar_full,
					first_name,
					last_name,
					role,
					level,
					is_new

             FROM   attendees 

             WHERE  active = true

             ORDER BY   role ASC, 
                        level DESC,
						is_new ASC, 
                        first_name ASC`
		);
		res.json(result.rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.get('/:id', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT id, 
                    steam_id, 
                    persona_name,
					avatar,
					avatar_medium,
					avatar_full,
					first_name,
					last_name,
					role,
					level,
					is_new

             FROM   attendees 

             WHERE  id     = $1
			 AND	active = true`,
			[req.params.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Attendee not found' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

export default router;