import express from 'express';
import pool from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT	*
			 FROM	attendees
			 ORDER BY	active DESC,
						role ASC,
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

router.post('/', async (req, res) => {
	const { steam_id, first_name, last_name, phone, active, role, level, is_new, sms_notifications } = req.body;
	try {
		const result = await pool.query(
			`INSERT INTO	attendees (
								steam_id,
								first_name,
								last_name,
								phone,
								active,
								role,
								level,
								is_new,
								sms_notifications,
								last_update,
								last_notification
							)
			 VALUES	($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0)
			 RETURNING	*`,
			[steam_id, first_name, last_name, phone, active, role, level, is_new, sms_notifications]
		);
		res.status(201).json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.put('/:id', async (req, res) => {
	const { steam_id, first_name, last_name, phone, active, role, level, is_new, sms_notifications } = req.body;
	try {
		const result = await pool.query(
			`UPDATE	attendees		
			 SET	steam_id			= $1,
					first_name			= $2,
					last_name			= $3,
					phone				= $4,
					active				= $5,
					role				= $6,
					level				= $7,
					is_new				= $8,
					sms_notifications	= $9
			 WHERE	id = $10
			 RETURNING	*`,
			[steam_id, first_name, last_name, phone, active, role, level, is_new, sms_notifications, req.params.id]
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

router.delete('/:id', async (req, res) => {
	try {
		const result = await pool.query(
			`DELETE FROM	attendees			
			 WHERE	id = $1
			 RETURNING	*`,
			[req.params.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Attendee not found' });
		}
		res.json({ message: 'Attendee deleted' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

export default router;