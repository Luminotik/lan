import express from 'express';

import pool from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { getShops, searchItadByName } from '../../lib/itad.js';
import { createLogger } from '../../lib/logger.js';

const router = express.Router();
const logger = createLogger('admin/itad');

router.use(requireAuth);

router.get('/trusted-shops', async (req, res) => {
	try {
		const { rows } = await pool.query(`SELECT trusted_shops FROM api_itad LIMIT 1`);
		res.json({ trusted_shops: rows[0]?.trusted_shops ?? '' });
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.put('/trusted-shops', async (req, res) => {
	const { trusted_shops } = req.body;
	try {
		await pool.query(`UPDATE api_itad SET trusted_shops = $1`, [trusted_shops]);
		res.json({ trusted_shops });
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.get('/search', async (req, res) => {
	const { title } = req.query;
	if (!title?.trim()) {
		return res.status(400).json({ error: 'title is required' });
	}
	try {
		const results = await searchItadByName(title.trim());
		res.json(results);
	} catch (err) {
		logger.error('Failed to search ITAD', err);
		res.status(500).json({ error: 'Failed to search ITAD' });
	}
});

router.get('/shops', async (req, res) => {
	try {
		const shops = await getShops();
		res.json(shops);
	} catch (err) {
		logger.error('Failed to fetch ITAD shops', err);
		res.status(500).json({ error: 'Failed to fetch shops from ITAD' });
	}
});

export default router;
