-- 051 — 2025 Official Tourism Footfall Data
-- Data from UTDB: https://uttarakhandtourism.gov.in/assets/media/UTDB_media_1785820386Uttarakhand_Tourist_Footfall-2025.pdf

-- 1. Ensure all destinations exist
INSERT INTO destinations (slug, type, name_en, name_hi, area_id)
VALUES
  ('dehradun-city', 'hill_station', 'Dehradun', 'देहरादून', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun')),
  ('rishikesh', 'religious', 'Rishikesh', 'ऋषिकेश', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun')),
  ('mussoorie', 'hill_station', 'Mussoorie', 'मसूरी', (SELECT id FROM areas WHERE type = 'district' AND slug = 'dehradun')),
  
  ('pauri', 'hill_station', 'Pauri', 'पौड़ी', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal')),
  ('srinagar', 'religious', 'Srinagar', 'श्रीनगर', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal')),
  ('kotdwar', 'religious', 'Kotdwar', 'कोटद्वार', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pauri-garhwal')),
  
  ('rudraprayag-city', 'religious', 'Rudraprayag', 'रुद्रप्रयाग', (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag')),
  ('kedarnath', 'char_dham', 'Kedarnath', 'केदारनाथ', (SELECT id FROM areas WHERE type = 'district' AND slug = 'rudraprayag')),
  
  ('gopeshwar', 'hill_station', 'Gopeshwar', 'गोपेश्वर', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli')),
  ('joshimath', 'religious', 'Joshimath', 'जोशीमठ', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli')),
  ('badrinath', 'char_dham', 'Badrinath', 'बद्रीनाथ', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli')),
  ('auli', 'hill_station', 'Auli', 'औली', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli')),
  ('hemkund-sahib', 'religious', 'Hemkund Sahib', 'हेमकुण्ड साहिब', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli')),
  ('valley-of-flowers', 'trek', 'Valley of Flowers', 'फूलों की घाटी', (SELECT id FROM areas WHERE type = 'district' AND slug = 'chamoli')),
  
  ('tehri-district', 'other', 'Tehri District', 'टिहरी जिला', (SELECT id FROM areas WHERE type = 'district' AND slug = 'tehri-garhwal')),
  
  ('uttarkashi-city', 'religious', 'Uttarkashi', 'उत्तरकाशी', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi')),
  ('gangotri', 'char_dham', 'Gangotri', 'गंगोत्री', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi')),
  ('yamunotri', 'char_dham', 'Yamunotri', 'यमुनोत्री', (SELECT id FROM areas WHERE type = 'district' AND slug = 'uttarkashi')),
  
  ('haridwar-city', 'religious', 'Haridwar', 'हरिद्वार', (SELECT id FROM areas WHERE type = 'district' AND slug = 'haridwar')),
  
  ('almora-city', 'hill_station', 'Almora', 'अल्मोड़ा', (SELECT id FROM areas WHERE type = 'district' AND slug = 'almora')),
  ('ranikhet', 'hill_station', 'Ranikhet', 'रानीखेत', (SELECT id FROM areas WHERE type = 'district' AND slug = 'almora')),
  
  ('kausani-bageshwar', 'hill_station', 'Kausani and Bageshwar', 'कौसानी एवं बागेश्वर', (SELECT id FROM areas WHERE type = 'district' AND slug = 'bageshwar')),
  
  ('pithoragarh-district', 'other', 'Pithoragarh District', 'पिथौरागढ़ जिला', (SELECT id FROM areas WHERE type = 'district' AND slug = 'pithoragarh')),
  
  ('champawat-district', 'other', 'Champawat District', 'चम्पावत जिला', (SELECT id FROM areas WHERE type = 'district' AND slug = 'champawat')),
  
  ('nainital-city', 'hill_station', 'Nainital', 'नैनीताल', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital')),
  ('kathgodam', 'other', 'Kathgodam', 'काठगोदाम', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital')),
  ('corbett-national-park', 'wildlife', 'Corbett National Park', 'कॉर्बेट नेशनल पार्क', (SELECT id FROM areas WHERE type = 'district' AND slug = 'nainital')),
  
  ('udham-singh-nagar-district', 'other', 'Udham Singh Nagar District', 'ऊधम सिंह नगर जिला', (SELECT id FROM areas WHERE type = 'district' AND slug = 'udham-singh-nagar'))
ON CONFLICT (slug) DO UPDATE SET
  type    = EXCLUDED.type,
  name_en = EXCLUDED.name_en,
  name_hi = EXCLUDED.name_hi,
  area_id = EXCLUDED.area_id;

-- 2. Insert 2025 footfall data
INSERT INTO destination_annual_visitors (destination_id, year, visitors, source_id, fetched_at)
SELECT d.id, v.year, v.visitors,
       (SELECT id FROM sources WHERE source_key = 'uk-tourism-capacity'),
       (now() AT TIME ZONE 'utc')
  FROM (VALUES
    ('dehradun-city', 2025::smallint, 6735071),
    ('rishikesh', 2025::smallint, 1033325),
    ('mussoorie', 2025::smallint, 1594221),
    
    ('pauri', 2025::smallint, 14710),
    ('srinagar', 2025::smallint, 844561),
    ('kotdwar', 2025::smallint, 491897),
    
    ('rudraprayag-city', 2025::smallint, 531231),
    ('kedarnath', 2025::smallint, 1770274),
    
    ('gopeshwar', 2025::smallint, 181666),
    ('joshimath', 2025::smallint, 157313),
    ('badrinath', 2025::smallint, 1778298),
    ('auli', 2025::smallint, 147277),
    ('hemkund-sahib', 2025::smallint, 187974),
    ('valley-of-flowers', 2025::smallint, 20893),
    
    ('tehri-district', 2025::smallint, 5329759),
    
    ('uttarkashi-city', 2025::smallint, 374346),
    ('gangotri', 2025::smallint, 758249),
    ('yamunotri', 2025::smallint, 644637),
    
    ('haridwar-city', 2025::smallint, 34249380),
    
    ('almora-city', 2025::smallint, 426648),
    ('ranikhet', 2025::smallint, 127563),
    
    ('kausani-bageshwar', 2025::smallint, 109515),
    
    ('pithoragarh-district', 2025::smallint, 387558),
    
    ('champawat-district', 2025::smallint, 279860),
    
    ('nainital-city', 2025::smallint, 1322874),
    ('kathgodam', 2025::smallint, 385347),
    ('corbett-national-park', 2025::smallint, 130119),
    
    ('udham-singh-nagar-district', 2025::smallint, 306628)
  ) AS v(slug, year, visitors)
  JOIN destinations d ON d.slug = v.slug
ON CONFLICT (destination_id, year) DO UPDATE SET
  visitors   = EXCLUDED.visitors,
  source_id  = EXCLUDED.source_id,
  fetched_at = EXCLUDED.fetched_at;

