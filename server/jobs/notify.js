import pool from '../db.js';
import twilio from 'twilio';

const smsClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const testSmsClient = twilio(process.env.TWILIO_TEST_ACCOUNT_SID, process.env.TWILIO_TEST_AUTH_TOKEN);

export async function notifyPriceDrops(drops) {
	if (drops.length === 0) return;

	if (process.env.SMS_ENABLED !== 'true') {
		console.log('[notify] SMS_ENABLED is not true, skipping notifications.');
		return;
	}

	// Load config from database
	const { rows: configRows } = await pool.query(
		`SELECT	site_name, 
				site_url, 
				vcf_url 
		 FROM	config 
		 LIMIT	1`
	);
	const { site_name, site_url, vcf_url } = configRows[0];

	// Build message body
	const lines = drops.map(d => `• ${d.name}: $${d.price_new.toFixed(2)} (was $${d.price_old.toFixed(2)})`);
	const body = `${site_name} price update:\n\n${lines.join('\n')}\n\n${site_url}`;

	// Get active attendees with SMS enabled
	const testMode = process.env.SMS_TEST_MODE === 'true';
	const testPhone = process.env.SMS_TEST_PHONE;

	let recipients;
	if (testMode) {
		recipients = [{ phone: testPhone, last_notification: Date.now(), first_name: 'Test' }];
		console.log(`[notify] Test mode — sending only to ${testPhone}`);
	} else {
		const { rows } = await pool.query(
			`SELECT	id,
					first_name,
					phone,
					last_notification
			 FROM	attendees
			 WHERE	active = true
			 AND	sms_notifications = true
			 AND	phone IS NOT NULL
			 AND	phone != ''`
		);
		recipients = rows;
	}

	console.log(`[notify] Sending price drop notification to ${recipients.length} recipients.`);

	const client = testMode ? testSmsClient : smsClient;
	const fromNumber = testMode ? process.env.TWILIO_TEST_FROM_NUMBER : process.env.TWILIO_FROM_NUMBER;

	for (const recipient of recipients) {
		try {
			const messageOpts = {
				from: fromNumber,
				to: recipient.phone,
				body
			};

			// Attach VCF on first notification ever, if configured
			if ((!recipient.last_notification || recipient.last_notification === 0) && vcf_url) {
				messageOpts.mediaUrl = [vcf_url];
			}

			const msg = await client.messages.create(messageOpts);
			console.log(`[notify] Sent to ${recipient.first_name} (${recipient.phone}): ${msg.sid}`);

			if (!testMode && recipient.id) {
				await pool.query(
					`UPDATE	attendees 
					 SET	last_notification = $1 
					 WHERE	id = $2`,
					[Date.now(), recipient.id]
				);
			}
		} catch (err) {
			console.error(`[notify] Failed to send to ${recipient.phone}:`, err.message);
		}
	}
}