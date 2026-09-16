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
} as const;
