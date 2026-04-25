import { useState, useEffect } from 'react';
import axios from 'axios';

import PaginatedList from './PaginatedList';

const emptyAttendee = {
	steam_id: '',
	first_name: '',
	last_name: '',
	active: true,
	role: 3,
	level: 1,
	is_new: false
};

const AttendeeForm = ({ attendee, onSave, onCancel, api }) => {
	const [form, setForm] = useState(attendee);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);
	const [validated, setValidated] = useState(!!attendee.steam_id);
	const [discordValidated, setDiscordValidated] = useState(!!attendee.discord_id);
	const [steamIdInput, setSteamIdInput] = useState(attendee.steam_id || '');
	const [validating, setValidating] = useState(false);

	const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

	const handleValidate = async () => {
		if (!steamIdInput) {
			setError('Steam ID or profile URL is required');
			return;
		}

		// Extract Steam ID from profile URL if one was pasted
		let steamId = steamIdInput.trim();
		if (!/^\d+$/.test(steamId)) {
			const match = steamId.match(/\/profiles\/(\d+)/);
			if (!match) {
				setError('Unable to parse Steam ID from input');
				return;
			}
			steamId = match[1];
		}

		setValidating(true);
		setError(null);
		try {
			const res = await api.post('/api/admin/attendees/lookup', { steam_id: steamId });
			setForm({
				...form,
				...res.data,
				active: form.active ?? true,
				is_new: form.is_new ?? true,
				role: form.role ?? 3,
				level: form.level ?? 1,
			});
			setValidated(true);
		} catch (err) {
			setError(err.response?.data?.error || 'Validation failed');
		} finally {
			setValidating(false);
		}
	};

	const handleDiscordValidate = async () => {
		try {
			await api.post('/api/admin/attendees/validate-discord', {
				discord_id: form.discord_id
			});
			setDiscordValidated(true);
			setError(null);
		} catch (err) {
			setError(err.response?.data?.error || 'Discord validation failed');
		}
	};

	const handleSubmit = async () => {
		if (form.discord_id && !discordValidated) {
			setError('Please re-validate after changing the Discord ID');
			return;
		}

		setLoading(true);
		setError(null);
		try {
			if (form.steam_id) {
				await api.put(`/api/admin/attendees/${form.steam_id}`, form);
			} else {
				await api.post('/api/admin/attendees', form);
			}
			onSave();
		} catch (err) {
			setError('Failed to save attendee');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="admin-modal-overlay">
			<div className="admin-modal">
				<h2>{form.steam_id ? 'Edit Attendee' : 'Add Attendee'}</h2>
				<div className="admin-form">
					{!validated ? (
						<>
							<label>Steam ID or Profile URL</label>
							<div className="admin-form-inline">
								<input
									value={steamIdInput}
									onChange={e => setSteamIdInput(e.target.value)}
									placeholder="e.g. 76561198004630020 or https://steamcommunity.com/profiles/76561198004630020"
									autoFocus
								/>
								<button
									className="admin-btn admin-btn-primary"
									onClick={handleValidate}
									disabled={validating}
								>
									{validating ? 'Validating...' : 'Validate'}
								</button>
							</div>
							{error && <div className="admin-error">{error}</div>}
							<div className="admin-form-actions">
								<button className="admin-btn admin-btn-secondary" onClick={onCancel}>Cancel</button>
							</div>
						</>
					) : (
						<>
							<label>Steam ID</label>
							<input value={form.steam_id || ''} disabled />

							<label>Persona Name</label>
							<input value={form.persona_name || ''} disabled />

							<label>Discord ID</label>
							<div className="admin-form-inline">
								<input
									value={form.discord_id || ''}
									onChange={e => {
										set('discord_id', e.target.value);
										setDiscordValidated(false);
									}}
								/>
								{form.discord_id && !discordValidated && (
									<button
										type="button"
										className="admin-btn admin-btn-primary"
										onClick={handleDiscordValidate}
									>
										Validate
									</button>
								)}
							</div>

							<label>First Name</label>
							<input value={form.first_name || ''} onChange={e => set('first_name', e.target.value)} />

							<label>Last Name</label>
							<input value={form.last_name || ''} onChange={e => set('last_name', e.target.value)} />

							<label>Role</label>
							<select value={form.role ?? 3} onChange={e => set('role', parseInt(e.target.value))}>
								<option value={1}>Host</option>
								<option value={2}>Contributor</option>
								<option value={3}>Standard</option>
							</select>

							<label>Level</label>
							<select value={form.level ?? 1} onChange={e => set('level', parseInt(e.target.value))}>
								<option value={3}>3</option>
								<option value={2}>2</option>
								<option value={1}>1</option>
							</select>

							<div className="admin-form-checks">
								<label><input type="checkbox" checked={form.active ?? true} onChange={e => set('active', e.target.checked)} /> Active</label>
								<label><input type="checkbox" checked={form.is_new || false} onChange={e => set('is_new', e.target.checked)} /> New</label>
							</div>

							{error && <div className="admin-error">{error}</div>}

							<div className="admin-form-actions">
								<button className="admin-btn admin-btn-secondary" onClick={onCancel}>Cancel</button>
								<button className="admin-btn admin-btn-primary" onClick={handleSubmit} disabled={loading}>
									{loading ? 'Saving...' : 'Save'}
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

const AttendeesList = () => {
	const [attendees, setAttendees] = useState(null);
	const [error, setError] = useState(null);
	const [editing, setEditing] = useState(null);

	const api = axios.create({ withCredentials: true });

	useEffect(() => {
		fetchAttendees();
	}, []);

	const fetchAttendees = async () => {
		try {
			const res = await api.get('/api/admin/attendees');
			setAttendees(res.data);
		} catch (err) {
			setError('Failed to load attendees');
		}
	};

	const toggleActive = async (attendee) => {
		// Optimistically update UI immediately
		setAttendees(prev => prev.map(a =>
			a.steam_id === attendee.steam_id ? { ...a, active: !a.active } : a
		));

		try {
			await api.put(`/api/admin/attendees/${attendee.steam_id}`, {
				...attendee,
				active: !attendee.active
			});
		} catch (err) {
			// Revert on failure
			setAttendees(prev => prev.map(a =>
				a.steam_id === attendee.steam_id ? { ...a, active: attendee.active } : a
			));
			setError('Failed to update attendee');
		}
	};

	const deleteAttendee = async (steam_id) => {
		if (!confirm('Are you sure you want to delete this attendee?')) return;
		try {
			await api.delete(`/api/admin/attendees/${steam_id}`);
			fetchAttendees();
		} catch (err) {
			setError('Failed to delete attendee');
		}
	};

	const handleSave = () => {
		setEditing(null);
		fetchAttendees();
	};

	if (error) return <div className="admin-error">{error}</div>;
	if (attendees === null) return <div className="admin-loading">Loading...</div>;

	return (
		<div className="admin-section">
			{editing && (
				<AttendeeForm
					attendee={editing}
					onSave={handleSave}
					onCancel={() => setEditing(null)}
					api={api}
				/>
			)}
			<div className="admin-section-header">
				<h2>Attendees</h2>
				<button className="admin-btn admin-btn-primary" onClick={() => setEditing(emptyAttendee)}>Add Attendee</button>
			</div>

			<PaginatedList
				items={attendees}
				columns={[
					{ label: 'Attendee', sortField: 'persona_name' },
					{ label: 'Role', sortField: 'role' },
					{ label: 'Level', sortField: 'level' },
					{ label: 'Active', sortField: 'active' },
					{ label: 'Actions', sortField: null }
				]}
				filterFields={["persona_name", "first_name", "last_name"]}
				initialSortField="role"
				initialSortDir="asc"
				renderRow={attendee => (
					<tr key={attendee.steam_id} className={!attendee.active ? 'admin-row-inactive' : ''}>
						<td data-label="Name">
							<div className="admin-name">
								{attendee.avatar_full && (
									<img src={attendee.avatar_full} alt={attendee.persona_name} className="admin-avatar-thumb" />
								)}
								<div>
									<div>{attendee.persona_name}</div>
									<div className="text-ultralight">{attendee.first_name} {attendee.last_name}</div>
								</div>
							</div>
						</td>
						<td data-label="Role">{['', 'Host', 'Contributor', 'Standard'][attendee.role]}</td>
						<td data-label="Level">{attendee.level}</td>
						<td data-label="Active">
							<button
								className={`admin-toggle ${attendee.active ? 'active' : ''}`}
								onClick={() => toggleActive(attendee)}
							>
								{attendee.active ? 'Active' : 'Inactive'}
							</button>
						</td>
						<td data-label="">
							<div className="admin-actions">
								<button className="admin-btn admin-btn-secondary" onClick={() => setEditing(attendee)}>Edit</button>
								<button className="admin-btn admin-btn-danger" onClick={() => deleteAttendee(attendee.steam_id)}>Delete</button>
							</div>
						</td>
					</tr>
				)}
			/>
		</div>
	);
};

export default AttendeesList;