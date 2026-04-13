import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import Countdown from './Countdown';

const GameCard = ({ game }) => {
	const renderPrice = () => {
		if (game.is_free) {
			return <div className="game-detail-price-free"><span>Free</span></div>;
		}
		if (game.is_gamepass) {
			return (
				<div className="game-detail-price-gamepass">
					<span className="game-detail-price-gamepass-logo">&#xEA04;</span><br />
					<span className="game-detail-price-gamepass-brand-1">GAME PASS</span><br />
					<span className="game-detail-price-gamepass-brand-2">FOR PC</span>
				</div>
			);
		}
		if (game.price_new < game.price_old) {
			return (
				<>
					<div className="game-detail-price-old"><span>{game.price_old.toFixed(2)}</span></div>
					<div className="game-detail-price-new"><span>{game.price_new.toFixed(2)}</span></div>
				</>
			);
		}
		return <div className="game-detail-price-standard"><span>{game.price_new.toFixed(2)}</span></div>;
	};

	return (
		<div className={`game game-${game.steam_appid}`}>
			<a href={game.is_gamepass ? game.gamepass_url : game.url}>
				<img className="game-banner" src={game.header_image} alt={game.name} />
				<div className="game-details">
					<div className="game-detail-name"><span>{game.name}</span></div>
					<div className="game-detail-price">{renderPrice()}</div>
				</div>
			</a>
		</div>
	);
};

const Games = ({ config, games }) => {
	const skeletons = Array(9).fill(null);

	return (
		<div className="container-games section">
			<div className="page-container">
				<div className="games-header">
					<h1>Games</h1>
					<div id="event-countdown">
						{config === null
							? <Skeleton width={170} height={66} baseColor="#1a222b" highlightColor="#243041" />
							: <Countdown eventDate={config.event_date} />
						}
					</div>
				</div>
				<div className="games-grid">
					{games === null
						? skeletons.map((_, i) => (
							<div key={i} className="game">
								<Skeleton height={172} baseColor="#1a222b" highlightColor="#243041" />
							</div>
						))
						: games.map(game => (
							<GameCard key={game.id} game={game} />
						))
					}
				</div>
			</div>
		</div>
	);
};

export default Games;