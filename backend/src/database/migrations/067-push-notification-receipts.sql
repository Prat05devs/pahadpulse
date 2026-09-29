-- Keep successful Expo push tickets until their final APNs/FCM handoff receipt is checked.
-- A send ticket only says Expo accepted the payload. The later receipt is where an
-- uninstalled app (`DeviceNotRegistered`) and credential/provider failures are reported.

CREATE TABLE push_notification_tickets (
  ticket_id     VARCHAR(128) PRIMARY KEY,
  device_token  VARCHAR(255) NOT NULL
                  REFERENCES device_tokens(token) ON DELETE CASCADE,
  created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX idx_push_notification_tickets_created_at
  ON push_notification_tickets (created_at);

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_push_notification_tickets_created_at;
-- DROP TABLE IF EXISTS push_notification_tickets;
