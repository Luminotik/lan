import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';

const AdminApp = () => {
	const [token, setToken] = useState(null);

	useEffect(() => {
		const stored = sessionStorage.getItem('admin_token');
		if (stored) setToken(stored);
	}, []);

	const handleLogin = (newToken) => {
		sessionStorage.setItem('admin_token', newToken);
		setToken(newToken);
	};

	const handleLogout = () => {
		sessionStorage.removeItem('admin_token');
		setToken(null);
	};

	return (
		<Routes>
			<Route
				path="login"
				element={token
					? <Navigate to="/admin" replace />
					: <Login onLogin={handleLogin} />}
			/>
			<Route
				path="/*"
				element={token
					? <Dashboard token={token} onLogout={handleLogout} />
					: <Navigate to="/admin/login" replace />}
			/>
		</Routes>
	);
};

export default AdminApp;