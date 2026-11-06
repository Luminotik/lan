const Media = ({ config }) => {
	return (
		<div className="container-media section">
			<div className="page-container">
				<h1>Play</h1>
				<br />
				{config?.use_twitch ? (
					<div className="embed-twitch">
						{/* React doesn't execute <script> tags rendered in JSX, so use Twitch's iframe
						    player. Twitch requires `parent` to match the hostname serving the page. */}
						<iframe
							src={`https://player.twitch.tv/?channel=luminotik&parent=${window.location.hostname}&muted=true`}
							frameBorder="0"
							allow="autoplay; fullscreen"
							allowFullScreen
							title="Luminotik on Twitch"
						/>
					</div>
				) : (
					<div className="embed-youtube">
						<iframe
							src="https://www.youtube.com/embed/67iz_sA8FS8?rel=0&autoplay=1&mute=1&loop=1"
							frameBorder="0"
							allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
							allowFullScreen
							title="LAN Party Video"
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default Media;