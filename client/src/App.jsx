import { useState, useEffect } from 'react';
import axios from 'axios';

import Header from './components/Header';
import Games from './components/Games';
import Attendees from './components/Attendees';
import Media from './components/Media';
import Footer from './components/Footer';

const App = () => {
  const [config, setConfig] = useState(null);
  const [games, setGames] = useState(null);
  const [attendees, setAttendees] = useState(null);

  useEffect(() => {
    setTimeout(() => axios.get('/api/config').then(res => setConfig(res.data)), 1000);
    setTimeout(() => axios.get('/api/games').then(res => setGames(res.data)), 2000);
    setTimeout(() => axios.get('/api/attendees').then(res => setAttendees(res.data)), 3000);
  }, []);

  return (
    <>
      <Header config={config} />
      <Games config={config} games={games} />
      <Attendees attendees={attendees} />
      <Media config={config} />
      <Footer />
    </>
  );
};

export default App;