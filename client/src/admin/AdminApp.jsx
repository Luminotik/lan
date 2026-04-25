import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Dashboard from './Dashboard';

const AdminApp = () => {
	const [authenticated, setAuthenticated] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		axios.get('/api/auth/session')
			.then(() => setAuthenticated(true))
			.catch(() => setAuthenticated(false))
			.finally(() => setLoading(false));
	}, []);

	const handleLogin = () => setAuthenticated(true);

	const handleLogout = () => {
		axios.post('/api/auth/logout').finally(() => setAuthenticated(false));
	};

	if (loading) return null;

	return (
		<Routes>
			<Route
				path="login"
				element={authenticated
					? <Navigate to="/admin" replace />
					: <Login onLogin={handleLogin} />}
			/>
			<Route
				path="/*"
				element={authenticated
					? <Dashboard onLogout={handleLogout} />
					: <Navigate to="/admin/login" replace />}
			/>
		</Routes>
	);
};

export default AdminApp;