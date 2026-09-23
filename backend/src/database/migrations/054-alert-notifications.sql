-- Push notifications for new alerts.
--
-- Two things are needed and neither existed: somewhere to keep the devices that asked to be
-- told, and a record of which warnings have already been announced.
--
-- WHY A DEVICE TABLE AND NOT AN ACCOUNT. `accounts` is deferred (accounts.md §8), and a
-- notification does not need to know who anyone is. A device registers its own push token,
-- and can delete it. No phone number, no email, nothing that identifies a person — which is
-- also what keeps this out of the way of the privacy policy the app already publishes.

CREATE TABLE device_tokens (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Expo's push token, e.g. ExponentPushToken[xxxxxxxx]. Unique: a device that registers
  -- twice (reinstall, permission re-grant) updates its row rather than collecting copies,
  -- which is how the same warning ends up delivered three times to one phone.
  token         VARCHAR(255) NOT NULL UNIQUE,

  platform      VARCHAR(16)  NOT NULL CHECK (platform IN ('ios', 'android')),

  -- Which language to send in. The alert body itself is never translated (ALR-2); this
  -- governs the wording around it.
  language      VARCHAR(8)   NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),

  /*
   * Set when Expo tells us the token is dead (`DeviceNotRegistered`) — the app was
   * uninstalled or the token rotated. Kept rather than deleted so a reinstall can be told
   * apart from a first install, and so a bug that disables every token is visible as a
   * column full of the same timestamp rather than an empty table.
   */
  disabled_at   TIMESTAMP,

  created_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  updated_at    TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- The dispatch query reads exactly this set, every few minutes.
CREATE INDEX idx_device_tokens_active ON device_tokens (disabled_at) WHERE disabled_at IS NULL;

/*
 * When this alert was announced. NULL means "not yet".
 *
 * On the alert rather than in a join table: an alert is announced at most once, and the
 * upsert that revises a warning (ALR-1) deliberately leaves this alone — a revised warning
 * is the same warning, and re-announcing it every time SACHET restates it is how a person
 * learns to ignore the channel.
 */
ALTER TABLE alerts ADD COLUMN notified_at TIMESTAMP;

CREATE INDEX idx_alerts_pending_notification
  ON alerts (issued_at DESC)
  WHERE notified_at IS NULL;

/*
 * Every alert already stored counts as announced.
 *
 * Without this the first dispatch after deploy would push every warning in the table at
 * once — hundreds of notifications, most of them expired, to every device. Backfilling the
 * column is the difference between shipping a feature and shipping an incident.
 */
UPDATE alerts SET notified_at = (now() AT TIME ZONE 'utc') WHERE notified_at IS NULL;

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_alerts_pending_notification;
-- ALTER TABLE alerts DROP COLUMN IF EXISTS notified_at;
-- DROP INDEX IF EXISTS idx_device_tokens_active;
-- DROP TABLE IF EXISTS device_tokens;
