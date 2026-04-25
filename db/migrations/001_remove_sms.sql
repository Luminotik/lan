ALTER TABLE attendees
    DROP COLUMN phone,
    DROP COLUMN sms_notifications,
    DROP COLUMN last_notification;

ALTER TABLE config
    DROP COLUMN site_name,
    DROP COLUMN site_url,
    DROP COLUMN vcf_url;
