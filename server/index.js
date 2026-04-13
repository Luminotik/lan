// External packages
import express from 'express';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Internal modules
import configRouter from './routes/config.js';
import gamesRouter from './routes/games.js';
import attendeesRouter from './routes/attendees.js';
import authRouter from './routes/auth.js';
import adminGamesRouter from './routes/admin/games.js';
import adminAttendeesRouter from './routes/admin/attendees.js';
import adminConfigRouter from './routes/admin/config.js';
import { refreshGames, refreshAttendees } from './jobs/refresh.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use('/api/config', configRouter);
app.use('/api/games', gamesRouter);
app.use('/api/attendees', attendeesRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin/games', adminGamesRouter);
app.use('/api/admin/attendees', adminAttendeesRouter);
app.use('/api/admin/config', adminConfigRouter);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

// Run refresh every 6 hours
cron.schedule('0 */6 * * *', () => {
	refreshGames();
	refreshAttendees();
});