import { useState, useEffect } from 'react';

const Countdown = ({ eventDate }) => {
	const [timeLeft, setTimeLeft] = useState(null);

	useEffect(() => {
		const calculate = () => {
			const now = new Date();
			const target = new Date(eventDate);
			const diff = target - now;

			if (diff <= 0) {
				setTimeLeft(null);
				return;
			}

			setTimeLeft({
				days: Math.floor(diff / (1000 * 60 * 60 * 24)),
				hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
				minutes: Math.floor((diff / (1000 * 60)) % 60),
				seconds: Math.floor((diff / 1000) % 60),
			});
		};

		calculate();
		const interval = setInterval(calculate, 1000);
		return () => clearInterval(interval);
	}, [eventDate]);

	if (!timeLeft) return null;

	return (
		<h4 className="event-countdown">
			<div className="date">{new Date(eventDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</div>
			<div>
				<span className="days">{String(timeLeft.days).padStart(2, '0')}d </span>
				<span className="hours">{String(timeLeft.hours).padStart(2, '0')}h </span>
				<span className="minutes">{String(timeLeft.minutes).padStart(2, '0')}m </span>
				<span className="seconds">{String(timeLeft.seconds).padStart(2, '0')}s</span>
			</div>
		</h4>
	);
};

export default Countdown;