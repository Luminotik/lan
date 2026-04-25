import pool from '../db.js';
import { notifyPriceDrops } from './notify.js';
import { lookupItadId, getBestDeal } from '../lib/itad.js';
import { getAppDetails, getPlayerSummaries, getOwnedGames } from '../lib/steam.js';
import { createLogger } from '../lib/logger.js';
const logger = createLogger('refresh');

async function getConfig() {
	const { rows } = await pool.query(
		`SELECT	game_ttl,
				attendee_ttl,
				update_inactive_games,
				update_inactive_attendees
		 FROM	config
		 LIMIT	1`
	);
	return {
		flags: {
			update_inactive_games: rows[0].update_inactive_games,
			update_inactive_attendees: rows[0].update_inactive_attendees
		},
		ttl: {
			game_ttl: rows[0].game_ttl,
			attendee_ttl: rows[0].attendee_ttl
		}
	};
}

async function syncOwnedGames(steamId) {
	const appids = await getOwnedGames(steamId);
	if (appids.length === 0) return;
	await pool.query(
		`DELETE
		 FROM	attendee_owned_games
		 WHERE	steam_id = $1`,
		[steamId]);
	const placeholders = appids.map((_, i) => `($1, $${i + 2})`).join(', ');
	await pool.query(
		`INSERT
		 INTO	attendee_owned_games (steam_id, steam_appid)
		 VALUES	${placeholders}`,
		[steamId, ...appids]
	);
}

export async function refreshGames() {
	logger.log('Checking games for stale data...');
	const { flags, ttl } = await getConfig();
	const now = Date.now();
	const drops = [];

	const { rows: games } = await pool.query(
		`SELECT	id,
				steam_appid,
				itad_id,
				name,
				header_image,
				is_free,
				url,
				price_old,
				price_new
		 FROM	games
		 WHERE	last_update < $1
		 ${flags.update_inactive_games ? '' : 'AND	active = true'}`,
		[now - ttl.game_ttl]
	);

	if (games.length === 0) {
		logger.log('All games are up to date.');
		return;
	}

	logger.log(`Refreshing ${games.length} stale games...`);

	for (const game of games) {
		try {
			// Steam refresh
			let name = game.name, headerImage = game.header_image, isFree = game.is_free;

			if (game.steam_appid) {
				const steam = await getAppDetails(game.steam_appid);

				if (steam) {
					name = steam.name;
					headerImage = steam.header_image;
					isFree = steam.is_free;
				}
			}

			// ITAD refresh
			let url = game.url, priceOld = parseFloat(game.price_old), priceNew = parseFloat(game.price_new);

			if (game.itad_id) {
				const deal = await getBestDeal(game.itad_id);

				if (deal) {
					url = deal.url;
					priceOld = deal.price_old;
					priceNew = deal.price_new;
					if (priceNew === 0) isFree = true;
				}
			}

			const existingPriceNew = parseFloat(game.price_new);
			if (priceNew < existingPriceNew) {
				drops.push({ name, price_new: priceNew, price_old: existingPriceNew, steam_appid: game.steam_appid });
			}

			await pool.query(
				`UPDATE	games
				 SET	last_update	 = $1,
						name		 = $2,
						header_image = $3,
						is_free		 = $4,
						price_new	 = $5,
						price_old	 = $6,
						url			 = $7
				 WHERE	id			 = $8`,
				[now, name, headerImage, isFree, priceNew, priceOld, url, game.id]
			);

			logger.log(`Updated game: ${game.steam_appid}`);
		} catch (err) {
			logger.error(`Failed to refresh game ${game.steam_appid}:`, err.message);
		}
	}

	await notifyPriceDrops(drops);
}

export async function refreshAttendees() {
	logger.log('Checking attendees for stale data...');
	const { flags, ttl } = await getConfig();
	const now = Date.now();

	const { rows: attendees } = await pool.query(
		`SELECT	steam_id
		 FROM	attendees
		 WHERE	last_update	< $1
		 AND	steam_id	IS NOT NULL
		 AND	steam_id	!= ''
		 ${flags.update_inactive_attendees ? '' : 'AND	active = true'}`,
		[now - ttl.attendee_ttl]
	);

	if (attendees.length === 0) {
		logger.log('All attendees are up to date.');
		return;
	}

	logger.log(`Refreshing ${attendees.length} stale attendees...`);

	const players = await getPlayerSummaries(attendees.map(a => a.steam_id));

	for (const player of players) {
		try {
			await pool.query(
				`UPDATE	attendees
				 SET	last_update		= $1,
						persona_name	= $2,
						avatar			= $3,
						avatar_medium	= $4,
						avatar_full		= $5
				 WHERE	steam_id		= $6`,
				[now, player.personaname, player.avatar, player.avatarmedium, player.avatarfull, player.steamid]
			);
			await syncOwnedGames(player.steamid);
			logger.log(`Updated attendee: ${player.personaname}`);
		} catch (err) {
			logger.error(`Failed to update attendee ${player.steamid}:`, err.message);
		}
	}
}