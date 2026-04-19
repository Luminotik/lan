// External packages
import express from 'express';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 10,                  // 10 attempts per window
	message: { error: 'Too many login attempts, please try again later' }
});

app.use(express.json());
app.use('/api/auth/login', loginLimiter);

app.use('/api/config', configRouter);
app.use('/api/games', gamesRouter);
app.use('/api/attendees', attendeesRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin/games', adminGamesRouter);
app.use('/api/admin/attendees', adminAttendeesRouter);
app.use('/api/admin/config', adminConfigRouter);

app.use(express.static(join(__dirname, '../client/dist')));

app.get('/{*path}', (req, res) => {
	res.sendFile(join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

// Run refresh every minute
cron.schedule('* * * * *', () => {
	refreshGames();
	refreshAttendees();
});