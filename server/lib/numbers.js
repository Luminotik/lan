// Normalize a value to a finite number, or null.
// Treats '', null, undefined, NaN (including Postgres numeric 'NaN') and
// non-numeric strings as "no value" so they never reach the database or UI.
export function toNumberOrNull(value) {
	if (value === null || value === undefined || value === '') return null;
	const n = Number(value);
	return Number.isFinite(n) ? n : null;
}

// Same as toNumberOrNull, but only accepts integers.
export function toIntOrNull(value) {
	const n = toNumberOrNull(value);
	return Number.isInteger(n) ? n : null;
}

// Convert a games row's NUMERIC price columns (returned by pg as strings) to numbers or null.
export function withPrices(game) {
	return {
		...game,
		price_old: toNumberOrNull(game.price_old),
		price_new: toNumberOrNull(game.price_new)
	};
}
