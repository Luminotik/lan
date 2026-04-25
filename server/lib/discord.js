import fetch from 'node-fetch';
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
				url_member_role
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
// - Retries on 429 with exponential backoff (up to 3 attempts).
async function discordRequest(url, options = {}, attempt = 1) {
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
			logger.error(`Rate limited after 3 retries on ${url}, giving up`);
			return res;
		}

		logger.warn(`Rate limited, waiting ${retryAfter}s before retry ${attempt}/3`);
		await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
		return discordRequest(url, options, attempt + 1);
	}

	return res;
}

// Assign a set of Discord roles to a user.
async function modifyRole(discord_id, role_id, method) {
	const config = await getDiscordConfig();
	const url = config.url_member_role
		.replace('{server_id}', config.server_id)
		.replace('{user_id}', discord_id)
		.replace('{role_id}', role_id);

	const res = await discordRequest(url, { method });

	if (!res.ok && res.status !== 204) {
		const body = await res.text();
		logger.error(`Failed to ${method} role ${role_id} on ${discord_id}: ${res.status} ${body}`);
	}
}

// Add a new role to a user
async function addRoles(discord_id, role_ids) {
	if (!discord_id || role_ids.length === 0) return;
	for (const role_id of role_ids) {
		await modifyRole(discord_id, role_id, 'PUT');
	}
}

// Remove an existing role from a user
async function removeRoles(discord_id, role_ids) {
	if (!discord_id || role_ids.length === 0) return;
	for (const role_id of role_ids) {
		await modifyRole(discord_id, role_id, 'DELETE');
	}
}

// Remove all three LAN roles from a user (used when they become inactive or are deleted).
async function removeAllLanRoles(discord_id) {
	if (!discord_id) return;
	const allRoleIds = await getAllLanDiscordRoleIds();
	await removeRoles(discord_id, allRoleIds);
}

// Sync Discord roles for a single attendee based on their current state.
// - Active: assigns roles matching their LAN role per the mappings
// - Inactive or no discord_id: removes all LAN roles
export async function syncAttendeeRoles(attendee) {
	if (!attendee.discord_id) return;

	if (!attendee.active) {
		await removeAllLanRoles(attendee.discord_id);
		return;
	}

	const [targetRoles, allRoleIds] = await Promise.all([
		rolesForLanRole(attendee.role),
		getAllLanDiscordRoleIds()
	]);
	const toRemove = allRoleIds.filter(id => !targetRoles.includes(id));

	await removeRoles(attendee.discord_id, toRemove);
	await addRoles(attendee.discord_id, targetRoles);
}

// Send a message to a Discord channel.
export async function sendChannelMessage(channelId, payload) {
	const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
	const res = await discordRequest(url, {
		method: 'POST',
		body: JSON.stringify(payload)
	});
	if (!res.ok) {
		const body = await res.text();
		logger.error(`Failed to send channel message to ${channelId}: ${res.status} ${body}`);
	}
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