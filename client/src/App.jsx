import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

import Header from './components/Header';
import Games from './components/Games';
import Attendees from './components/Attendees';
import Media from './components/Media';
import Footer from './components/Footer';
import AdminApp from './admin/AdminApp';

const PublicSite = () => {
	const [config, setConfig] = useState(null);
	const [games, setGames] = useState(null);
	const [attendees, setAttendees] = useState(null);

	useEffect(() => {
		axios.get('/api/config').then(res => setConfig(res.data));
		axios.get('/api/games').then(res => setGames(res.data));
		axios.get('/api/attendees').then(res => setAttendees(res.data));
	}, []);

	return (
		<>
			<Header config={config} />
			<Games games={games} config={config} />
			<Attendees attendees={attendees} />
			<Media config={config} />
			<Footer />
		</>
	);
};

const App = () => {
	return (
		<Routes>
			<Route path="/admin/*" element={<AdminApp />} />
			<Route path="/*" element={<PublicSite />} />
		</Routes>
	);
};

export default App;