-- 008 — alerts: time-bounded warnings issued by authorities, and the areas they affect.
--
-- This is the module where correctness matters most. Everything else on the platform is
-- information; this is safety information. See project/modules/alerts.md.
--
-- `vintage` note: DS-1 requires every domain value to carry source_id, vintage and
-- fetched_at. An alert is event-shaped rather than measurement-shaped, so `issued_at`
-- (cap:sent — when the authority issued it) fills vintage's role: it is what the record
-- describes. `fetched_at` is still when WE retrieved it, kept distinct as DS-2 requires.

CREATE TABLE IF NOT EXISTS alerts (
  id                INT AUTO_INCREMENT PRIMARY KEY,

  source_id         INT NOT NULL,
  -- The source's own identifier for this alert (CAP's cap:identifier). Upsert key (ALR-1):
  -- a revised warning replaces ours, it never creates a second contradictory one.
  source_alert_id   VARCHAR(255) NOT NULL,

  type              ENUM('weather','river','flood','road','disaster') NOT NULL,
  severity          ENUM('minor','moderate','severe','extreme','unknown') NOT NULL DEFAULT 'unknown',
  urgency           ENUM('immediate','expected','future','past','unknown') NOT NULL DEFAULT 'unknown',
  certainty         ENUM('observed','likely','possible','unlikely','unknown') NOT NULL DEFAULT 'unknown',
  status            ENUM('active','expired','cancelled','superseded') NOT NULL DEFAULT 'active',

  headline          VARCHAR(512) NOT NULL,
  body              TEXT NOT NULL,
  instruction       TEXT NULL,

  -- Stored in the source's language and never translated (ALR-2).
  language          VARCHAR(8) NOT NULL DEFAULT 'en',

  authority         VARCHAR(255) NOT NULL,
  web_url           VARCHAR(2048) NULL,

  -- What the alert DESCRIBES — cap:sent. Fills the vintage role; see header note.
  issued_at         DATETIME NOT NULL,
  -- cap:onset. Nullable: not every CAP message states one.
  effective_from    DATETIME NULL,
  -- cap:expires. Nullable and deliberately so: a source that omits an expiry gets no
  -- fabricated one (ALR-3 evaluates this at read time; NULL means "no stated expiry").
  expires_at        DATETIME NULL,

  fetched_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_alerts_source
    FOREIGN KEY (source_id) REFERENCES sources(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  UNIQUE KEY uq_alert_source (source_id, source_alert_id),
  KEY idx_alert_active (status, expires_at, severity),
  KEY idx_alert_issued (issued_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- One alert can affect many areas; an area can have many active alerts.
CREATE TABLE IF NOT EXISTS alert_areas (
  alert_id          INT NOT NULL,
  area_id           INT NOT NULL,

  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (alert_id, area_id),

  CONSTRAINT fk_alert_areas_alert
    FOREIGN KEY (alert_id) REFERENCES alerts(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_alert_areas_area
    FOREIGN KEY (area_id) REFERENCES areas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- District dashboard: active alerts here. Joined against alerts.status/expires_at.
  KEY idx_alert_areas_area (area_id, alert_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ROLLBACK
-- DROP TABLE IF EXISTS alert_areas;
-- DROP TABLE IF EXISTS alerts;
