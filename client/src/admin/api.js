import axios from 'axios';

// Shared client for admin API calls. The admin session lives in an httpOnly
// cookie, so every request needs credentials attached.
const api = axios.create({ withCredentials: true });

export default api;
