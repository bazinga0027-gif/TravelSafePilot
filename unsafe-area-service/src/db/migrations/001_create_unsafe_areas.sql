CREATE TABLE IF NOT EXISTS unsafe_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'extreme')),
  category TEXT NOT NULL,
  geometry GEOMETRY(POLYGON, 4326) NOT NULL,
  source TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS unsafe_areas_geom_idx
  ON unsafe_areas
  USING GIST (geometry);

CREATE INDEX IF NOT EXISTS unsafe_areas_city_idx
  ON unsafe_areas (city, province, country_code);
