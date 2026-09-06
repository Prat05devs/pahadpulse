-- 015 — the real tehsils of Uttarakhand, replacing the demo hierarchy.
--
-- 117 tehsils across the 13 districts. Counts and names were taken from a published list and
-- cross-checked two ways before being written here:
--
--   1. The per-district counts sum to exactly 117, the figure two independent sources give
--      for the state total. A list that does not reconcile to a published total is a list
--      somebody mistyped.
--   2. Roughly 80 of these names were independently confirmed against OpenStreetMap
--      administrative relations at admin_level=6 within Uttarakhand — the same Overpass
--      query the boundary connector uses, one level down. Spelling differs in places (OSM
--      writes "Sult" for Salt, "Chinyali Saur" for Chinyalisaur); the official transliteration
--      is kept here and OSM is treated as corroboration of existence, not of spelling.
--
-- This is reference data, so it ships as a migration like the district list (002) rather than
-- as dev seed — every environment needs the same tehsil ids, and village rows will hold
-- foreign keys to them.
--
-- Both name columns are NOT NULL by the bilingual constraint: curated reference text carries
-- `_en` and `_hi`, and neither may be blank. The Hindi names here are the standard Devanagari
-- spellings of the place names, not machine transliteration of the English.
--
-- SLUGS are district-prefixed (`almora-ranikhet`, `chamoli-joshimath`). Ten tehsils share a
-- name with their own district — Almora, Chamoli, Dehradun, Haridwar, Nainital, Pithoragarh,
-- Rudraprayag, Champawat, Bageshwar, Tehri — so a bare name slug would collide with the
-- district's own row on the unique index.

-- The demo hierarchy goes first. Villages before tehsils: village.parent_id references the
-- tehsil with ON DELETE RESTRICT, so the child rows must clear before the parents can.
DELETE FROM areas WHERE type = 'village' AND code LIKE 'DEMO-%';
DELETE FROM areas WHERE type = 'tehsil'  AND code LIKE 'DEMO-%';

