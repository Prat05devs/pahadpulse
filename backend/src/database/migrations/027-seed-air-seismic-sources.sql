-- 028 — the two sources behind air quality and seismic activity.
--
-- Both were chosen for the same reason as Open-Meteo (migration 020): they publish under
-- terms that permit DISPLAY, and they need no credential. Every source on this platform
-- that required an application is still waiting; every one that did not is live.

INSERT INTO sources
  (source_key, owner_module, department_en, department_hi, url, attribution, licence,
   access_method, cadence, may_redistribute, metadata_status, metadata_note, is_enabled)
VALUES
  (
    'open-meteo-air-quality',
    'hydromet',
    'Open-Meteo Air Quality (CAMS)',
    'ओपन-मीटियो वायु गुणवत्ता',
    'https://open-meteo.com/en/docs/air-quality-api',
    'Air quality data by Open-Meteo.com (CC BY 4.0), based on Copernicus CAMS',
    'Creative Commons Attribution 4.0 International (CC BY 4.0)',
    'api',
    'hourly',
    TRUE,
    'verified',
    'Modelled from the Copernicus Atmosphere Monitoring Service, not a ground monitor. This matters and is stated in the UI: CPCB operates real reference-grade stations in Uttarakhand and their readings are authoritative where they exist. This is a modelled estimate available for every district, including the many with no monitor at all. A separate source row, not folded into open-meteo, because it is a different API with a different upstream model and should be able to fail and go stale on its own.',
    TRUE
  ),
  (
    'usgs-earthquakes',
    'seismic',
    'United States Geological Survey, Earthquake Hazards Program',
    'संयुक्त राज्य भूवैज्ञानिक सर्वेक्षण',
    'https://earthquake.usgs.gov',
    'Source: U.S. Geological Survey Earthquake Hazards Program',
    'Public domain (US Government work)',
    'api',
    'realtime',
    TRUE,
    'verified',
    'USGS products are US Government works and in the public domain. Keyless. Used because it is the fastest global feed with an open licence — the National Center for Seismology (NCS) is the Indian authority for earthquakes in India and should be added ahead of this source if its terms permit, exactly as IMD should lead on weather.',
    TRUE
  )
ON CONFLICT (source_key) DO UPDATE SET
  owner_module     = EXCLUDED.owner_module,
  department_en    = EXCLUDED.department_en,
  department_hi    = EXCLUDED.department_hi,
  url              = EXCLUDED.url,
  attribution      = EXCLUDED.attribution,
  licence          = EXCLUDED.licence,
  access_method    = EXCLUDED.access_method,
  cadence          = EXCLUDED.cadence,
  may_redistribute = EXCLUDED.may_redistribute,
  metadata_status  = EXCLUDED.metadata_status,
  metadata_note    = EXCLUDED.metadata_note,
  is_enabled       = EXCLUDED.is_enabled;

-- ROLLBACK
-- DELETE FROM sources WHERE source_key IN ('open-meteo-air-quality', 'usgs-earthquakes');
