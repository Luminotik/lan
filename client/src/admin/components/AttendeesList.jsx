import { useState, useEffect } from 'react';
import axios from 'axios';

const emptyAttendee = {
	steam_id: '',
	first_name: '',
	last_name: '',
	phone: '',
	active: true,
	role: 3,
	level: 1,
	is_new: false,
	sms_notifications: false
};

const AttendeeForm = ({ attendee, onSave, onCancel, api }) => {
	const [form, setForm] = useState(attendee);
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);

	const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

	const handleSubmit = async () => {
		setLoading(true);
		setError(null);
		try {
			if (form.id) {
				await api.put(`/api/admin/attendees/${form.id}`, form);
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
				<h2>{form.id ? 'Edit Attendee' : 'Add Attendee'}</h2>
				<div className="admin-form">
					<label>Steam ID</label>
					<input value={form.steam_id} onChange={e => set('steam_id', e.target.value)} />

					<label>First Name</label>
					<input value={form.first_name} onChange={e => set('first_name', e.target.value)} />

					<label>Last Name</label>
					<input value={form.last_name} onChange={e => set('last_name', e.target.value)} />

					<label>Phone</label>
					<input value={form.phone} onChange={e => set('phone', e.target.value)} />

					<label>Role</label>
					<select value={form.role} onChange={e => set('role', parseInt(e.target.value))}>
						<option value={1}>Host</option>
						<option value={2}>Contributor</option>
						<option value={3}>Standard</option>
					</select>

					<label>Level</label>
					<select value={form.level} onChange={e => set('level', parseInt(e.target.value))}>
						<option value={3}>3</option>
						<option value={2}>2</option>
						<option value={1}>1</option>
					</select>

					<div className="admin-form-checks">
						<label><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Active</label>
						<label><input type="checkbox" checked={form.is_new} onChange={e => set('is_new', e.target.checked)} /> New</label>
						<label><input type="checkbox" checked={form.sms_notifications} onChange={e => set('sms_notifications', e.target.checked)} /> SMS</label>
					</div>

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

const AttendeesList = ({ token }) => {
	const [attendees, setAttendees] = useState(null);
	const [error, setError] = useState(null);
	const [editing, setEditing] = useState(null);

	const api = axios.create({
		headers: { Authorization: `Bearer ${token}` }
	});

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
			a.id === attendee.id ? { ...a, active: !a.active } : a
		));

		try {
			await api.put(`/api/admin/attendees/${attendee.id}`, {
				...attendee,
				active: !attendee.active
			});
		} catch (err) {
			// Revert on failure
			setAttendees(prev => prev.map(a =>
				a.id === attendee.id ? { ...a, active: attendee.active } : a
			));
			setError('Failed to update attendee');
		}
	};

	const deleteAttendee = async (id) => {
		if (!confirm('Are you sure you want to delete this attendee?')) return;
		try {
			await api.delete(`/api/admin/attendees/${id}`);
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
			<table className="admin-table">
				<thead>
					<tr>
						<th>Attendee</th>
						<th>Role</th>
						<th>Level</th>
						<th>Active</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{attendees.map(attendee => (
						<tr key={attendee.id} className={!attendee.active ? 'admin-row-inactive' : ''}>
							<td>
								<div className="admin-game-name">
									{attendee.avatar_full && (
										<img src={attendee.avatar_full} alt={attendee.persona_name} className="admin-avatar-thumb" />
									)}
									<div>
										<div>{attendee.persona_name}</div>
										<div className="text-ultralight">{attendee.first_name} {attendee.last_name}</div>
									</div>
								</div>
							</td>
							<td>{['', 'Host', 'Contributor', 'Standard'][attendee.role]}</td>
							<td>{attendee.level}</td>
							<td>
								<button
									className={`admin-toggle ${attendee.active ? 'active' : ''}`}
									onClick={() => toggleActive(attendee)}
								>
									{attendee.active ? 'Active' : 'Inactive'}
								</button>
							</td>
							<td>
								<div className="admin-actions">
									<button className="admin-btn admin-btn-secondary" onClick={() => setEditing(attendee)}>Edit</button>
									<button className="admin-btn admin-btn-danger" onClick={() => deleteAttendee(attendee.id)}>Delete</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default AttendeesList;