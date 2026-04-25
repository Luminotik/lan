import { useState, useEffect } from 'react';
import axios from 'axios';

const ConfigEditor = () => {
	const [form, setForm] = useState(null);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [saved, setSaved] = useState(false);

	const [shops, setShops] = useState(null);
	const [shopsLoading, setShopsLoading] = useState(false);
	const [shopsError, setShopsError] = useState(null);
	const [selectedShops, setSelectedShops] = useState(new Set());
	const [shopsSaved, setShopsSaved] = useState(false);
	const [shopsSaving, setShopsSaving] = useState(false);

	const api = axios.create({ withCredentials: true });

	useEffect(() => {
		api.get('/api/admin/config')
			.then(res => setForm(res.data))
			.catch(() => setError('Failed to load config'));
		api.get('/api/admin/itad/trusted-shops')
			.then(res => {
				const ids = res.data.trusted_shops
					? res.data.trusted_shops.split(',').map(s => s.trim()).filter(Boolean)
					: [];
				setSelectedShops(new Set(ids));
			})
			.catch(() => {});
	}, []);

	const loadShops = async () => {
		setShopsLoading(true);
		setShopsError(null);
		try {
			const res = await api.get('/api/admin/itad/shops');
			setShops(res.data);
		} catch {
			setShopsError('Failed to load shops from ITAD');
		} finally {
			setShopsLoading(false);
		}
	};

	const toggleShop = (id) => {
		const key = String(id);
		setSelectedShops(prev => {
			const next = new Set(prev);
			next.has(key) ? next.delete(key) : next.add(key);
			return next;
		});
	};

	const saveShops = async () => {
		setShopsSaving(true);
		try {
			await api.put('/api/admin/itad/trusted-shops', {
				trusted_shops: [...selectedShops].join(',')
			});
			setShopsSaved(true);
			setTimeout(() => setShopsSaved(false), 3000);
		} catch {
			setShopsError('Failed to save trusted shops');
		} finally {
			setShopsSaving(false);
		}
	};

	const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

	const handleSubmit = async () => {
		setLoading(true);
		setError(null);
		setSaved(false);
		try {
			await api.put('/api/admin/config', form);
			setSaved(true);
			setTimeout(() => setSaved(false), 3000);
		} catch (err) {
			setError('Failed to save config');
		} finally {
			setLoading(false);
		}
	};

	if (error) return <div className="admin-error">{error}</div>;
	if (!form) return <div className="admin-loading">Loading...</div>;

	return (
		<div className="admin-section">
			<div className="admin-section-header">
				<h2>Config</h2>
				<div className="admin-actions">
					{saved && <span className="admin-success">Saved!</span>}
					<button
						className="admin-btn admin-btn-primary"
						onClick={handleSubmit}
						disabled={loading}
					>
						{loading ? 'Saving...' : 'Save'}
					</button>
				</div>
			</div>

			<div className="admin-form admin-form-wide">
				<h3>Event</h3>

				<label>Event Date</label>
				<input
					type="datetime-local"
					value={form.event_date ? new Date(new Date(form.event_date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
					onChange={e => set('event_date', new Date(e.target.value).toISOString())}
				/>

				<label>MOTD Title</label>
				<input
					value={form.motd_title || ''}
					onChange={e => set('motd_title', e.target.value)}
					placeholder="Leave blank to hide MOTD"
				/>

				<label>MOTD Body</label>
				<textarea
					value={form.motd_body || ''}
					onChange={e => set('motd_body', e.target.value)}
					placeholder="Leave blank to hide MOTD"
					rows={3}
				/>

				<div className="admin-form-checks">
					<label>
						<input
							type="checkbox"
							checked={form.use_twitch}
							onChange={e => set('use_twitch', e.target.checked)}
						/> Use Twitch
					</label>
				</div>

				<h3>Refresh Settings</h3>

				<label>Game TTL (hours)</label>
				<input
					type="number"
					value={form.game_ttl / (1000 * 60 * 60)}
					onChange={e => set('game_ttl', parseFloat(e.target.value) * 1000 * 60 * 60)}
				/>

				<label>Attendee TTL (hours)</label>
				<input
					type="number"
					value={form.attendee_ttl / (1000 * 60 * 60)}
					onChange={e => set('attendee_ttl', parseFloat(e.target.value) * 1000 * 60 * 60)}
				/>

				<div className="admin-form-checks">
					<label>
						<input
							type="checkbox"
							checked={form.show_inactive_games}
							onChange={e => set('show_inactive_games', e.target.checked)}
						/> Show Inactive Games
					</label>
					<label>
						<input
							type="checkbox"
							checked={form.show_inactive_attendees}
							onChange={e => set('show_inactive_attendees', e.target.checked)}
						/> Show Inactive Attendees
					</label>
				</div>
				<div className="admin-form-checks">
					<label>
						<input
							type="checkbox"
							checked={form.update_inactive_games}
							onChange={e => set('update_inactive_games', e.target.checked)}
						/> Update Inactive Games
					</label>
					<label>
						<input
							type="checkbox"
							checked={form.update_inactive_attendees}
							onChange={e => set('update_inactive_attendees', e.target.checked)}
						/> Update Inactive Attendees
					</label>
				</div>

				<h3>Trusted Shops</h3>

				<div className="admin-form-inline">
					<button
						className="admin-btn admin-btn-secondary"
						onClick={loadShops}
						disabled={shopsLoading}
					>
						{shopsLoading ? 'Loading...' : 'Load Shops'}
					</button>
					{shopsSaved && <span className="admin-success">Saved!</span>}
					{shopsError && <span className="admin-error">{shopsError}</span>}
				</div>

				{shops && (
					<>
						<table className="admin-table">
							<thead>
								<tr>
									<th>Trusted</th>
									<th>Shop</th>
								</tr>
							</thead>
							<tbody>
								{[...shops].sort((a, b) => a.title.localeCompare(b.title)).map(shop => (
									<tr key={shop.id} onClick={() => toggleShop(shop.id)} style={{ cursor: 'pointer' }}>
										<td>
											<input
												type="checkbox"
												checked={selectedShops.has(String(shop.id))}
												onChange={() => toggleShop(shop.id)}
												onClick={e => e.stopPropagation()}
											/>
										</td>
										<td>{shop.title}</td>
									</tr>
								))}
							</tbody>
						</table>
						<div>
							<button
								className="admin-btn admin-btn-primary"
								onClick={saveShops}
								disabled={shopsSaving}
							>
								{shopsSaving ? 'Saving...' : 'Save Shops'}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default ConfigEditor;