import express from 'express';

import pool from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { getPlayerSummaries } from '../../lib/steam.js';
import { syncAttendeeRoles, validateMembership } from '../../lib/discord.js';
import { createLogger } from '../../lib/logger.js';
const logger = createLogger('admin/attendees');

const router = express.Router();

router.use(requireAuth);

// Sync Discord roles without letting a Discord failure turn a committed save
// into an error response. Alerts the admin and returns a warning for the UI.
async function trySyncRoles(attendee) {
	try {
		await syncAttendeeRoles(attendee);
		return null;
	} catch (err) {
		logger.alert(`Saved attendee ${attendee.steam_id}, but Discord role sync failed:`, err.message);
		return 'Saved, but Discord roles could not be updated. Check the server log.';
	}
}

const normalizeDiscordId = (id) => (typeof id === 'string' && id.trim() !== '' ? id.trim() : null);

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT	steam_id,
					persona_name,
					avatar,
					avatar_medium,
					avatar_full,
					discord_id,
					first_name,
					last_name,
					role,
					level,
					is_new,
					active,
					last_update
			 FROM	attendees
			 ORDER BY	active DESC,
						role ASC,
						level DESC,
						is_new ASC,
						first_name ASC`
		);
		res.json(result.rows);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.post('/', async (req, res) => {
	const { steam_id, persona_name, avatar, avatar_medium, avatar_full, first_name, last_name, role, level, is_new, active } = req.body;
	const discord_id = normalizeDiscordId(req.body.discord_id);
	try {
		const result = await pool.query(
			`INSERT INTO	attendees (
								steam_id,
								persona_name,
								avatar,
								avatar_medium,
								avatar_full,
								discord_id,
								first_name,
								last_name,
								role,
								level,
								is_new,
								active,
								last_update
							)
			 VALUES	($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			 RETURNING	steam_id,
						persona_name,
						avatar,
						avatar_medium,
						avatar_full,
						discord_id,
						first_name,
						last_name,
						role,
						level,
						is_new,
						active,
						last_update`,
			// last_update = 0 so the next refresh tick syncs this attendee's owned games immediately
			[steam_id, persona_name, avatar, avatar_medium, avatar_full, discord_id, first_name, last_name, role, level, is_new, active, 0]
		);
		const attendee = result.rows[0];
		const discord_warning = await trySyncRoles(attendee);
		res.status(201).json({ ...attendee, discord_warning });
	} catch (err) {
		if (err.code === '23505') {
			return res.status(409).json({ error: 'An attendee with this Steam ID already exists' });
		}
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.put('/:steam_id', async (req, res) => {
	const { first_name, last_name, role, level, is_new, active } = req.body;
	const discord_id = normalizeDiscordId(req.body.discord_id);
	try {
		// Capture the previous Discord ID so roles can be removed from it if it changes
		const { rows: previous } = await pool.query(
			`SELECT	discord_id
			 FROM	attendees
			 WHERE	steam_id = $1`,
			[req.params.steam_id]
		);
		if (previous.length === 0) {
			return res.status(404).json({ error: 'Attendee not found' });
		}
		const previousDiscordId = previous[0].discord_id;

		// steam_id is the attendee's identity and is intentionally not updatable
		const result = await pool.query(
			`UPDATE	attendees
			 SET	discord_id	= $1,
					first_name	= $2,
					last_name	= $3,
					role		= $4,
					level		= $5,
					is_new		= $6,
					active		= $7
			 WHERE	steam_id	= $8
			 RETURNING	steam_id,
						persona_name,
						avatar,
						avatar_medium,
						avatar_full,
						discord_id,
						first_name,
						last_name,
						role,
						level,
						is_new,
						active,
						last_update`,
			[discord_id, first_name, last_name, role, level, is_new, active, req.params.steam_id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Attendee not found' });
		}
		const attendee = result.rows[0];

		let discord_warning = null;
		if (previousDiscordId && previousDiscordId !== attendee.discord_id) {
			discord_warning = await trySyncRoles({ ...attendee, discord_id: previousDiscordId, active: false });
		}
		discord_warning = (await trySyncRoles(attendee)) ?? discord_warning;
		res.json({ ...attendee, discord_warning });
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.delete('/:steam_id', async (req, res) => {
	try {
		const result = await pool.query(
			`DELETE FROM	attendees
			 WHERE	steam_id = $1
			 RETURNING	steam_id,
			 			discord_id`,
			[req.params.steam_id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Attendee not found' });
		}
		const deleted = result.rows[0];
		const discord_warning = await trySyncRoles({ ...deleted, active: false });
		res.json({ message: 'Attendee deleted', discord_warning });
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.post('/lookup', async (req, res) => {
	const { steam_id, discord_id } = req.body;
	if (!steam_id) {
		return res.status(400).json({ error: 'Steam ID required' });
	}

	try {
		// Validate Discord membership only if provided
		if (discord_id) {
			const discordCheck = await validateMembership(discord_id);
			if (!discordCheck.valid) {
				return res.status(400).json({ error: `Discord: ${discordCheck.error}` });
			}
		}

		// Validate Steam profile
		const players = await getPlayerSummaries([steam_id]);
		if (players.length === 0) {
			return res.status(404).json({ error: 'Steam profile not found' });
		}

		const player = players[0];
		res.json({
			steam_id: player.steamid,
			persona_name: player.personaname,
			avatar: player.avatar,
			avatar_medium: player.avatarmedium,
			avatar_full: player.avatarfull,
			discord_id: discord_id || null
		});
	} catch (err) {
		logger.error('lookup', err);
		res.status(500).json({ error: 'Lookup failed' });
	}
});

router.post('/validate-discord', async (req, res) => {
	const { discord_id } = req.body;
	if (!discord_id) return res.json({ valid: true });

	try {
		const check = await validateMembership(discord_id);
		if (!check.valid) {
			return res.status(400).json({ error: check.error });
		}
		res.json({ valid: true });
	} catch (err) {
		logger.error('validate-discord', err);
		res.status(500).json({ error: 'Discord validation failed' });
	}
});

export default router;
