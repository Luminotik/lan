import pool from '../db.js';
import fetch from 'node-fetch';
import { notifyPriceDrops } from './notify.js';

async function getApiConfig() {
	const [steamResult, itadResult, configResult] = await Promise.all([
		pool.query(
			`SELECT	api_key,
					url_get_app_details,
					url_get_player_summaries
			 FROM	api_steam
			 LIMIT	1`),
		pool.query(
			`SELECT	api_key,
					url_get_current_prices,
					country,
					trusted_shops
			 FROM	api_itad
			 LIMIT	1`),
		pool.query(
			`SELECT	game_ttl,
					attendee_ttl,
					update_inactive_games,
					update_inactive_attendees
			 FROM	config
			 LIMIT	1`)
	]);
	return {
		steam: steamResult.rows[0],
		itad: itadResult.rows[0],
		flags: {
			update_inactive_games: configResult.rows[0].update_inactive_games,
			update_inactive_attendees: configResult.rows[0].update_inactive_attendees
		},
		ttl: {
			game_ttl: configResult.rows[0].game_ttl,
			attendee_ttl: configResult.rows[0].attendee_ttl
		}
	};
}

export async function refreshGames() {
	console.log('[refresh] Checking games for stale data...');
	const { steam, itad, flags, ttl } = await getApiConfig();
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
		console.log('[refresh] All games are up to date.');
		return;
	}

	console.log(`[refresh] Refreshing ${games.length} stale games...`);

	for (const game of games) {
		try {
			// Steam refresh
			let name = game.name, headerImage = game.header_image, isFree = game.is_free;

			if (game.steam_appid) {
				const steamUrl = steam.url_get_app_details.replace('{appids}', game.steam_appid);
				const steamRes = await fetch(steamUrl);
				const steamJson = await steamRes.json();
				const steamData = steamJson[game.steam_appid]?.data;

				if (steamData) {
					name = steamData.name;
					headerImage = steamData.header_image;
					isFree = steamData.is_free;
				}
			}

			// ITAD refresh
			let url = game.url, priceOld = parseFloat(game.price_old), priceNew = parseFloat(game.price_new);

			if (game.itad_id) {
				const itadUrl = itad.url_get_current_prices
					.replace('{key}', itad.api_key)
					.replace('{country}', itad.country)
					.replace('{shops}', itad.trusted_shops.replace(/\s/g, ''));

				const itadRes = await fetch(itadUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify([game.itad_id])
				});
				const itadJson = await itadRes.json();
				const deals = itadJson[0]?.deals ?? [];

				if (deals.length > 0) {
					// Find lowest price across all shops, preferring Steam if it matches
					let best = null;
					let steam_deal = deals.find(d => d.shop.name.toLowerCase() === 'steam');

					for (const deal of deals) {
						if (!best || deal.price.amount < best.price.amount) {
							best = deal;
						}
					}

					// Prefer Steam if it matches or beats the best price
					if (steam_deal && steam_deal.price.amount <= best.price.amount) {
						best = steam_deal;
					}

					url = best.url;
					priceOld = best.regular.amount;
					priceNew = best.price.amount;

					if (priceNew === 0) isFree = true;
				}
			}

			// Take note of price drops as we'll want to notify subscribed attendees
			const existingPriceNew = parseFloat(game.price_new);

			if (priceNew < existingPriceNew) {
				drops.push({
					name: name,
					price_new: priceNew,
					price_old: existingPriceNew
				});
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

			console.log(`[refresh] Updated game: ${game.steam_appid}`);
		} catch (err) {
			console.error(`[refresh] Failed to refresh game ${game.steam_appid}:`, err.message);
		}
	}

	await notifyPriceDrops(drops);
}

export async function refreshAttendees() {
	console.log('[refresh] Checking attendees for stale data...');
	const { steam, flags, ttl } = await getApiConfig();
	const now = Date.now();

	const { rows: attendees } = await pool.query(
		`SELECT	id,
				steam_id
		 FROM	attendees
		 WHERE	last_update	< $1
		 AND	steam_id	IS NOT NULL
		 AND	steam_id	!= ''
		 ${flags.update_inactive_attendees ? '' : 'AND	active = true'}`,
		[now - ttl.attendee_ttl]
	);

	if (attendees.length === 0) {
		console.log('[refresh] All attendees are up to date.');
		return;
	}

	console.log(`[refresh] Refreshing ${attendees.length} stale attendees...`);

	// Batch all Steam IDs into one request
	const steamIds = attendees.map(a => a.steam_id).join(',');
	const steamUrl = steam.url_get_player_summaries
		.replace('{key}', steam.api_key)
		.replace('{steamids}', steamIds);

	const steamRes = await fetch(steamUrl);
	const steamJson = await steamRes.json();
	const players = steamJson.response?.players ?? [];

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
			console.log(`[refresh] Updated attendee: ${player.personaname}`);
		} catch (err) {
			console.error(`[refresh] Failed to update attendee ${player.steamid}:`, err.message);
		}
	}
}