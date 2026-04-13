import { useState, useEffect } from 'react';
import axios from 'axios';

const emptyGame = {
	steam_appid: '',
	itad_id: '',
	name: '',
	header_image: '',
	is_free: false,
	is_gamepass: false,
	gamepass_url: '',
	url: '',
	price_old: '',
	price_new: '',
	priority: 999,
	active: true
};

const GameForm = ({ game, onSave, onCancel, api }) => {
	const [form, setForm] = useState(game);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);

	const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

	const handleSubmit = async () => {
		setLoading(true);
		setError(null);
		try {
			if (form.id) {
				await api.put(`/api/admin/games/${form.id}`, form);
			} else {
				await api.post('/api/admin/games', form);
			}
			onSave();
		} catch (err) {
			setError('Failed to save game');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="admin-modal-overlay">
			<div className="admin-modal">
				<h2>{form.id ? 'Edit Game' : 'Add Game'}</h2>
				<div className="admin-form">
					<label>Name</label>
					<input value={form.name} onChange={e => set('name', e.target.value)} />

					<label>Steam App ID</label>
					<input value={form.steam_appid} onChange={e => set('steam_appid', e.target.value)} />

					<label>ITAD ID</label>
					<input value={form.itad_id} onChange={e => set('itad_id', e.target.value)} />

					<label>Header Image URL</label>
					<input value={form.header_image} onChange={e => set('header_image', e.target.value)} />

					<label>Store URL</label>
					<input value={form.url} onChange={e => set('url', e.target.value)} />

					<label>Price (Regular)</label>
					<input type="number" value={form.price_old} onChange={e => set('price_old', e.target.value)} />

					<label>Price (Current)</label>
					<input type="number" value={form.price_new} onChange={e => set('price_new', e.target.value)} />

					<label>Priority</label>
					<input type="number" value={form.priority} onChange={e => set('priority', e.target.value)} />

					<div className="admin-form-checks">
						<label><input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} /> Free</label>
						<label><input type="checkbox" checked={form.is_gamepass} onChange={e => set('is_gamepass', e.target.checked)} /> Game Pass</label>
						<label><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Active</label>
					</div>

					{form.is_gamepass && (
						<>
							<label>Game Pass URL</label>
							<input value={form.gamepass_url} onChange={e => set('gamepass_url', e.target.value)} />
						</>
					)}

					{error && <div className="admin-error">{error}</div>}

					<div className="admin-form-actions">
						<button className="admin-btn admin-btn-secondary" onClick={onCancel}>Cancel</button>
						<button className="admin-btn admin-btn-primary" onClick={handleSubmit} disabled={loading}>
							{loading ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

const GamesList = ({ token }) => {
	const [games, setGames] = useState(null);
	const [error, setError] = useState(null);
	const [editing, setEditing] = useState(null);

	const api = axios.create({
		headers: { Authorization: `Bearer ${token}` }
	});

	useEffect(() => {
		fetchGames();
	}, []);

	const fetchGames = async () => {
		try {
			const res = await api.get('/api/admin/games');
			setGames(res.data);
		} catch (err) {
			setError('Failed to load games');
		}
	};

	const toggleActive = async (game) => {
		// Optimistically update UI immediately
		setGames(prev => prev.map(g =>
			g.id === game.id ? { ...g, active: !g.active } : g
		));

		try {
			await api.put(`/api/admin/games/${game.id}`, {
				...game,
				active: !game.active
			});
		} catch (err) {
			// Revert on failure
			setGames(prev => prev.map(g =>
				g.id === game.id ? { ...g, active: game.active } : g
			));
			setError('Failed to update game');
		}
	};

	const deleteGame = async (id) => {
		if (!confirm('Are you sure you want to delete this game?')) return;
		try {
			await api.delete(`/api/admin/games/${id}`);
			fetchGames();
		} catch (err) {
			setError('Failed to delete game');
		}
	};

	const handleSave = () => {
		setEditing(null);
		fetchGames();
	};

	if (error) return <div className="admin-error">{error}</div>;
	if (games === null) return <div className="admin-loading">Loading...</div>;

	return (
		<div className="admin-section">
			{editing && (
				<GameForm
					game={editing}
					onSave={handleSave}
					onCancel={() => setEditing(null)}
					api={api}
				/>
			)}
			<div className="admin-section-header">
				<h2>Games</h2>
				<button className="admin-btn admin-btn-primary" onClick={() => setEditing(emptyGame)}>Add Game</button>
			</div>
			<table className="admin-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Price</th>
						<th>Active</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{games.map(game => (
						<tr key={game.id} className={!game.active ? 'admin-row-inactive' : ''}>
							<td>
								<div className="admin-game-name">
									<img src={game.header_image} alt={game.name} className="admin-game-thumb" />
									<span>{game.name}</span>
								</div>
							</td>
							<td>
								{game.is_free ? 'Free' :
									game.is_gamepass ? 'Game Pass' :
										`$${game.price_new.toFixed(2)}`}
							</td>
							<td>
								<button
									className={`admin-toggle ${game.active ? 'active' : ''}`}
									onClick={() => toggleActive(game)}
								>
									{game.active ? 'Active' : 'Inactive'}
								</button>
							</td>
							<td>
								<div className="admin-actions">
									<button className="admin-btn admin-btn-secondary" onClick={() => setEditing(game)}>Edit</button>
									<button className="admin-btn admin-btn-danger" onClick={() => deleteGame(game.id)}>Delete</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default GamesList;