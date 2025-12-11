CREATE TABLE IF NOT EXISTS unsafe_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'extreme')),
  category TEXT NOT NULL,
  center GEOMETRY(POINT, 4326) NOT NULL,
  radius_m INTEGER NOT NULL CHECK (radius_m > 0),
  geometry GEOMETRY(POLYGON, 4326),
  source TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS unsafe_alerts_center_idx
  ON unsafe_alerts
  USING GIST (center);

CREATE INDEX IF NOT EXISTS unsafe_alerts_geom_idx
  ON unsafe_alerts
  USING GIST (geometry);
