/**
 * Every word the app writes itself, in English.
 *
 * This file is the source of truth for the key set: `strings.hi.ts` is typed against it, so a
 * string added here without a Hindi translation fails `npm run typecheck`. That is the point —
 * a half-translated screen is worse than an untranslated one, because the reader cannot tell
 * which parts they can trust to be in their language.
 *
 * NOT here: anything the API publishes. District names, department names, indicator labels and
 * alert text arrive with their own `en`/`hi` pair and go through `localise()`. Government text
 * is never machine translated (ALR-2).
 *
 * Keys are `namespace.thing`, namespace matching the feature slice. `{placeholders}` are
 * substituted by `translate()`.
 */
export const en = {
  /* ── Shared ─────────────────────────────────────────────────────── */
  'common.loading': 'Loading',
  'common.tryAgain': 'Try again',
  'common.seeAll': 'See all',
  'common.done': 'Done',
  'common.close': 'Close',
  'common.nothingToShow': 'Nothing to show',
  'common.sourceNotRecorded': 'Source not recorded',
  'common.statewide': 'Statewide',

  /* ── Freshness ──────────────────────────────────────────────────── */
  'freshness.fresh': 'Up to date',
  'freshness.stale': 'May be out of date',
  'freshness.expired': 'Out of date',
  'freshness.unknown': 'Currency unknown',
  'source.openedInBrowser': 'Source: {department}. Opens in a browser.',
  'source.dataForRetrieved': 'Data for {vintage} · retrieved {fetched}',

  /* ── Error and empty states ─────────────────────────────────────── */
  'error.offline.title': 'No connection',
  'error.offline.message':
    'Showing nothing new until you are back online. Saved pages still work.',
  'error.timeout.title': 'The server is slow to answer',
  'error.timeout.message': 'The connection may be weak. Try again in a moment.',
  'error.notFound.title': 'Not found',
  'error.notFound.message': 'This page has no data yet. It may not have been published.',
  'error.invalidResponse.title': 'Unexpected data',
  'error.invalidResponse.message': '{detail} This is a bug on our side, not yours.',
  'error.generic.title': 'Could not load',
  'error.generic.message': 'An unexpected error occurred.',
  'error.savedData.title': 'Showing saved data',
  'error.savedData.checked': 'Could not refresh · last checked {when}',
  'error.savedData.noConnection': 'Could not refresh. Try again when you have a connection.',

  /* ── Navigation ─────────────────────────────────────────────────── */
  'nav.today': 'Today',
  'nav.map': 'Map',
  'nav.districts': 'Districts',
  'nav.alerts': 'Alerts',
  'nav.more': 'More',
  'nav.home': 'Home',
  'nav.back': 'Back',
  'nav.alert': 'Alert',
  'nav.roads': 'Roads & highways',
  'nav.tourism': 'Tourism & pilgrimage',
  'nav.connectivity': 'Internet connectivity',
  'nav.seismic': 'Seismic activity',
  'nav.airQuality': 'Air quality',
  'nav.compare': 'Compare districts',
  'nav.credits': 'Data credits',
  'nav.settings': 'Settings',
  'nav.notFound': 'Not found',

  /* ── Not found ──────────────────────────────────────────────────── */
  'notFound.title': 'That page does not exist',
  'notFound.message': 'The link may be out of date.',
  'notFound.goHome': 'Go to the home screen',
  'notFound.goToToday': 'Go to Today',

  /* ── More tab ───────────────────────────────────────────────────── */
  'more.title': 'More',
  'more.inTheApp': 'In the app',
  'more.districts.subtitle': 'All thirteen, with statistics and sources',
  'more.alerts.subtitle': 'Weather, river, road and disaster warnings',
  'more.map.subtitle': 'Districts, highways and alerts in relief',
  'more.tourism': 'Tourism',
  'more.tourism.subtitle': 'Published Char Dham arrivals by shrine and year',
  'more.compare': 'Compare Districts',
  'more.compare.subtitle': 'Compare ease of doing business across districts',
  'more.roads': 'Roads & Highways',
  'more.roads.subtitle': 'Recorded National and State Highway network',
  'more.connectivity': 'Connectivity',
  'more.connectivity.subtitle': 'Fixed and mobile network performance',
  'more.airQuality': 'Air quality',
  'more.airQuality.subtitle': 'National AQI and pollutants by district',
  'more.seismic': 'Seismic',
  'more.seismic.subtitle': 'Recent earthquake events',
  'more.settings.subtitle': 'Language, appearance and your data',
  'more.credits': 'Data and technology',
  'more.credits.subtitle': 'Where every figure and the map itself come from',

  /* ── Settings ───────────────────────────────────────────────────── */
  'settings.language': 'Language',
  'settings.language.subtitle': 'Applies to the app, and to names published in both languages',
  'settings.language.note':
    'Where a source publishes in one language only, that name is shown as published.',
  'settings.appearance': 'Appearance',
  'settings.theme.system': 'System',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.yourData': 'Your data',
  'settings.followed': 'Followed districts',
  'settings.followed.subtitle': 'Stored on this device only',
  'settings.reset': 'Reset preferences',
  'settings.reset.subtitle': 'Clears language, theme and followed districts',
  'settings.reset.confirmTitle': 'Reset preferences?',
  'settings.reset.confirmBody':
    'This clears your language, appearance and followed districts on this device.',
  'settings.reset.cancel': 'Cancel',
  'settings.reset.confirm': 'Reset',
  'settings.about': 'About',
  'settings.version': 'Version',
  'settings.api': 'API',
  'settings.webPortal': 'Web portal',
  'settings.support': 'Support',
  'settings.support.subtitle': 'Help, corrections and accessibility feedback',
  'settings.privacy': 'Privacy policy',
  'settings.privacy.subtitle': 'How Pahad Pulse handles information',
  'settings.disclaimer':
    'Pahad Pulse consolidates data published by Uttarakhand government departments. It does not author any figure. Where a source restricts redistribution, its data is shown in the app but not exported.',
  'settings.closeSettings': 'Close settings',

  /* ── Credits ────────────────────────────────────────────────────── */
  'credits.title': 'Data and technology',
  'credits.intro':
    'Every figure in this app is published by someone else, and this is who. Nothing here is authored by Pahad Pulse.',
  'credits.map.title': 'The map',
  'credits.map.subtitle': 'Keyless, and not Google Maps',
  'credits.figures.title': 'The figures',
  'credits.figures.subtitle': 'Departments that publish them',
  'credits.osm.detail':
    'District boundaries, and the highway numbers the NH and SH layers are matched on. Collected by OpenStreetMap contributors and queried through Overpass.',
  'credits.terrain.detail':
    'The elevation model behind the hillshade and the 3D view. Served from the AWS public dataset registry, originally from Mapzen.',
  'credits.openfreemap.detail': 'The vector basemap the districts and highways are drawn over.',
  'credits.maplibre.detail':
    'The renderer, used by both this app and the web portal so the two maps read the same way.',
  'credits.imd.detail': 'Weather warnings and disaster alerts, as published in CAP format.',
  'credits.openMeteo.detail':
    'Observations and forecasts for the station nearest each district.',
  'credits.licence.odbl': 'Open Database Licence (ODbL)',
  'credits.licence.publicDataset': 'Public dataset, keyless',
  'credits.licence.freeNoKey': 'Free, no API key',
  'credits.licence.bsd': 'BSD-3-Clause',
  'credits.licence.govIndia': 'Government of India',
  'credits.licence.nonCommercial': 'Free for non-commercial use',

  /* ── Today ──────────────────────────────────────────────────────── */
  'today.brand': 'PAHAD PULSE',
  'today.title': 'Today in Uttarakhand',
  'today.headerLabel': 'Pahad Pulse. Today in Uttarakhand',
  'today.openSettings': 'Open settings',
  'today.openSettings.hint': 'Opens language, appearance and app preferences',
  'today.activeAlerts': 'Active alerts',
  'today.severeOrWorse': '{count} severe or worse',
  'today.villages': '{count} villages',
  'today.glance.title': 'Uttarakhand at a glance',
  'today.glance.subtitle': 'Published state profile figures',
  'today.glance.loading': 'Loading state profile',
  'today.glance.empty': 'No state profile figures',
  'today.following.title': 'Following',
  'today.following.subtitle': 'Districts you saved',
  'today.following.manage': 'Manage',
  'today.follow.title': 'Follow a district',
  'today.follow.body': 'Saved districts appear here with their weather and alerts.',
  'today.follow.browse': 'Browse',
  'today.follow.browseLabel': 'Browse districts',
  'today.alerts.title': 'Latest alerts',
  'today.alerts.subtitle': 'Issued by IMD, CWC and district administrations',
  'today.alerts.loading': 'Loading alerts',
  'today.alerts.empty': 'No active alerts',
  'today.alerts.emptyMessage': 'Nothing is in force across the state right now.',
  'today.districts.subtitle': 'Open one for its statistics and sources',
  'today.districts.loading': 'Loading districts',
  'today.districts.empty': 'No districts loaded',
  'today.explore.title': 'Explore',
  'today.explore.subtitle': 'More state intelligence',
  'today.explore.tourism': 'Tourism',
  'today.explore.business': 'Ease of Biz',
  'today.explore.compare': 'Compare',
  'today.explore.connectivity': 'Connectivity',
  'today.explore.network': 'Network',
  'today.explore.roads': 'Roads',
  'today.explore.highways': 'Highways',
  'today.promise':
    'Pahad Pulse does not author data. Every figure shows the department that published it, the date it describes, and how fresh it is.',

  /* ── Alert vocabulary (data encodings, shown as words) ──────────── */
  'severity.minor': 'Minor',
  'severity.moderate': 'Moderate',
  'severity.severe': 'Severe',
  'severity.extreme': 'Extreme',
  'severity.unknown': 'Unknown',
  'alertType.all': 'All',
  'alertType.weather': 'Weather',
  'alertType.river': 'River',
  'alertType.flood': 'Flood',
  'alertType.road': 'Road',
  'alertType.disaster': 'Disaster',

  /* ── Alerts ─────────────────────────────────────────────────────── */
  'alerts.inForce': '{count} in force',
  'alerts.savedActive': '{count} saved, in force when last checked',
  'alerts.savedTitle': 'Showing saved alerts',
  'alerts.savedPullDown': 'Could not refresh. Pull down to try again.',
  'alerts.empty.all': 'No active alerts',
  'alerts.empty.filtered': 'No {type} alerts',
  'alerts.empty.allMessage': 'Nothing is in force across Uttarakhand right now.',
  'alerts.empty.filteredMessage': 'Try another category, or pull down to refresh.',
  'alerts.card.label': '{severity} {type} alert. {headline}. Affects {areas}.',
  'alerts.card.areasMore': '{areas} +{count}',

  /* ── Districts ──────────────────────────────────────────────────── */
  'districts.search': 'Search {count} districts',
  'districts.searchLabel': 'Search districts',
  'districts.clearSearch': 'Clear search',
  'districts.noMatch': 'No district matches that',
  'districts.noMatchMessage': 'Nothing found for "{query}". Try part of the name.',
  'districts.countOf': '{shown} of {total} districts',
  'districts.cardLabel': '{name} district',
  'districts.counts': '{tehsils} tehsils · {villages} villages',
  'districts.follow': 'Follow {name}',
  'districts.unfollow': 'Unfollow {name}',
  'districts.division': '{division} division',
  'districts.tileLabel': '{name}, {degrees} degrees',
  'districts.noStation': 'No station',

  /* ── Alert lifecycle vocabulary ─────────────────────────────────── */
  'urgency.unknown': 'Urgency unknown',
  'urgency.immediate': 'Immediate',
  'urgency.expected': 'Expected',
  'urgency.future': 'Future',
  'urgency.past': 'Past',
  'certainty.unknown': 'Certainty unknown',
  'certainty.observed': 'Observed',
  'certainty.likely': 'Likely',
  'certainty.possible': 'Possible',
  'certainty.unlikely': 'Unlikely',

  /* ── Alert detail ───────────────────────────────────────────────── */
  'alertDetail.meta': '{type} · {urgency} · {certainty}',
  'alertDetail.issued': 'Issued',
  'alertDetail.inForceFrom': 'In force from',
  'alertDetail.expires': 'Expires',
  'alertDetail.authority': 'Authority',
  'alertDetail.affectedAreas': 'Affected areas',
  'alertDetail.openArea': 'Open {name}',
  'alertDetail.originalNotice': 'Read the original notice',
  'alertDetail.originalNoticeLabel': 'Open the original notice',
  'alertDetail.dateTime': '{date}, {time}',

  /* ── District detail ────────────────────────────────────────────── */
  'districtDetail.loading': 'Loading {name}',
  'districtDetail.hq': 'HQ {name}',
  'districtDetail.noBoundary': 'No map boundary',
  'districtDetail.weather': 'Weather',
  'districtDetail.weather.subtitle': 'Nearest observation station',
  'districtDetail.weather.loading': 'Loading weather',
  'districtDetail.alerts.subtitle': 'Warnings in force for {name}',
  'districtDetail.alerts.empty': 'No warnings are in force for this district right now.',
  'districtDetail.stats': 'Statistics',
  'districtDetail.stats.subtitle': 'Every figure carries its source',
  'districtDetail.stats.loading': 'Loading statistics',
  'districtDetail.stats.empty': 'No published figures',
  'districtDetail.stats.emptyMessage': 'Nothing has been published for this district yet.',
  'districtDetail.connectivity': 'Connectivity',
  'districtDetail.connectivity.subtitle': 'Measured Speedtest performance',

  /* ── Weather ────────────────────────────────────────────────────── */
  'weather.rain': 'Rain',
  'weather.humidity': 'Humidity',
  'weather.wind': 'Wind',
  'weather.nextDays': 'NEXT {count} DAYS',

  /* ── Map ────────────────────────────────────────────────────────── */
  'map.layer.districts': 'Districts',
  'map.layer.alerts': 'Alerts',
  'map.layer.highways': 'Highways',
  'map.loading': 'Loading the map',
  'map.drawing': 'Drawing the terrain',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',
  'map.fitState': 'Fit the whole state',
  'map.credits': 'Map sources and credits',
  'map.creditsTitle': 'Map sources',
  'map.creditsClose': 'Close map sources',
  'map.creditsBody':
    'District boundaries and highway numbers come from OpenStreetMap. Elevation is from the AWS Terrain Tiles public dataset. Nothing on this map requires an API key.',
  'map.label':
    'Interactive map of Uttarakhand with {count} districts. Use the Districts tab for an accessible list of every district.',

  'alertDetail.whatToDo': 'WHAT TO DO',
  'alertDetail.dateTimeRelative': '{date}, {time} ({relative})',

  'districtDetail.connectivity.loading': 'Loading connectivity',
  'districtDetail.connectivity.empty': 'No network measurements',
  'districtDetail.connectivity.emptyMessage':
    'No Speedtest measurements were recorded for this district in the latest quarter.',
  'districtDetail.tehsils': 'Tehsils',
  'districtDetail.tehsils.subtitle': '{count} in this district',
  'districtDetail.tehsils.empty': 'No tehsils recorded',
  'districtDetail.villages': '{count} villages',

  /* ── Air quality ────────────────────────────────────────────────── */
  'air.loading': 'Loading air quality',
  'air.empty': 'No air-quality readings',
  'air.emptyMessage': 'Readings arrive with the hourly ingestion run.',
  'air.missing': ' · {count} missing',
  'air.byDistrict': 'By district',
  'air.byDistrict.subtitle': 'National AQI, PM2.5 and PM10',
  'air.observed': 'Observed {when}',
  'air.caveat':
    'These are modelled estimates covering district headquarters, not readings from a reference-grade ground monitor. CPCB figures are authoritative where available.',
  'air.rivers': 'River levels are not published here yet.',

  /* ── Connectivity ───────────────────────────────────────────────── */
  'net.loading': 'Loading network data',
  'net.empty': 'No network measurements',
  'net.spread': 'State spread',
  'net.spread.subtitle': 'Measurements for {quarter}',
  'net.spreadRatio': '{ratio}× spread',
  'net.ranking': 'District ranking',
  'net.ranking.subtitle': 'Download, upload, latency and sample size',
  'net.fixed': 'Fixed broadband',
  'net.mobile': 'Mobile',
  'net.thinSample': 'Thin sample',
  'net.howToRead': 'How to read this',
  'net.caveat':
    'These figures show what people who ran Speedtest actually received. They do not say whether every village has a connection.',
  'net.caveatLong':
    'Speed tests are self-selected, so they compare measured performance—not universal access. A thin sample should be read cautiously. BharatNet readiness and operator coverage are not loaded yet.',

  /* ── Roads ──────────────────────────────────────────────────────── */
  'roads.notOpenStatus': 'This does not show whether a road is open.',
  'roads.loading': 'Loading road network',
  'roads.empty': 'No road data',
  'roads.register': 'Highway register',
  'roads.register.subtitle': 'Reference and mapped segment count',
  'roads.national': 'National ({count})',
  'roads.state': 'State ({count})',
  'roads.openMap': 'Open highway map',
  'roads.networkRead': ' Network read {date}.',

  /* ── Seismic ────────────────────────────────────────────────────── */
  'seismic.loading': 'Loading seismic data',
  'seismic.events': 'Recorded events',
  'seismic.events.subtitle': 'Magnitude, time, depth and review status',
  'seismic.empty': 'No recent events',
  'seismic.largest': '; largest M{magnitude} near {place}',
  'seismic.depth': '{depth} km deep',
  'seismic.openRecord': 'Open source record for magnitude {magnitude} earthquake',
  'seismic.caveat':
    'These events have already happened. Earthquakes cannot be predicted, and automatic solutions may be revised.',

  /* ── Tourism ────────────────────────────────────────────────────── */
  'tourism.loading': 'Loading pilgrim arrivals',
  'tourism.empty': 'No pilgrim figures',
  'tourism.touristsIn': 'Tourists in {year}',
  'tourism.acrossDestinations': '{count} across listed destinations (Ongoing)',
  'tourism.record': '{count} (All-time record)',
  'tourism.byDestination': 'Arrivals by destination',
  'tourism.selectYear': 'Select a published year',
  'tourism.tentative': 'Tentative Data',
  'tourism.total': 'Listed destinations total',
  'tourism.caveat':
    'These are yearly totals published by the state tourism department. They do not describe how busy a shrine is at this moment.',
  'tourism.ongoing':
    'The 2026 Yatra is currently ongoing. These figures represent the latest available estimates and are not final.',
  'tourism.suspended':
    'The suspended and capped seasons are shown as published rather than smoothed; the fall is historical, not missing data.',

  /* ── Compare districts ──────────────────────────────────────────── */
  'compare.metric.connectivity': 'Digital Connectivity',
  'compare.metric.tourism': 'Tourism Footfall',
  'compare.metric.roads': 'Road Infrastructure',
  'compare.metric.urbanPopulation': 'Urban Market Size',
  'compare.metric.agriculture': 'Agro/Dairy Output',
  'compare.metric.safety': 'Geological Safety',
  'compare.choicesHint': 'Opens a list of choices',
  'compare.select': 'Select...',
  'compare.whatBusiness': 'What business are you planning?',
  'compare.districtA': 'Compare',
  'compare.districtB': 'With',
  'compare.vs': 'VS',
  'compare.sameDistrict': 'Choose two different districts.',
  'compare.run': 'Compare',
  'compare.runHint': 'Builds a side-by-side district recommendation',
  'compare.scenariosFailed': 'Business types could not be loaded.',
  'compare.retryScenarios': 'Retry loading business types',
  'compare.failed': 'Failed to load comparison.',
  'compare.tie': 'It’s a tie!',
  'compare.recommended': '{name} is recommended',
  'compare.closeChoices': 'Close {label} choices',

  /* ── Small labels (shown uppercase in English) ──────────────────── */
  'air.statePicture': 'STATE PICTURE',
  'air.dominant': 'DOMINANT',
  'districtDetail.download': 'DOWNLOAD',
  'districtDetail.upload': 'UPLOAD',
  'districtDetail.latency': 'LATENCY',
  'districtDetail.lgdCode': 'LGD CODE',
  'districtDetail.tehsilsUpper': 'TEHSILS',
  'districtDetail.stillCompiling': 'STILL BEING COMPILED',
  'districtDetail.notCoverage': 'Measured results are not a coverage map or advertised speed.',
  'roads.nationalUpper': 'NATIONAL HIGHWAYS',
  'roads.stateUpper': 'STATE HIGHWAYS',
  'seismic.last30Days': 'LAST 30 DAYS',
  'seismic.openEventRecord': 'Open event record',
} as const;
