// Dismissible notice shown above a section, for action failures and warnings
// that shouldn't replace the page content.
const Banner = ({ message, onDismiss }) => {
	if (!message) return null;
	return (
		<div className="admin-banner">
			<span>{message}</span>
			<button className="admin-banner-close" onClick={onDismiss} aria-label="Dismiss">×</button>
		</div>
	);
};

export default Banner;
