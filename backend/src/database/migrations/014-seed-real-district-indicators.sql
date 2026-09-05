-- 014 — real district indicator values, replacing the synthetic demo figures.
--
-- Everything in this file was transcribed from a named published source and is stored at the
-- vintage the source DESCRIBES, never the date it was fetched (DS-2). Nothing here is
-- estimated, interpolated or filled in: an indicator with no published figure gets no row.
--
-- SOURCE 1 — Census of India 2011, final population totals, Uttarakhand.
--   Population, literacy rate and sex ratio for all 13 districts. Vintage is 2011-03-01,
--   the Census reference date, NOT the date of loading. VERIFICATION: the 13 district
--   populations here sum to exactly 10,086,292, the published Uttarakhand state total —
--   that check is the reason these figures are trusted rather than the page they came from.
--
-- SOURCE 2 — Uttarakhand Directorate of Economics & Statistics, "District Domestic Product
--   of Uttarakhand", Table L: Districtwise Per Capita Income, at current prices (per capita
--   NDDP), New Series base year 2011-12. Eleven vintages per district, 2011-12 to 2021-22,
--   giving the comparison and trend views real history instead of a single point.
--   2020-21 and 2021-22 are the report's own provisional estimates.
--
--   NOTE ON ACCURACY: these were read from the department's own PDF, not from press
--   coverage of it. A widely-syndicated news table of the same release prints Pithoragarh
--   as Rs 18,678 — a dropped digit; the department's figure is Rs 1,18,678.
--
-- DELIBERATELY ABSENT: schools, health facilities, industries, connectivity and tourism.
-- Those indicators still hold demo values because no per-district published figure has been
-- confirmed for them yet. They are left visibly synthetic rather than replaced with numbers
-- that merely look official — see indicators.md §9.

-- Census values. Vintage 2011-03-01 is the Census reference date.
INSERT INTO indicator_values (indicator_key, area_id, vintage, value, source_id, fetched_at)
SELECT v.indicator_key, a.id, v.vintage, v.value, s.id, UTC_TIMESTAMP()
  FROM (
    SELECT 'population'    AS indicator_key, 'almora' AS slug, DATE '2011-03-01' AS vintage, 622506 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'almora' AS slug, DATE '2011-03-01' AS vintage, 80.47 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'almora' AS slug, DATE '2011-03-01' AS vintage, 1139 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'bageshwar' AS slug, DATE '2011-03-01' AS vintage, 259898 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'bageshwar' AS slug, DATE '2011-03-01' AS vintage, 80.01 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'bageshwar' AS slug, DATE '2011-03-01' AS vintage, 1090 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'chamoli' AS slug, DATE '2011-03-01' AS vintage, 391605 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'chamoli' AS slug, DATE '2011-03-01' AS vintage, 82.65 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'chamoli' AS slug, DATE '2011-03-01' AS vintage, 1019 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'champawat' AS slug, DATE '2011-03-01' AS vintage, 259648 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'champawat' AS slug, DATE '2011-03-01' AS vintage, 79.83 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'champawat' AS slug, DATE '2011-03-01' AS vintage, 980 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'dehradun' AS slug, DATE '2011-03-01' AS vintage, 1696694 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'dehradun' AS slug, DATE '2011-03-01' AS vintage, 84.25 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'dehradun' AS slug, DATE '2011-03-01' AS vintage, 902 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'haridwar' AS slug, DATE '2011-03-01' AS vintage, 1890422 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'haridwar' AS slug, DATE '2011-03-01' AS vintage, 73.43 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'haridwar' AS slug, DATE '2011-03-01' AS vintage, 880 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'nainital' AS slug, DATE '2011-03-01' AS vintage, 954605 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'nainital' AS slug, DATE '2011-03-01' AS vintage, 83.88 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'nainital' AS slug, DATE '2011-03-01' AS vintage, 934 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'pauri-garhwal' AS slug, DATE '2011-03-01' AS vintage, 687271 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'pauri-garhwal' AS slug, DATE '2011-03-01' AS vintage, 82.02 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'pauri-garhwal' AS slug, DATE '2011-03-01' AS vintage, 1103 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'pithoragarh' AS slug, DATE '2011-03-01' AS vintage, 483439 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'pithoragarh' AS slug, DATE '2011-03-01' AS vintage, 82.25 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'pithoragarh' AS slug, DATE '2011-03-01' AS vintage, 1020 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'rudraprayag' AS slug, DATE '2011-03-01' AS vintage, 242285 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'rudraprayag' AS slug, DATE '2011-03-01' AS vintage, 81.3 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'rudraprayag' AS slug, DATE '2011-03-01' AS vintage, 1114 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'tehri-garhwal' AS slug, DATE '2011-03-01' AS vintage, 618931 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'tehri-garhwal' AS slug, DATE '2011-03-01' AS vintage, 76.36 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'tehri-garhwal' AS slug, DATE '2011-03-01' AS vintage, 1077 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'udham-singh-nagar' AS slug, DATE '2011-03-01' AS vintage, 1648902 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'udham-singh-nagar' AS slug, DATE '2011-03-01' AS vintage, 73.1 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'udham-singh-nagar' AS slug, DATE '2011-03-01' AS vintage, 920 AS value
    UNION ALL
    SELECT 'population'    AS indicator_key, 'uttarkashi' AS slug, DATE '2011-03-01' AS vintage, 330086 AS value
    UNION ALL
    SELECT 'literacy_rate' AS indicator_key, 'uttarkashi' AS slug, DATE '2011-03-01' AS vintage, 75.81 AS value
    UNION ALL
    SELECT 'sex_ratio'     AS indicator_key, 'uttarkashi' AS slug, DATE '2011-03-01' AS vintage, 958 AS value
  ) v
  JOIN areas a   ON a.slug = v.slug AND a.type = 'district'
  JOIN sources s ON s.source_key = 'census-2011'
