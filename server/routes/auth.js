import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

router.post('/login', async (req, res) => {
	const { password } = req.body;

	if (!password) {
		return res.status(400).json({ error: 'Password required' });
	}

	const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

	if (!valid) {
		logger.warn(`[auth] Failed login attempt from ${req.ip}`);
		return res.status(401).json({ error: 'Invalid password' });
	}

	const token = jwt.sign(
		{ admin: true },
		process.env.JWT_SECRET,
		{ expiresIn: '8h' }
	);

	res.cookie('admin_token', token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 8 * 60 * 60 * 1000  // 8 hours
	});
	res.json({ success: true });
});

router.post('/logout', (req, res) => {
	res.clearCookie('admin_token');
	res.json({ success: true });
});

router.get('/session', requireAuth, (req, res) => {
	res.json({ authenticated: true });
});

export default router;