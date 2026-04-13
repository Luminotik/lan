import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';

import configRouter from './routes/config.js';
import gamesRouter from './routes/games.js';
import attendeesRouter from './routes/attendees.js';
import { refreshGames, refreshAttendees } from './jobs/refresh.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use('/api/config', configRouter);
app.use('/api/games', gamesRouter);
app.use('/api/attendees', attendeesRouter);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

// Run every 6 hours
cron.schedule('0 */6 * * *', () => {
	refreshGames();
	refreshAttendees();
});