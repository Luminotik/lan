import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const AttendeeCard = ({ attendee }) => {
	const roleClass = `attendee-role-${attendee.role}`;
	const levelClass = `attendee-level-${attendee.level}`;
	const newClass = attendee.is_new ? 'attendee-new' : '';

	return (
		<div className={`attendee ${roleClass} ${levelClass} ${newClass}`.trim()}>
			<div className="attendee-inner">
				<div className="attendee-avatar">
					<a href={`https://steamcommunity.com/profiles/${attendee.steam_id}`}>
						<img src={attendee.avatar_full} alt={attendee.persona_name} />
					</a>
				</div>
				<div className="attendee-names">
					<span className="attendee-persona">{attendee.persona_name}</span><br />
					<span className="attendee-name">{attendee.first_name} {attendee.last_name}</span>
				</div>
			</div>
		</div>
	);
};

const Attendees = ({ attendees }) => {
	const skeletons = Array(9).fill(null);

	return (
		<div className="container-attendees section">
			<div className="page-container">
				<h1>Connect</h1>
				<div className="attendees-grid">
					{attendees === null
						? skeletons.map((_, i) => (
							<div key={i} className="attendee">
								<div className="attendee-inner">
									<Skeleton circle height={96} width={96} baseColor="#111a22" highlightColor="#1a2633" />
									<div>
										<Skeleton width={180} baseColor="#111a22" highlightColor="#1a2633" />
										<Skeleton width={120} baseColor="#111a22" highlightColor="#1a2633" />
									</div>
								</div>
							</div>
						))
						: attendees.map(attendee => (
							<AttendeeCard key={attendee.steam_id} attendee={attendee} />
						))
					}
				</div>
			</div>
		</div>
	);
};

export default Attendees;