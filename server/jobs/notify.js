import pool from '../db.js';
import { sendChannelMessage } from '../lib/discord.js';
import { logger } from '../lib/logger.js';

export async function notifyPriceDrops(drops) {
	if (drops.length === 0) return;

	const { rows } = await pool.query(
		`SELECT notification_channel_id FROM api_discord LIMIT 1`
	);
	const channelId = rows[0]?.notification_channel_id;

	const { rows: roleRows } = await pool.query(
		`SELECT discord_role_ids FROM attendee_roles WHERE is_base = true LIMIT 1`
	);
	const roleId = roleRows[0]?.discord_role_ids?.[0];

	if (!channelId) {
		logger.warn('[notify] No notification_channel_id configured, skipping price drop notification.');
		return;
	}

	const lines = drops.map(d =>
		`**${d.name}** — $${d.price_new.toFixed(2)} *(was $${d.price_old.toFixed(2)})*`
	);

	logger.log(`[notify] Sending price drop notification for ${drops.length} game(s) to channel ${channelId}.`);

	const payload = {
		embeds: [{
			title: 'Price Drops',
			description: lines.join('\n'),
			color: 0x57F287
		}]
	};

	if (roleId) {
		payload.content = `<@&${roleId}>`;
		payload.allowed_mentions = { roles: [roleId] };
	}

	await sendChannelMessage(channelId, payload);
}
