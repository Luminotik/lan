import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
	try {
		const configResult = await pool.query(
			`SELECT	show_inactive_games
			 FROM	config
			 LIMIT	1`);
		const { show_inactive_games } = configResult.rows[0];

		const result = await pool.query(
			`SELECT	id,
					steam_appid,
					name,
					header_image,
					is_free,
					is_gamepass,
					gamepass_url,
					url,
					price_old,
					price_new
			 FROM	games
			 ${show_inactive_games ? '' : 'WHERE	active = true'}
			 ORDER BY	priority ASC,
						price_new ASC,
						name ASC`
		);
		res.json(result.rows.map(game => ({
			...game,
			price_old: parseFloat(game.price_old),
			price_new: parseFloat(game.price_new)
		})));
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.get('/:id', async (req, res) => {
	try {
		const configResult = await pool.query(
			`SELECT	show_inactive_games
			 FROM	config
			 LIMIT	1`);
		const { show_inactive_games } = configResult.rows[0];

		const result = await pool.query(
			`SELECT	id,
					steam_appid,
					name,
					header_image,
					is_free,
					is_gamepass,
					gamepass_url,
					url,
					price_old,
					price_new
			 FROM	games
			 WHERE	id = $1
			 ${show_inactive_games ? '' : 'AND	active = true'}`,
			[req.params.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Game not found' });
		}
		res.json(result.rows[0]);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

export default router;