import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_FILE = path.join(__dirname, '../../logs/app.log');
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });

function rotateIfNeeded() {
	try {
		if (fs.statSync(LOG_FILE).size >= MAX_SIZE) {
			fs.renameSync(LOG_FILE, LOG_FILE + '.1');
		}
	} catch {
		// File doesn't exist yet — nothing to rotate
	}
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function timestamp() {
	const d = new Date();
	const day = String(d.getDate()).padStart(2, '0');
	const month = MONTHS[d.getMonth()];
	const h = String(d.getHours()).padStart(2, '0');
	const m = String(d.getMinutes()).padStart(2, '0');
	const s = String(d.getSeconds()).padStart(2, '0');
	return `${day}-${month}-${d.getFullYear()} ${h}:${m}:${s}`;
}

function format(arg) {
	if (arg instanceof Error) return arg.stack || arg.message;
	if (typeof arg === 'object' && arg !== null) return JSON.stringify(arg);
	return String(arg);
}

function write(stream, ...args) {
	rotateIfNeeded();
	const line = `${timestamp()}: ${args.map(format).join(' ')}`;
	stream.write(line + '\n');
	try {
		fs.appendFileSync(LOG_FILE, line + '\n');
	} catch {
		// Don't crash the server if the log file can't be written
	}
}

export const logger = {
	log:   (...args) => write(process.stdout, ...args),
	error: (...args) => write(process.stderr, ...args),
	warn:  (...args) => write(process.stderr, ...args),
};

export function createLogger(tag) {
	const prefix = `[${tag}]`;
	return {
		log:   (...args) => write(process.stdout, prefix, ...args),
		error: (...args) => write(process.stderr, prefix, ...args),
		warn:  (...args) => write(process.stderr, prefix, ...args),
	};
}
