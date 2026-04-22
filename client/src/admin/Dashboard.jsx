import { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import GamesList from './components/GamesList';
import AttendeesList from './components/AttendeesList';
import ConfigEditor from './components/ConfigEditor';

const Dashboard = ({ token, onLogout }) => {
	const [navOpen, setNavOpen] = useState(false);
	const closeNav = () => setNavOpen(false);

	return (
		<div className="admin-layout">
			<button
				className="admin-hamburger"
				onClick={() => setNavOpen(!navOpen)}
				aria-label="Toggle navigation"
			>
				<i className="fas fa-bars"></i>
			</button>

			<aside className={`admin-sidebar ${navOpen ? 'open' : ''}`}>
				<div className="admin-sidebar-header">
					<h1>Lynx<span className="text-blue">LAN</span></h1>
					<span className="text-ultralight">Admin</span>
				</div>
				<nav className="admin-nav">
					<NavLink to="/admin/games" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={closeNav}>Games</NavLink>
					<NavLink to="/admin/attendees" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={closeNav}>Attendees</NavLink>
					<NavLink to="/admin/config" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={closeNav}>Config</NavLink>
				</nav>
				<button className="admin-logout" onClick={onLogout}>Sign Out</button>
			</aside>

			{navOpen && <div className="admin-nav-overlay" onClick={closeNav} />}

			<main className="admin-content">
				<Routes>
					<Route path="games" element={<GamesList token={token} />} />
					<Route path="attendees" element={<AttendeesList token={token} />} />
					<Route path="config" element={<ConfigEditor token={token} />} />
					<Route path="*" element={<Navigate to="/admin/games" replace />} />
				</Routes>
			</main>
		</div>
	);
};

export default Dashboard;