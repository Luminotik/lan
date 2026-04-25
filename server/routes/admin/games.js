import express from 'express';

import pool from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { lookupItadId, getBestDeal } from '../../lib/itad.js';
import { getAppDetails } from '../../lib/steam.js';
import { logger } from '../../lib/logger.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT	id,
					steam_appid,
					itad_id,
					name,
					header_image,
					is_free,
					is_gamepass,
					gamepass_url,
					url,
					price_old,
					price_new,
					priority,
					active,
					last_update
			 FROM	games
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
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.post('/', async (req, res) => {
	const { steam_appid, itad_id, name, header_image, is_free, is_gamepass, gamepass_url, url, price_old, price_new, priority, active } = req.body;
	try {
		const result = await pool.query(
			`INSERT INTO	games (
								steam_appid,
								itad_id,
								name,
								header_image,
								is_free,
								is_gamepass,
								gamepass_url,
								url,
								price_old,
								price_new,
								priority,
								active,
								last_update
							)
			 VALUES	($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
			 RETURNING	id,
						steam_appid,
						itad_id,
						name,
						header_image,
						is_free,
						is_gamepass,
						gamepass_url,
						url,
						price_old,
						price_new,
						priority,
						active,
						last_update`,
			[steam_appid, itad_id, name, header_image, is_free, is_gamepass, gamepass_url, url, price_old, price_new, priority, active]
		);
		const game = result.rows[0];
		res.status(201).json({
			...game,
			price_old: parseFloat(game.price_old),
			price_new: parseFloat(game.price_new)
		});
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.put('/:id', async (req, res) => {
	const { steam_appid, itad_id, name, header_image, is_free, is_gamepass, gamepass_url, url, price_old, price_new, priority, active } = req.body;
	try {
		const result = await pool.query(
			`UPDATE	games 		
			 SET	steam_appid	 = $1,
					itad_id		 = $2,
					name		 = $3,
					header_image = $4,
					is_free		 = $5,
					is_gamepass	 = $6,
					gamepass_url = $7,
					url			 = $8,
					price_old	 = $9,
					price_new	 = $10,
					priority	 = $11,
					active		 = $12
			 WHERE	id			 = $13
			 RETURNING	id,
						steam_appid,
						itad_id,
						name,
						header_image,
						is_free,
						is_gamepass,
						gamepass_url,
						url,
						price_old,
						price_new,
						priority,
						active,
						last_update`,
			[steam_appid, itad_id, name, header_image, is_free, is_gamepass, gamepass_url, url, price_old, price_new, priority, active, req.params.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Game not found' });
		}
		const game = result.rows[0];
		res.json({
			...game,
			price_old: parseFloat(game.price_old),
			price_new: parseFloat(game.price_new)
		});
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.delete('/:id', async (req, res) => {
	try {
		const result = await pool.query(
			`DELETE FROM	games	
			 WHERE	id = $1 	 
			 RETURNING	id`,
			[req.params.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Game not found' });
		}
		res.json({ message: 'Game deleted' });
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.post('/lookup', async (req, res) => {
	const { steam_appid } = req.body;
	if (!steam_appid) {
		return res.status(400).json({ error: 'Steam App ID required' });
	}

	try {
		// Steam lookup by Steam App ID
		const steam = await getAppDetails(steam_appid);

		if (!steam) {
			return res.status(404).json({ error: `Steam details not found for App ID ${steam_appid}` });
		}

		// ITAD ID lookup
		const itadId = await lookupItadId(steam_appid);
		const deal = itadId ? await getBestDeal(itadId) : null;

		res.json({
			steam_appid,
			itad_id: itadId,
			name: steam.name,
			header_image: steam.header_image,
			is_free: steam.is_free,
			url: deal?.url ?? `https://store.steampowered.com/app/${steam_appid}/`,
			price_old: deal?.price_old,
			price_new: deal?.price_new
		});
	} catch (err) {
		logger.error('[admin/games/lookup]', err);
		res.status(500).json({ error: 'Lookup failed' });
	}
});


export default router;