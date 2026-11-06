import pool from '../db.js';
import { createLogger } from './logger.js';
const logger = createLogger('discord');

// Module-level rate limit state — shared across all Discord API calls.
// Tracks when we're allowed to make the next request.
let rateLimitResetAt = 0;

async function getDiscordConfig() {
	const { rows } = await pool.query(
		`SELECT	bot_token,
				server_id,
				url_member,
				url_member_role,
				url_private_message,
				url_channel_message,
				admin_user_id
		 FROM	api_discord
		 LIMIT	1`
	);
	return rows[0];
}

async function getAllLanDiscordRoleIds() {
	const { rows } = await pool.query(
		`SELECT	discord_role_ids
		 FROM	attendee_roles`);
	const all = new Set();
	for (const row of rows) {
		if (row.discord_role_ids) {
			for (const id of row.discord_role_ids) all.add(id);
		}
	}
	return Array.from(all);
}

// Resolve the set of Discord role IDs that should be assigned for a given LAN role.
async function rolesForLanRole(lanRole) {
	const { rows } = await pool.query(
		`SELECT	discord_role_ids
		 FROM	attendee_roles
		 WHERE	role = $1`,
		[lanRole]
	);
	return rows[0]?.discord_role_ids ?? [];
}

// Centralized Discord API request handler.
// - Waits until rateLimitResetAt before making a request if we've hit the limit.
// - Updates rateLimitResetAt based on response headers.
// - Retries on 429 using Discord's Retry-After (up to 3 attempts).
// - quiet: log failures instead of alerting. Used by the alert path itself so
//   a failing alert can't trigger another alert (infinite recursion).
async function discordRequest(url, options = {}, { quiet = false, attempt = 1 } = {}) {
	// Wait if we're preemptively rate-limited
	const now = Date.now();
	if (rateLimitResetAt > now) {
		const waitMs = rateLimitResetAt - now;
		logger.log(`Preemptively waiting ${waitMs}ms for rate limit reset`);
		await new Promise(resolve => setTimeout(resolve, waitMs));
	}

	const config = await getDiscordConfig();
	const res = await fetch(url, {
		...options,
		headers: {
			'Authorization': `Bot ${config.bot_token}`,
			'Content-Type': 'application/json',
			...options.headers
		}
	});

	// Update rate limit state from response headers
	const remaining = parseInt(res.headers.get('x-ratelimit-remaining') ?? '1', 10);
	const resetAfter = parseFloat(res.headers.get('x-ratelimit-reset-after') ?? '0');

	// If we've used up our bucket, note when we can request again
	if (remaining === 0 && resetAfter > 0) {
		rateLimitResetAt = Date.now() + (resetAfter * 1000);
	}

	// Reactive retry on 429
	if (res.status === 429) {
		const retryAfter = parseFloat(res.headers.get('retry-after') ?? '1');

		if (attempt > 3) {
			const msg = `Rate limited after 3 retries on ${url}, giving up`;
			quiet ? logger.error(msg) : logger.alert(msg);
			return res;
		}

		logger.warn(`Rate limited, waiting ${retryAfter}s before retry ${attempt}/3`);
		await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
		return discordRequest(url, options, { quiet, attempt: attempt + 1 });
	}

	return res;
}

// Add (PUT) or remove (DELETE) a single role. Returns an error string on failure, null on success.
async function modifyRole(discord_id, role_id, method) {
	const config = await getDiscordConfig();
	const url = config.url_member_role
		.replace('{server_id}', config.server_id)
		.replace('{user_id}', discord_id)
		.replace('{role_id}', role_id);

	const res = await discordRequest(url, { method });

	if (!res.ok && res.status !== 204) {
		const body = await res.text();
		return `${method} role ${role_id}: ${res.status} ${body}`;
	}
	return null;
}

// Apply a set of role changes, attempting every one even if some fail. Returns failure strings.
async function modifyRoles(discord_id, role_ids, method) {
	const failures = [];
	for (const role_id of role_ids) {
		const failure = await modifyRole(discord_id, role_id, method);
		if (failure) failures.push(failure);
	}
	return failures;
}

// Sync Discord roles for a single attendee based on their current state.
// - Active: assigns roles matching their LAN role per the mappings
// - Inactive: removes all LAN roles
// - No discord_id: nothing to do
// Throws if any role change failed, after attempting all of them.
export async function syncAttendeeRoles(attendee) {
	if (!attendee.discord_id) return;

	const [targetRoles, allRoleIds] = await Promise.all([
		attendee.active ? rolesForLanRole(attendee.role) : Promise.resolve([]),
		getAllLanDiscordRoleIds()
	]);
	const toRemove = allRoleIds.filter(id => !targetRoles.includes(id));

	const failures = [
		...await modifyRoles(attendee.discord_id, toRemove, 'DELETE'),
		...await modifyRoles(attendee.discord_id, targetRoles, 'PUT')
	];

	if (failures.length > 0) {
		throw new Error(`Discord role sync failed for ${attendee.discord_id}: ${failures.join('; ')}`);
	}
}

// Send a message to a Discord channel.
// quiet: throw on failure instead of alerting (used by the alert path itself).
export async function sendChannelMessage(channelId, payload, { quiet = false } = {}) {
	const config = await getDiscordConfig();
	if (!config.url_channel_message) {
		const msg = 'url_channel_message is not configured in api_discord';
		if (quiet) throw new Error(msg);
		logger.alert(msg);
		return;
	}
	const url = config.url_channel_message.replace('{channel_id}', channelId);
	const res = await discordRequest(url, {
		method: 'POST',
		body: JSON.stringify(payload)
	}, { quiet });
	if (!res.ok) {
		const body = await res.text();
		const msg = `Failed to send channel message to ${channelId}: ${res.status} ${body}`;
		if (quiet) throw new Error(msg);
		logger.alert(msg);
	}
}

// Send a DM alert to the configured admin user. Throws on failure; the logger
// catches it and writes it to the log rather than alerting again.
export async function sendAdminAlert(message) {
	const config = await getDiscordConfig();
	if (!config.admin_user_id || !config.url_private_message) return;

	const dmRes = await discordRequest(config.url_private_message, {
		method: 'POST',
		body: JSON.stringify({ recipient_id: config.admin_user_id })
	}, { quiet: true });
	if (!dmRes.ok) {
		throw new Error(`Failed to open DM channel: ${dmRes.status} ${await dmRes.text()}`);
	}

	const dm = await dmRes.json();
	// Discord caps message content at 2000 characters; stack traces can exceed it
	const content = message.length > 1990 ? message.slice(0, 1990) + '…' : message;
	await sendChannelMessage(dm.id, { content }, { quiet: true });
}

// Validate membership of a user in the Discord server.
export async function validateMembership(discord_id) {
	const config = await getDiscordConfig();
	const url = config.url_member
		.replace('{server_id}', config.server_id)
		.replace('{user_id}', discord_id);

	const res = await discordRequest(url);

	if (res.status === 404) {
		return { valid: false, error: 'User not found in server' };
	}

	if (!res.ok) {
		const body = await res.text();
		return { valid: false, error: `Discord API error: ${res.status} ${body}` };
	}

	const member = await res.json();
	return { valid: true, username: member.user.username, nickname: member.nick };
}