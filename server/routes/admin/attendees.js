import express from 'express';

import pool from '../../db.js';
import { requireAuth } from '../../middleware/auth.js';
import { getPlayerSummaries } from '../../lib/steam.js';
import { syncAttendeeRoles, validateMembership } from '../../lib/discord.js';
import { logger } from '../../lib/logger.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT	id,
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
	const { steam_id, persona_name, avatar, avatar_medium, avatar_full, discord_id, first_name, last_name, role, level, is_new, active } = req.body;
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
			 RETURNING	id,
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
						last_update`,
			[steam_id, persona_name, avatar, avatar_medium, avatar_full, discord_id, first_name, last_name, role, level, is_new, active, Date.now()]
		);
		const attendee = result.rows[0];
		await syncAttendeeRoles(attendee);
		res.status(201).json(attendee);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.put('/:id', async (req, res) => {
	const { steam_id, discord_id, first_name, last_name, role, level, is_new, active } = req.body;
	try {
		const result = await pool.query(
			`UPDATE	attendees
			 SET	steam_id	= $1,
			 		discord_id	= $2,
					first_name	= $3,
					last_name	= $4,
					role		= $5,
					level		= $6,
					is_new		= $7,
					active		= $8
			 WHERE	id			= $9
			 RETURNING	id,
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
						last_update`,
			[steam_id, discord_id, first_name, last_name, role, level, is_new, active, req.params.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Attendee not found' });
		}
		const attendee = result.rows[0];
		await syncAttendeeRoles(attendee);
		res.json(attendee);
	} catch (err) {
		logger.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

router.delete('/:id', async (req, res) => {
	try {
		const result = await pool.query(
			`DELETE FROM	attendees			
			 WHERE	id = $1
			 RETURNING	id,
			 			discord_id`,
			[req.params.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Attendee not found' });
		}
		const deleted = result.rows[0];
		await syncAttendeeRoles({ ...deleted, active: false });
		res.json({ message: 'Attendee deleted' });
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
		logger.error('[admin/attendees/lookup]', err);
		res.status(500).json({ error: 'Lookup failed' });
	}
});

router.post('/validate-discord', async (req, res) => {
	const { discord_id } = req.body;
	if (!discord_id) return res.json({ valid: true });

	const check = await validateMembership(discord_id);
	if (!check.valid) {
		return res.status(400).json({ error: check.error });
	}

	res.json({ valid: true });
});

export default router;