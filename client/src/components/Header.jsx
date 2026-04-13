const Header = ({ config }) => {
	return (
		<>
			<div className="container-header">
				<div className="container-background" />
				<div className="header-inner">
					<div>
						<span>Lynx</span>
						<span className="text-blue">LAN</span>
					</div>
				</div>
			</div>

			{config?.motd_body && (
				<div className="container-motd">
					<div className="page-container">
						<div className="wrapper-warning">
							<div className="wrapper-warning-content">
								{config.motd_title && <h2>{config.motd_title}</h2>}
								<span>{config.motd_body}</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export default Header;