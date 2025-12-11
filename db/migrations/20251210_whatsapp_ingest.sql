-- WhatsApp ingest schema for TravelSafePilot

-- 1) Table: whatsapp_groups
-- Stores WhatsApp group metadata and how it maps to an area

CREATE TABLE IF NOT EXISTS whatsapp_groups (
    id              SERIAL PRIMARY KEY,
    wa_group_id     TEXT NOT NULL UNIQUE,      -- WhatsApp group ID
    name            TEXT,                      -- Group subject/name
    area_name       TEXT,                      -- e.g. "Somerset West Sector 1"
    city            TEXT,
    province        TEXT,
    country         TEXT DEFAULT 'South Africa',
    default_lat     DOUBLE PRECISION,          -- Optional centre point for geocoding hints
    default_lng     DOUBLE PRECISION,
    trust_level     INTEGER DEFAULT 1,         -- 1=low, 5=very trusted
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_active
    ON whatsapp_groups (is_active);


-- 2) Table: community_incidents
-- Core incident table for WhatsApp + web/app/manual sources

CREATE TABLE IF NOT EXISTS community_incidents (
    id                BIGSERIAL PRIMARY KEY,
    source            TEXT NOT NULL,                -- 'whatsapp', 'web', 'app', 'manual'
    source_group_id   INTEGER REFERENCES whatsapp_groups(id),
    raw_message_id    TEXT,                         -- WhatsApp message ID or app UUID
    raw_text          TEXT,                         -- Full raw content (for audit / retraining)
    media_url         TEXT,                         -- If we store a URL to media/screenshot
    media_type        TEXT,                         -- 'image', 'video', etc.
    incident_type     TEXT,                         -- 'robbery', 'hijacking', etc.
    category          TEXT,                         -- 'crime', 'fire', 'medical', 'accident', etc.
    severity          INTEGER,                      -- 1-5
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,
    location_text     TEXT,                         -- e.g. "Main Rd near Shell, Somerset West"
    city              TEXT,
    province          TEXT,
    country           TEXT DEFAULT 'South Africa',
    occurred_at       TIMESTAMPTZ,                  -- When the incident happened
    reported_at       TIMESTAMPTZ DEFAULT NOW(),    -- When we got the report
    confidence        DOUBLE PRECISION,             -- 0.0 - 1.0
    is_verified       BOOLEAN DEFAULT FALSE,
    duplicate_of_id   BIGINT REFERENCES community_incidents(id),
    metadata          JSONB DEFAULT '{}'::JSONB,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_incidents_time
    ON community_incidents (occurred_at, reported_at);

CREATE INDEX IF NOT EXISTS idx_community_incidents_location
    ON community_incidents (city, province, country);

CREATE INDEX IF NOT EXISTS idx_community_incidents_active
    ON community_incidents (is_active);

-- Optional: if you already use PostGIS and want to add geometry later, we can ALTER TABLE
-- community_incidents ADD COLUMN geom geometry(Point, 4326);
