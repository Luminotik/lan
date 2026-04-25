import express from 'express';

import pool from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { sendChannelMessage } from '../../lib/discord.js';
import { createLogger } from '../../lib/logger.js';

const router = express.Router();
const logger = createLogger('admin/notify');

router.use(requireAuth);

router.post('/message', async (req, res) => {
	const { message, mention_role } = req.body;

	if (!message?.trim()) {
		return res.status(400).json({ error: 'Message is required' });
	}

	try {
		const { rows } = await pool.query(
			`SELECT notification_channel_id FROM api_discord LIMIT 1`
		);
		const channelId = rows[0]?.notification_channel_id;

		if (!channelId) {
			return res.status(400).json({ error: 'No notification channel configured' });
		}

		const payload = { content: message.trim() };

		if (mention_role) {
			const { rows: roleRows } = await pool.query(
				`SELECT discord_role_ids FROM attendee_roles WHERE is_base = true LIMIT 1`
			);
			const roleId = roleRows[0]?.discord_role_ids?.[0];
			if (roleId) {
				payload.content = `<@&${roleId}> ${payload.content}`;
				payload.allowed_mentions = { roles: [roleId] };
			}
		}

		await sendChannelMessage(channelId, payload);
		logger.log(`Manual notification sent to channel ${channelId}`);
		res.json({ success: true });
	} catch (err) {
		logger.error('Failed to send manual notification', err);
		res.status(500).json({ error: 'Failed to send notification' });
	}
});

export default router;
