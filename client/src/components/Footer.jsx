const Footer = () => {
	return (
		<div className="container-footer">
			<div className="footer-inner">
				<img
					className="footer-logo"
					src="https://luminotik.me/images/lettermark.png"
					alt="Luminotik"
				/>
				<div>
					<span className="text-light">
						Made with ♥ by <a href="https://luminotik.me/">Nick Nestor</a>
					</span>
					<br />
					<span className="text-ultralight">
						Powered by Node.js®, PostgreSQL, and Cuervo® Golden Strawberry Margaritas
					</span>
				</div>
			</div>
		</div>
	);
};

export default Footer;