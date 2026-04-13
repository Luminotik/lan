const Media = ({ config }) => {
	return (
		<div className="container-media section">
			<div className="page-container">
				<h1>Play</h1>
				<br />
				{config?.use_twitch ? (
					<div className="embed-twitch">
						<div id="twitch-embed" />
						<script src="https://embed.twitch.tv/embed/v1.js" />
						<script dangerouslySetInnerHTML={{
							__html: `new Twitch.Embed('twitch-embed', {width: '100%', height: '100%', channel: 'luminotik'})`
						}} />
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