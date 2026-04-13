import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/login', async (req, res) => {
	const { password } = req.body;

	if (!password) {
		return res.status(400).json({ error: 'Password required' });
	}

	const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);

	if (!valid) {
		console.log(`[auth] Failed auth attempt`);
		return res.status(401).json({ error: 'Invalid password' });
	}

	const token = jwt.sign(
		{ admin: true },
		process.env.JWT_SECRET,
		{ expiresIn: '8h' }
	);

	res.json({ token });
});

export default router;