ON DUPLICATE KEY UPDATE
  value = v.value, source_id = s.id, fetched_at = UTC_TIMESTAMP();

-- Per capita income. Vintage is the last day of the financial year the figure describes.
INSERT INTO indicator_values (indicator_key, area_id, vintage, value, source_id, fetched_at)
SELECT 'per_capita_income', a.id, v.vintage, v.value, s.id, UTC_TIMESTAMP()
  FROM (
    SELECT 'almora' AS slug, DATE '2012-03-31' AS vintage, 55640 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2013-03-31' AS vintage, 57606 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2014-03-31' AS vintage, 66811 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2015-03-31' AS vintage, 67146 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2016-03-31' AS vintage, 71077 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2017-03-31' AS vintage, 76042 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2018-03-31' AS vintage, 84412 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2019-03-31' AS vintage, 87147 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2020-03-31' AS vintage, 91224 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2021-03-31' AS vintage, 89767 AS value
    UNION ALL
    SELECT 'almora' AS slug, DATE '2022-03-31' AS vintage, 100844 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2012-03-31' AS vintage, 46457 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2013-03-31' AS vintage, 56210 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2014-03-31' AS vintage, 53996 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2015-03-31' AS vintage, 60478 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2016-03-31' AS vintage, 68153 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2017-03-31' AS vintage, 71591 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2018-03-31' AS vintage, 81019 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2019-03-31' AS vintage, 84060 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2020-03-31' AS vintage, 89782 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2021-03-31' AS vintage, 88724 AS value
    UNION ALL
    SELECT 'bageshwar' AS slug, DATE '2022-03-31' AS vintage, 98755 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2012-03-31' AS vintage, 64327 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2013-03-31' AS vintage, 73515 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2014-03-31' AS vintage, 75731 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2015-03-31' AS vintage, 77429 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2016-03-31' AS vintage, 75688 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2017-03-31' AS vintage, 83010 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2018-03-31' AS vintage, 93255 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2019-03-31' AS vintage, 107924 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2020-03-31' AS vintage, 117537 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2021-03-31' AS vintage, 108619 AS value
    UNION ALL
    SELECT 'chamoli' AS slug, DATE '2022-03-31' AS vintage, 127330 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2012-03-31' AS vintage, 52463 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2013-03-31' AS vintage, 51349 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2014-03-31' AS vintage, 61411 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2015-03-31' AS vintage, 67249 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2016-03-31' AS vintage, 75492 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2017-03-31' AS vintage, 78074 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2018-03-31' AS vintage, 91411 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2019-03-31' AS vintage, 92184 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2020-03-31' AS vintage, 97596 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2021-03-31' AS vintage, 100338 AS value
    UNION ALL
    SELECT 'champawat' AS slug, DATE '2022-03-31' AS vintage, 116136 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2012-03-31' AS vintage, 106552 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2013-03-31' AS vintage, 119629 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2014-03-31' AS vintage, 135183 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2015-03-31' AS vintage, 146072 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2016-03-31' AS vintage, 165585 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2017-03-31' AS vintage, 178785 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2018-03-31' AS vintage, 204893 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2019-03-31' AS vintage, 215545 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2020-03-31' AS vintage, 218869 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2021-03-31' AS vintage, 202185 AS value
    UNION ALL
    SELECT 'dehradun' AS slug, DATE '2022-03-31' AS vintage, 235707 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2012-03-31' AS vintage, 176845 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2013-03-31' AS vintage, 200847 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2014-03-31' AS vintage, 219944 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2015-03-31' AS vintage, 238777 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2016-03-31' AS vintage, 258272 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2017-03-31' AS vintage, 284717 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2018-03-31' AS vintage, 316979 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2019-03-31' AS vintage, 321830 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2020-03-31' AS vintage, 321750 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2021-03-31' AS vintage, 310296 AS value
    UNION ALL
    SELECT 'haridwar' AS slug, DATE '2022-03-31' AS vintage, 362688 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2012-03-31' AS vintage, 84142 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2013-03-31' AS vintage, 93820 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2014-03-31' AS vintage, 105415 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2015-03-31' AS vintage, 116848 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2016-03-31' AS vintage, 126804 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2017-03-31' AS vintage, 137060 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2018-03-31' AS vintage, 157828 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2019-03-31' AS vintage, 165688 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2020-03-31' AS vintage, 172338 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2021-03-31' AS vintage, 167762 AS value
    UNION ALL
    SELECT 'nainital' AS slug, DATE '2022-03-31' AS vintage, 190627 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2012-03-31' AS vintage, 50476 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2013-03-31' AS vintage, 57415 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2014-03-31' AS vintage, 70696 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2015-03-31' AS vintage, 67234 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2016-03-31' AS vintage, 72432 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2017-03-31' AS vintage, 77060 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2018-03-31' AS vintage, 87995 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2019-03-31' AS vintage, 89919 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2020-03-31' AS vintage, 94058 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2021-03-31' AS vintage, 96476 AS value
    UNION ALL
    SELECT 'pauri-garhwal' AS slug, DATE '2022-03-31' AS vintage, 108640 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2012-03-31' AS vintage, 52413 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2013-03-31' AS vintage, 56017 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2014-03-31' AS vintage, 67467 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2015-03-31' AS vintage, 66398 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2016-03-31' AS vintage, 73603 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2017-03-31' AS vintage, 81755 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2018-03-31' AS vintage, 94842 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2019-03-31' AS vintage, 99652 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2020-03-31' AS vintage, 105800 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2021-03-31' AS vintage, 103112 AS value
    UNION ALL
    SELECT 'pithoragarh' AS slug, DATE '2022-03-31' AS vintage, 118678 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2012-03-31' AS vintage, 46881 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2013-03-31' AS vintage, 47251 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2014-03-31' AS vintage, 58788 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2015-03-31' AS vintage, 65360 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2016-03-31' AS vintage, 58620 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2017-03-31' AS vintage, 64506 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2018-03-31' AS vintage, 72563 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2019-03-31' AS vintage, 76579 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2020-03-31' AS vintage, 79572 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2021-03-31' AS vintage, 82189 AS value
    UNION ALL
    SELECT 'rudraprayag' AS slug, DATE '2022-03-31' AS vintage, 93160 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2012-03-31' AS vintage, 49854 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2013-03-31' AS vintage, 59482 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2014-03-31' AS vintage, 64095 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2015-03-31' AS vintage, 65246 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2016-03-31' AS vintage, 70361 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2017-03-31' AS vintage, 77917 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2018-03-31' AS vintage, 91556 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2019-03-31' AS vintage, 90201 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2020-03-31' AS vintage, 92992 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2021-03-31' AS vintage, 91580 AS value
    UNION ALL
    SELECT 'tehri-garhwal' AS slug, DATE '2022-03-31' AS vintage, 103345 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2012-03-31' AS vintage, 127298 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2013-03-31' AS vintage, 146552 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2014-03-31' AS vintage, 162003 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2015-03-31' AS vintage, 178791 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2016-03-31' AS vintage, 196031 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2017-03-31' AS vintage, 213318 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2018-03-31' AS vintage, 231579 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2019-03-31' AS vintage, 235212 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2020-03-31' AS vintage, 239831 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2021-03-31' AS vintage, 236384 AS value
    UNION ALL
    SELECT 'udham-singh-nagar' AS slug, DATE '2022-03-31' AS vintage, 269070 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2012-03-31' AS vintage, 49584 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2013-03-31' AS vintage, 53607 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2014-03-31' AS vintage, 61762 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2015-03-31' AS vintage, 60422 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2016-03-31' AS vintage, 64556 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2017-03-31' AS vintage, 71589 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2018-03-31' AS vintage, 80629 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2019-03-31' AS vintage, 81095 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2020-03-31' AS vintage, 88409 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2021-03-31' AS vintage, 96166 AS value
    UNION ALL
    SELECT 'uttarkashi' AS slug, DATE '2022-03-31' AS vintage, 107281 AS value
  ) v
  JOIN areas a   ON a.slug = v.slug AND a.type = 'district'
  JOIN sources s ON s.source_key = 'uk-des-ddp'
ON DUPLICATE KEY UPDATE
  value = v.value, source_id = s.id, fetched_at = UTC_TIMESTAMP();

-- The demo figures for these four indicators are now superseded by published data. They are
-- removed rather than left in place: their 2015-2023 vintages are LATER than the Census
-- vintage, so "latest value" would keep returning the synthetic number.
DELETE iv FROM indicator_values iv
  JOIN sources s ON s.id = iv.source_id
 WHERE s.source_key = 'pahad-pulse-demo-data'
   AND iv.indicator_key IN ('population', 'literacy_rate', 'sex_ratio', 'per_capita_income');

-- ROLLBACK
-- DELETE iv FROM indicator_values iv JOIN sources s ON s.id = iv.source_id
--  WHERE s.source_key IN ('census-2011', 'uk-des-ddp');