INSERT INTO areas (type, code, slug, name_en, name_hi, parent_id, division)
SELECT 'tehsil', t.code, t.slug, t.name_en, t.name_hi, d.id, d.division
  FROM (
    SELECT 'UK-AL-T01' AS code, 'almora-almora' AS slug, 'Almora' AS name_en, 'अल्मोड़ा' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T02' AS code, 'almora-bagwali-pokhar' AS slug, 'Bagwali Pokhar' AS name_en, 'बग्वालीपोखर' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T03' AS code, 'almora-bhanoli' AS slug, 'Bhanoli' AS name_en, 'भनोली' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T04' AS code, 'almora-bhikiyasain' AS slug, 'Bhikiyasain' AS name_en, 'भिकियासैंण' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T05' AS code, 'almora-chaukhutia' AS slug, 'Chaukhutia' AS name_en, 'चौखुटिया' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T06' AS code, 'almora-dwarahat' AS slug, 'Dwarahat' AS name_en, 'द्वाराहाट' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T07' AS code, 'almora-jainti' AS slug, 'Jainti' AS name_en, 'जैंती' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T08' AS code, 'almora-jalali' AS slug, 'Jalali' AS name_en, 'जलाली' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T09' AS code, 'almora-lamgara' AS slug, 'Lamgara' AS name_en, 'लमगड़ा' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T10' AS code, 'almora-machhor' AS slug, 'Machhor' AS name_en, 'मछोड़' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T11' AS code, 'almora-ranikhet' AS slug, 'Ranikhet' AS name_en, 'रानीखेत' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T12' AS code, 'almora-salt' AS slug, 'Salt' AS name_en, 'सल्ट' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T13' AS code, 'almora-someshwar' AS slug, 'Someshwar' AS name_en, 'सोमेश्वर' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-AL-T14' AS code, 'almora-syalde' AS slug, 'Syalde' AS name_en, 'स्याल्दे' AS name_hi, 'almora' AS district_slug
    UNION ALL
    SELECT 'UK-BA-T01' AS code, 'bageshwar-bageshwar' AS slug, 'Bageshwar' AS name_en, 'बागेश्वर' AS name_hi, 'bageshwar' AS district_slug
    UNION ALL
    SELECT 'UK-BA-T02' AS code, 'bageshwar-dug-nakuri' AS slug, 'Dug Nakuri' AS name_en, 'दुग नाकुरी' AS name_hi, 'bageshwar' AS district_slug
    UNION ALL
    SELECT 'UK-BA-T03' AS code, 'bageshwar-garur' AS slug, 'Garur' AS name_en, 'गरुड़' AS name_hi, 'bageshwar' AS district_slug
    UNION ALL
    SELECT 'UK-BA-T04' AS code, 'bageshwar-kanda' AS slug, 'Kanda' AS name_en, 'कांडा' AS name_hi, 'bageshwar' AS district_slug
    UNION ALL
    SELECT 'UK-BA-T05' AS code, 'bageshwar-kaphaligair' AS slug, 'Kaphaligair' AS name_en, 'कफलीगैर' AS name_hi, 'bageshwar' AS district_slug
    UNION ALL
    SELECT 'UK-BA-T06' AS code, 'bageshwar-kapkot' AS slug, 'Kapkot' AS name_en, 'कपकोट' AS name_hi, 'bageshwar' AS district_slug
    UNION ALL
    SELECT 'UK-BA-T07' AS code, 'bageshwar-shama' AS slug, 'Shama' AS name_en, 'शामा' AS name_hi, 'bageshwar' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T01' AS code, 'chamoli-adi-badri' AS slug, 'Adi Badri' AS name_en, 'आदि बद्री' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T02' AS code, 'chamoli-chamoli' AS slug, 'Chamoli' AS name_en, 'चमोली' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T03' AS code, 'chamoli-gairsain' AS slug, 'Gairsain' AS name_en, 'गैरसैंण' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T04' AS code, 'chamoli-ghat' AS slug, 'Ghat' AS name_en, 'घाट' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T05' AS code, 'chamoli-jilasu' AS slug, 'Jilasu' AS name_en, 'जिलासू' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T06' AS code, 'chamoli-joshimath' AS slug, 'Joshimath' AS name_en, 'जोशीमठ' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T07' AS code, 'chamoli-karnaprayag' AS slug, 'Karnaprayag' AS name_en, 'कर्णप्रयाग' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T08' AS code, 'chamoli-nandaprayag' AS slug, 'Nandaprayag' AS name_en, 'नंदप्रयाग' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T09' AS code, 'chamoli-narayanbagar' AS slug, 'Narayanbagar' AS name_en, 'नारायणबगड़' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T10' AS code, 'chamoli-pokhari' AS slug, 'Pokhari' AS name_en, 'पोखरी' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CM-T11' AS code, 'chamoli-tharali' AS slug, 'Tharali' AS name_en, 'थराली' AS name_hi, 'chamoli' AS district_slug
    UNION ALL
    SELECT 'UK-CP-T01' AS code, 'champawat-barakot' AS slug, 'Barakot' AS name_en, 'बाराकोट' AS name_hi, 'champawat' AS district_slug
    UNION ALL
    SELECT 'UK-CP-T02' AS code, 'champawat-champawat' AS slug, 'Champawat' AS name_en, 'चंपावत' AS name_hi, 'champawat' AS district_slug
    UNION ALL
    SELECT 'UK-CP-T03' AS code, 'champawat-lohaghat' AS slug, 'Lohaghat' AS name_en, 'लोहाघाट' AS name_hi, 'champawat' AS district_slug
    UNION ALL
    SELECT 'UK-CP-T04' AS code, 'champawat-pati' AS slug, 'Pati' AS name_en, 'पाटी' AS name_hi, 'champawat' AS district_slug
    UNION ALL
    SELECT 'UK-CP-T05' AS code, 'champawat-purnagiri' AS slug, 'Purnagiri' AS name_en, 'पूर्णागिरि' AS name_hi, 'champawat' AS district_slug
    UNION ALL
    SELECT 'UK-DD-T01' AS code, 'dehradun-chakrata' AS slug, 'Chakrata' AS name_en, 'चकराता' AS name_hi, 'dehradun' AS district_slug
    UNION ALL
    SELECT 'UK-DD-T02' AS code, 'dehradun-dehradun' AS slug, 'Dehradun' AS name_en, 'देहरादून' AS name_hi, 'dehradun' AS district_slug
    UNION ALL
    SELECT 'UK-DD-T03' AS code, 'dehradun-doiwala' AS slug, 'Doiwala' AS name_en, 'डोईवाला' AS name_hi, 'dehradun' AS district_slug
    UNION ALL
    SELECT 'UK-DD-T04' AS code, 'dehradun-kalsi' AS slug, 'Kalsi' AS name_en, 'कालसी' AS name_hi, 'dehradun' AS district_slug
    UNION ALL
    SELECT 'UK-DD-T05' AS code, 'dehradun-rishikesh' AS slug, 'Rishikesh' AS name_en, 'ऋषिकेश' AS name_hi, 'dehradun' AS district_slug
    UNION ALL
    SELECT 'UK-DD-T06' AS code, 'dehradun-tyuni' AS slug, 'Tyuni' AS name_en, 'त्यूणी' AS name_hi, 'dehradun' AS district_slug
    UNION ALL
    SELECT 'UK-DD-T07' AS code, 'dehradun-vikasnagar' AS slug, 'Vikasnagar' AS name_en, 'विकासनगर' AS name_hi, 'dehradun' AS district_slug
    UNION ALL
    SELECT 'UK-HR-T01' AS code, 'haridwar-bhagwanpur' AS slug, 'Bhagwanpur' AS name_en, 'भगवानपुर' AS name_hi, 'haridwar' AS district_slug
    UNION ALL
    SELECT 'UK-HR-T02' AS code, 'haridwar-haridwar' AS slug, 'Haridwar' AS name_en, 'हरिद्वार' AS name_hi, 'haridwar' AS district_slug
    UNION ALL
    SELECT 'UK-HR-T03' AS code, 'haridwar-laksar' AS slug, 'Laksar' AS name_en, 'लक्सर' AS name_hi, 'haridwar' AS district_slug
    UNION ALL
    SELECT 'UK-HR-T04' AS code, 'haridwar-roorkee' AS slug, 'Roorkee' AS name_en, 'रुड़की' AS name_hi, 'haridwar' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T01' AS code, 'nainital-betalghat' AS slug, 'Betalghat' AS name_en, 'बेतालघाट' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T02' AS code, 'nainital-dhari' AS slug, 'Dhari' AS name_en, 'धारी' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T03' AS code, 'nainital-haldwani' AS slug, 'Haldwani' AS name_en, 'हल्द्वानी' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T04' AS code, 'nainital-kainchi-dham' AS slug, 'Kainchi Dham' AS name_en, 'कैंची धाम' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T05' AS code, 'nainital-kaladhungi' AS slug, 'Kaladhungi' AS name_en, 'कालाढूंगी' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T06' AS code, 'nainital-khansyun' AS slug, 'Khansyun' AS name_en, 'खनस्यूं' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T07' AS code, 'nainital-lalkuan' AS slug, 'Lalkuan' AS name_en, 'लालकुआं' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T08' AS code, 'nainital-nainital' AS slug, 'Nainital' AS name_en, 'नैनीताल' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-NT-T09' AS code, 'nainital-ramnagar' AS slug, 'Ramnagar' AS name_en, 'रामनगर' AS name_hi, 'nainital' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T01' AS code, 'pauri-garhwal-bironkhal' AS slug, 'Bironkhal' AS name_en, 'बीरोंखाल' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T02' AS code, 'pauri-garhwal-chakisain' AS slug, 'Chakisain' AS name_en, 'चाकीसैंण' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T03' AS code, 'pauri-garhwal-chaubattakhal' AS slug, 'Chaubattakhal' AS name_en, 'चौबट्टाखाल' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T04' AS code, 'pauri-garhwal-dhumakot' AS slug, 'Dhumakot' AS name_en, 'धूमाकोट' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T05' AS code, 'pauri-garhwal-jakhanikhal' AS slug, 'Jakhanikhal' AS name_en, 'जाखणीखाल' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T06' AS code, 'pauri-garhwal-kotdwar' AS slug, 'Kotdwar' AS name_en, 'कोटद्वार' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T07' AS code, 'pauri-garhwal-lansdowne' AS slug, 'Lansdowne' AS name_en, 'लैंसडाउन' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T08' AS code, 'pauri-garhwal-pauri' AS slug, 'Pauri' AS name_en, 'पौड़ी' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T09' AS code, 'pauri-garhwal-rikhanikhal' AS slug, 'Rikhanikhal' AS name_en, 'रिखणीखाल' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T10' AS code, 'pauri-garhwal-satpuli' AS slug, 'Satpuli' AS name_en, 'सतपुली' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T11' AS code, 'pauri-garhwal-srinagar' AS slug, 'Srinagar' AS name_en, 'श्रीनगर' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T12' AS code, 'pauri-garhwal-thalisain' AS slug, 'Thalisain' AS name_en, 'थलीसैंण' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PG-T13' AS code, 'pauri-garhwal-yamkeshwar' AS slug, 'Yamkeshwar' AS name_en, 'यमकेश्वर' AS name_hi, 'pauri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T01' AS code, 'pithoragarh-bangapani' AS slug, 'Bangapani' AS name_en, 'बंगापानी' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T02' AS code, 'pithoragarh-berinag' AS slug, 'Berinag' AS name_en, 'बेरीनाग' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T03' AS code, 'pithoragarh-devalthal' AS slug, 'Devalthal' AS name_en, 'देवलथल' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T04' AS code, 'pithoragarh-dharchula' AS slug, 'Dharchula' AS name_en, 'धारचूला' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T05' AS code, 'pithoragarh-didihat' AS slug, 'Didihat' AS name_en, 'डीडीहाट' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T06' AS code, 'pithoragarh-ganai' AS slug, 'Ganai' AS name_en, 'गनाई' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T07' AS code, 'pithoragarh-gangolihat' AS slug, 'Gangolihat' AS name_en, 'गंगोलीहाट' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T08' AS code, 'pithoragarh-kanalichhina' AS slug, 'Kanalichhina' AS name_en, 'कनालीछीना' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T09' AS code, 'pithoragarh-munsiari' AS slug, 'Munsiari' AS name_en, 'मुनस्यारी' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T10' AS code, 'pithoragarh-pithoragarh' AS slug, 'Pithoragarh' AS name_en, 'पिथौरागढ़' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T11' AS code, 'pithoragarh-tejam' AS slug, 'Tejam' AS name_en, 'तेजम' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-PI-T12' AS code, 'pithoragarh-thal' AS slug, 'Thal' AS name_en, 'थल' AS name_hi, 'pithoragarh' AS district_slug
    UNION ALL
    SELECT 'UK-RP-T01' AS code, 'rudraprayag-basukedar' AS slug, 'Basukedar' AS name_en, 'बसुकेदार' AS name_hi, 'rudraprayag' AS district_slug
    UNION ALL
    SELECT 'UK-RP-T02' AS code, 'rudraprayag-jakholi' AS slug, 'Jakholi' AS name_en, 'जखोली' AS name_hi, 'rudraprayag' AS district_slug
    UNION ALL
    SELECT 'UK-RP-T03' AS code, 'rudraprayag-rudraprayag' AS slug, 'Rudraprayag' AS name_en, 'रुद्रप्रयाग' AS name_hi, 'rudraprayag' AS district_slug
    UNION ALL
    SELECT 'UK-RP-T04' AS code, 'rudraprayag-ukhimath' AS slug, 'Ukhimath' AS name_en, 'ऊखीमठ' AS name_hi, 'rudraprayag' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T01' AS code, 'tehri-garhwal-balganga' AS slug, 'Balganga' AS name_en, 'बालगंगा' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T02' AS code, 'tehri-garhwal-devprayag' AS slug, 'Devprayag' AS name_en, 'देवप्रयाग' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T03' AS code, 'tehri-garhwal-dhanaulti' AS slug, 'Dhanaulti' AS name_en, 'धनोल्टी' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T04' AS code, 'tehri-garhwal-gaja' AS slug, 'Gaja' AS name_en, 'गजा' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T05' AS code, 'tehri-garhwal-ghansali' AS slug, 'Ghansali' AS name_en, 'घनसाली' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T06' AS code, 'tehri-garhwal-jakhanidhar' AS slug, 'Jakhanidhar' AS name_en, 'जाखणीधार' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T07' AS code, 'tehri-garhwal-kandisaur' AS slug, 'Kandisaur' AS name_en, 'कंडीसौड़' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T08' AS code, 'tehri-garhwal-kirtinagar' AS slug, 'Kirtinagar' AS name_en, 'कीर्तिनगर' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T09' AS code, 'tehri-garhwal-madannegi' AS slug, 'Madannegi' AS name_en, 'मदननेगी' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T10' AS code, 'tehri-garhwal-nainbagh' AS slug, 'Nainbagh' AS name_en, 'नैनबाग' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T11' AS code, 'tehri-garhwal-narendranagar' AS slug, 'Narendranagar' AS name_en, 'नरेंद्रनगर' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T12' AS code, 'tehri-garhwal-paoki-devi' AS slug, 'Paoki Devi' AS name_en, 'पावकी देवी' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T13' AS code, 'tehri-garhwal-pratapnagar' AS slug, 'Pratapnagar' AS name_en, 'प्रतापनगर' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-TG-T14' AS code, 'tehri-garhwal-tehri' AS slug, 'Tehri' AS name_en, 'टिहरी' AS name_hi, 'tehri-garhwal' AS district_slug
    UNION ALL
    SELECT 'UK-US-T01' AS code, 'udham-singh-nagar-bajpur' AS slug, 'Bajpur' AS name_en, 'बाजपुर' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-US-T02' AS code, 'udham-singh-nagar-gadarpur' AS slug, 'Gadarpur' AS name_en, 'गदरपुर' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-US-T03' AS code, 'udham-singh-nagar-jaspur' AS slug, 'Jaspur' AS name_en, 'जसपुर' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-US-T04' AS code, 'udham-singh-nagar-kashipur' AS slug, 'Kashipur' AS name_en, 'काशीपुर' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-US-T05' AS code, 'udham-singh-nagar-khatima' AS slug, 'Khatima' AS name_en, 'खटीमा' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-US-T06' AS code, 'udham-singh-nagar-kichha' AS slug, 'Kichha' AS name_en, 'किच्छा' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-US-T07' AS code, 'udham-singh-nagar-nanakmatta' AS slug, 'Nanakmatta' AS name_en, 'नानकमत्ता' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-US-T08' AS code, 'udham-singh-nagar-rudrapur' AS slug, 'Rudrapur' AS name_en, 'रुद्रपुर' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-US-T09' AS code, 'udham-singh-nagar-sitarganj' AS slug, 'Sitarganj' AS name_en, 'सितारगंज' AS name_hi, 'udham-singh-nagar' AS district_slug
    UNION ALL
    SELECT 'UK-UT-T01' AS code, 'uttarkashi-barkot' AS slug, 'Barkot' AS name_en, 'बड़कोट' AS name_hi, 'uttarkashi' AS district_slug
    UNION ALL
    SELECT 'UK-UT-T02' AS code, 'uttarkashi-bhatwari' AS slug, 'Bhatwari' AS name_en, 'भटवाड़ी' AS name_hi, 'uttarkashi' AS district_slug
    UNION ALL
    SELECT 'UK-UT-T03' AS code, 'uttarkashi-chinyalisaur' AS slug, 'Chinyalisaur' AS name_en, 'चिन्यालीसौड़' AS name_hi, 'uttarkashi' AS district_slug
    UNION ALL
    SELECT 'UK-UT-T04' AS code, 'uttarkashi-dhauntari' AS slug, 'Dhauntari' AS name_en, 'धौंतरी' AS name_hi, 'uttarkashi' AS district_slug
    UNION ALL
    SELECT 'UK-UT-T05' AS code, 'uttarkashi-dunda' AS slug, 'Dunda' AS name_en, 'डुंडा' AS name_hi, 'uttarkashi' AS district_slug
    UNION ALL
    SELECT 'UK-UT-T06' AS code, 'uttarkashi-joshiyara' AS slug, 'Joshiyara' AS name_en, 'जोशियाड़ा' AS name_hi, 'uttarkashi' AS district_slug
    UNION ALL
    SELECT 'UK-UT-T07' AS code, 'uttarkashi-mori' AS slug, 'Mori' AS name_en, 'मोरी' AS name_hi, 'uttarkashi' AS district_slug
    UNION ALL
    SELECT 'UK-UT-T08' AS code, 'uttarkashi-purola' AS slug, 'Purola' AS name_en, 'पुरोला' AS name_hi, 'uttarkashi' AS district_slug
  ) t
  JOIN areas d ON d.slug = t.district_slug AND d.type = 'district'
-- Postgres's upsert refers to the rejected row as EXCLUDED rather than to the source
-- query's aliases, so the SET list cannot reference `t` or `d` here.
ON CONFLICT (type, code) DO UPDATE SET
  slug      = EXCLUDED.slug,
  name_en   = EXCLUDED.name_en,
  name_hi   = EXCLUDED.name_hi,
  parent_id = EXCLUDED.parent_id,
  division  = EXCLUDED.division;

-- ROLLBACK
-- DELETE FROM areas WHERE type = 'tehsil' AND code REGEXP '^UK-[A-Z]{2}-T[0-9]{2}$';
