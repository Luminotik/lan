// External packages
import express from 'express';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
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
import adminNotifyRouter from './routes/admin/notify.js';
import adminItadRouter from './routes/admin/itad.js';
import { refreshGames, refreshAttendees } from './jobs/refresh.js';
import { createLogger, registerAlertFn } from './lib/logger.js';
import { sendAdminAlert } from './lib/discord.js';
const logger = createLogger('server');

registerAlertFn(sendAdminAlert);

dotenv.config();

const app = express();

// Behind Traefik: trust one proxy hop so req.ip is the real client IP
// (required for per-client login rate limiting and accurate login-failure logs)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 5,                   // 5 attempts per window
	message: { error: 'Too many login attempts, please try again later' }
});

app.use(express.json());
app.use(cookieParser());
app.use('/api/auth/login', loginLimiter);

app.use('/api/config', configRouter);
app.use('/api/games', gamesRouter);
app.use('/api/attendees', attendeesRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin/games', adminGamesRouter);
app.use('/api/admin/attendees', adminAttendeesRouter);
app.use('/api/admin/config', adminConfigRouter);
app.use('/api/admin/notify', adminNotifyRouter);
app.use('/api/admin/itad', adminItadRouter);

// Unknown API routes return JSON 404s instead of falling through to index.html
app.use('/api', (req, res) => {
	res.status(404).json({ error: 'Not found' });
});

app.use(express.static(join(__dirname, '../client/dist')));

app.get('/{*path}', (req, res) => {
	res.sendFile(join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
	logger.log(`Running on port ${PORT}`);
	logger.alert(`Server started on port ${PORT}`);
});

// Run a job only if its previous run has finished, so a slow run (many stale
// records, rate-limit backoff) can't overlap the next tick and double-notify.
const running = new Set();
function runExclusive(name, job) {
	if (running.has(name)) {
		logger.warn(`${name} still running from previous tick, skipping`);
		return;
	}
	running.add(name);
	job()
		.catch(err => logger.alert(`Unhandled error in ${name}`, err))
		.finally(() => running.delete(name));
}

// Run refresh every minute
cron.schedule('* * * * *', () => {
	runExclusive('refreshGames', refreshGames);
	runExclusive('refreshAttendees', refreshAttendees);
});