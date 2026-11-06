import pool from '../db.js';
import { sendChannelMessage } from '../lib/discord.js';
import { createLogger } from '../lib/logger.js';
const logger = createLogger('notify');

export async function notifyPriceDrops(drops) {
	if (drops.length === 0) return;

	const { rows } = await pool.query(
		`SELECT notification_channel_id FROM api_discord LIMIT 1`
	);
	const channelId = rows[0]?.notification_channel_id;

	if (!channelId) {
		logger.warn('No notification_channel_id configured, skipping price drop notification.');
		return;
	}

	const discordIds = new Set();
	let needRoleFallback = false;

	for (const drop of drops) {
		if (drop.steam_appid) {
			const { rows: nonOwners } = await pool.query(
				`SELECT	a.discord_id
				 FROM	attendees a
				 WHERE  a.active     = true
				 AND    a.discord_id IS NOT NULL
				 AND	a.discord_id != ''
				 AND    EXISTS (
				 	SELECT	1
					FROM	attendee_owned_games og
					WHERE	og.steam_id = a.steam_id )
				 AND    NOT EXISTS (
				    SELECT	1
					FROM	attendee_owned_games og
				    WHERE	og.steam_id    = a.steam_id
					AND		og.steam_appid = $1 )`,
				[drop.steam_appid]
			);
			nonOwners.forEach(r => discordIds.add(r.discord_id));
		} else {
			needRoleFallback = true;
		}
	}

	const lines = drops.map(d =>
		`**${d.name}** - $${d.price_new.toFixed(2)} *(was $${d.price_old.toFixed(2)})*`
	);

	logger.log(`Sending price drop notification for ${drops.length} game(s) to channel ${channelId}.`);

	const payload = {
		embeds: [{
			title: 'Price update:',
			description: lines.join('\n'),
			color: 0x57F287
		}]
	};

	// Mention non-owners for drops we can check ownership for, and the base
	// attendee role for drops we can't (no Steam appid). A mixed batch needs both,
	// otherwise the appid-less games would notify nobody.
	const mentions = [];
	const allowed_mentions = { users: [], roles: [] };

	if (discordIds.size > 0) {
		const ids = [...discordIds];
		mentions.push(...ids.map(id => `<@${id}>`));
		allowed_mentions.users = ids;
	}

	if (needRoleFallback) {
		const { rows: roleRows } = await pool.query(
			`SELECT	discord_role_ids
			 FROM	attendee_roles
			 WHERE	is_base = true
			 LIMIT	1`
		);
		const roleId = roleRows[0]?.discord_role_ids?.[0];
		if (roleId) {
			mentions.push(`<@&${roleId}>`);
			allowed_mentions.roles = [roleId];
		} else {
			logger.alert('Price drop for a game without a Steam appid, but no base attendee role is configured to mention');
		}
	}

	if (mentions.length > 0) {
		payload.content = mentions.join(' ');
		payload.allowed_mentions = allowed_mentions;
	}

	await sendChannelMessage(channelId, payload);
}
