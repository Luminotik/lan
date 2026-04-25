import { useState } from 'react';
import axios from 'axios';

const Login = ({ onLogin }) => {
	const [password, setPassword] = useState('');
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const res = await axios.post('/api/auth/login', { password });
			onLogin();
		} catch (err) {
			setError('Invalid password');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="admin-login">
			<div className="admin-login-box">
				<h1>Lynx<span className="text-blue">LAN</span></h1>
				<h2>Admin</h2>
				<form onSubmit={handleSubmit}>
					<input
						type="password"
						placeholder="Password"
						value={password}
						onChange={e => setPassword(e.target.value)}
						autoFocus
					/>
					{error && <div className="admin-error">{error}</div>}
					<button type="submit" disabled={loading}>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>
					<a href="/" className="admin-login-back">← Back to site</a>
				</form>
			</div>
		</div>
	);
};

export default Login;