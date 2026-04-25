import { useState } from 'react';
import axios from 'axios';

const Notifications = () => {
	const [message, setMessage] = useState('');
	const [mentionRole, setMentionRole] = useState(false);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState(null);

	const api = axios.create({ withCredentials: true });

	const handleSend = async () => {
		if (!message.trim()) return;
		setLoading(true);
		setError(null);
		setSuccess(false);
		try {
			await api.post('/api/admin/notify/message', {
				message,
				mention_role: mentionRole
			});
			setSuccess(true);
			setMessage('');
			setTimeout(() => setSuccess(false), 3000);
		} catch (err) {
			setError(err.response?.data?.error || 'Failed to send notification');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="admin-section">
			<div className="admin-section-header">
				<h2>Notifications</h2>
			</div>

			<div className="admin-form admin-form-wide">
				<h3>Send to Discord</h3>

				<label>Message</label>
				<textarea
					value={message}
					onChange={e => setMessage(e.target.value)}
					rows={4}
					placeholder="Write a message to post in the configured Discord channel..."
				/>

				<div className="admin-form-checks">
					<label>
						<input
							type="checkbox"
							checked={mentionRole}
							onChange={e => setMentionRole(e.target.checked)}
						/> @ mention attendee role
					</label>
				</div>

				{error && <div className="admin-error">{error}</div>}

				<div className="admin-form-actions">
					{success && <span className="admin-success">Sent!</span>}
					<button
						className="admin-btn admin-btn-primary"
						onClick={handleSend}
						disabled={loading || !message.trim()}
					>
						{loading ? 'Sending...' : 'Send'}
					</button>
				</div>
			</div>
		</div>
	);
};

export default Notifications;
