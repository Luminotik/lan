import express from 'express';
import dotenv from 'dotenv';
import configRouter from './routes/config.js';
import gamesRouter from './routes/games.js';
import attendeesRouter from './routes/attendees.js';

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