import fetch from 'node-fetch';

import pool from '../db.js';

async function getItadConfig() {
	const { rows } = await pool.query(
		`SELECT	api_key,
				url_lookup_game,
				url_get_current_prices,
				url_get_shops,
				country,
				trusted_shops
		 FROM	api_itad
		 LIMIT	1`
	);
	return rows[0];
}

// Get all shops available in ITAD. Returns an array of { id, title } objects.
export async function getShops() {
	const itad = await getItadConfig();
	const url = itad.url_get_shops.replace('{key}', itad.api_key);
	const res = await fetch(url);
	return await res.json();
}

// Find the ITAD ID for a given Steam App ID. Returns the ID or null if not found.
export async function lookupItadId(steam_appid) {
	const itad = await getItadConfig();

	const url = itad.url_lookup_game
		.replace('{key}', itad.api_key)
		.replace('{appid}', steam_appid);

	const res = await fetch(url);
	const json = await res.json();

	return json.found ? json.game.id : null;
}

// Get the best current deal for a given ITAD ID across trusted shops, preferring
// Steam on ties. Returns { url, price_old, price_new } or null if no deals exist.
export async function getBestDeal(itad_id) {
	const itad = await getItadConfig();

	const url = itad.url_get_current_prices
		.replace('{key}', itad.api_key)
		.replace('{country}', itad.country)
		.replace('{shops}', itad.trusted_shops.replace(/\s/g, ''));

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify([itad_id])
	});
	const json = await res.json();
	const deals = json[0]?.deals ?? [];

	if (deals.length === 0) return null;

	let best = null;
	const steamDeal = deals.find(d => d.shop.name.toLowerCase() === 'steam');

	for (const deal of deals) {
		if (!best || deal.price.amount < best.price.amount) {
			best = deal;
		}
	}

	if (steamDeal && steamDeal.price.amount <= best.price.amount) {
		best = steamDeal;
	}

	return {
		url: best.url,
		price_old: best.regular.amount,
		price_new: best.price.amount
	};
}