import { ok } from 'neverthrow';

import * as about from './resolvers/about.js';
import * as guide from './resolvers/guide.js';
import * as profile from './resolvers/profile.js';
import * as safety from './resolvers/safety.js';
import * as travel from './resolvers/travel.js';
import * as weather from './resolvers/weather.js';
import type { Category, CategoryId, Question, ResolverParams } from './types.js';

/**
 * The questions "Ask Pahad Pulse" can answer, and nothing else (project/modules/assistant.md
 * §3). Every figure an answer states comes from its resolver; a template holds words only
 * (AST-1). Adding a question: it must resolve through an existing controller, name its
 * source, and have follow-ups. The catalogue test enforces the mechanical parts.
 */

export const CATEGORIES: readonly Category[] = [
  { id: 'safety', label: { en: 'Safety now', hi: 'अभी की सुरक्षा' }, icon: 'warning' },
  { id: 'weather', label: { en: 'Weather & air', hi: 'मौसम व हवा' }, icon: 'partly-sunny' },
  { id: 'travel', label: { en: 'Roads & travel', hi: 'सड़क व यात्रा' }, icon: 'car' },
  {
    id: 'tourism',
    label: { en: 'Char Dham & tourism', hi: 'चारधाम व पर्यटन' },
    icon: 'trail-sign',
  },
  { id: 'districts', label: { en: 'Districts', hi: 'ज़िले' }, icon: 'business' },
  { id: 'state', label: { en: 'Uttarakhand profile', hi: 'उत्तराखंड परिचय' }, icon: 'map' },
  { id: 'connectivity', label: { en: 'Internet', hi: 'इंटरनेट' }, icon: 'cellular' },
  { id: 'budget', label: { en: 'Budget', hi: 'बजट' }, icon: 'cash' },
  { id: 'tools', label: { en: 'Pahad Pulse tools', hi: 'Pahad Pulse टूल' }, icon: 'construct' },
  { id: 'data', label: { en: 'Data & sources', hi: 'डेटा व स्रोत' }, icon: 'shield-checkmark' },
  {
    id: 'about',
    label: { en: 'About Pahad Pulse', hi: 'Pahad Pulse के बारे में' },
    icon: 'information-circle',
  },
];

const D = ['district'] as const;
const P = ['place'] as const;
const NONE = [] as const;

const to = (path: string) => () => path;
const toDistrict = ({ district }: ResolverParams) =>
  district === undefined ? '/districts' : `/districts/${district.slug}`;

/** Closing line for every safety answer (AST-4): the authorities, not this app, decide. */
const AUTHORITY = {
  en: ' Follow instructions from the district administration. In an emergency, call 112.',
  hi: ' ज़िला प्रशासन के निर्देशों का पालन करें। आपात स्थिति में 112 पर कॉल करें।',
};

export const QUESTIONS: readonly Question[] = [
  // ── Safety now ─────────────────────────────────────────────────────────────────────────
  {
    id: 'alerts.active',
    category: 'safety',
    text: { en: 'Are there any active warnings right now?', hi: 'क्या अभी कोई चेतावनी जारी है?' },
    params: NONE,
    keywords: ['warning', 'warnings', 'alert', 'alerts', 'active', 'chetavani', 'चेतावनी', 'अलर्ट'],
    resolver: safety.alertsActive,
    templates: {
      ok: {
        en:
          'There are {count} active warnings in Uttarakhand right now ({breakdown}).' +
          AUTHORITY.en,
        hi: 'उत्तराखंड में अभी {count} चेतावनियाँ सक्रिय हैं ({breakdown})।' + AUTHORITY.hi,
      },
      empty: {
        en: 'There are no active warnings for Uttarakhand right now.',
        hi: 'अभी उत्तराखंड के लिए कोई सक्रिय चेतावनी नहीं है।',
      },
    },
    followUps: ['alerts.district', 'alerts.recent', 'fires.state'],
    cacheClass: 'live',
    route: to('/alerts'),
  },
  {
    id: 'alerts.district',
    category: 'safety',
    text: {
      en: 'Are there warnings for {district}?',
      hi: 'क्या {district} के लिए कोई चेतावनी है?',
    },
    params: D,
    keywords: ['warning', 'warnings', 'alert', 'alerts', 'chetavani', 'चेतावनी', 'अलर्ट'],
    resolver: safety.alertsDistrict,
    templates: {
      ok: {
        en: '{district} has {count} active warnings ({breakdown}).' + AUTHORITY.en,
        hi: '{district} के लिए {count} चेतावनियाँ सक्रिय हैं ({breakdown})।' + AUTHORITY.hi,
      },
      empty: {
        en: 'There are no active warnings for {district} right now.',
        hi: 'अभी {district} के लिए कोई सक्रिय चेतावनी नहीं है।',
      },
    },
    followUps: ['weather.now', 'travel.check', 'fires.district'],
    cacheClass: 'live',
    route: toDistrict,
  },
  {
    id: 'alerts.recent',
    category: 'safety',
    text: {
      en: 'Which warnings ended in the last 48 hours?',
      hi: 'पिछले 48 घंटों में कौन-सी चेतावनियाँ समाप्त हुईं?',
    },
    params: NONE,
    keywords: ['recent', 'expired', 'ended', 'lapsed', 'purani', 'पिछली', 'समाप्त'],
    resolver: safety.alertsRecent,
    templates: {
      ok: {
        en: '{count} warnings lapsed in the last 48 hours. These are no longer in force.',
        hi: 'पिछले 48 घंटों में {count} चेतावनियाँ समाप्त हुईं। ये अब लागू नहीं हैं।',
      },
      empty: {
        en: 'No warnings lapsed in the last 48 hours.',
        hi: 'पिछले 48 घंटों में कोई चेतावनी समाप्त नहीं हुई।',
      },
    },
    followUps: ['alerts.active', 'quakes.recent'],
    cacheClass: 'live',
    route: to('/alerts'),
  },
  {
    id: 'fires.state',
    category: 'safety',
    text: {
      en: 'Have satellites detected any fires recently?',
      hi: 'क्या हाल में उपग्रहों ने कहीं आग देखी है?',
    },
    params: NONE,
    keywords: [
      'fire',
      'fires',
      'forest fire',
      'wildfire',
      'jungle',
      'aag',
      'dawanal',
      'आग',
      'दावानल',
      'जंगल',
    ],
    resolver: safety.firesState,
    templates: {
      ok: {
        en:
          'NASA satellites recorded {count} heat signatures in Uttarakhand in the last {hours} hours, most in {top}. The latest pass was at {latest}. A detection may be a forest fire or a controlled burn and is not confirmed on the ground.' +
          AUTHORITY.en,
        hi:
          'पिछले {hours} घंटों में नासा उपग्रहों ने उत्तराखंड में {count} जगह असामान्य गर्मी दर्ज की, सबसे अधिक {top} में। अंतिम दर्ज समय {latest}। यह जंगल की आग या नियंत्रित जलाना हो सकता है, ज़मीन पर पुष्टि नहीं हुई है।' +
          AUTHORITY.hi,
      },
      empty: {
        en: 'NASA satellites recorded no fire detections in Uttarakhand in the last {hours} hours.',
        hi: 'पिछले {hours} घंटों में नासा उपग्रहों ने उत्तराखंड में आग का कोई संकेत दर्ज नहीं किया।',
      },
    },
    followUps: ['fires.district', 'alerts.active'],
    cacheClass: 'live',
    route: to('/map'),
  },
  {
    id: 'fires.district',
    category: 'safety',
    text: {
      en: 'Any fire detections in {district}?',
      hi: 'क्या {district} में आग का कोई संकेत है?',
    },
    params: D,
    keywords: ['fire', 'fires', 'forest fire', 'wildfire', 'aag', 'आग', 'दावानल'],
    resolver: safety.firesDistrict,
    templates: {
      ok: {
        en:
          'NASA satellites recorded {count} heat signatures in {district} in the last {hours} hours; the latest at {latest}. It may be a forest fire or a controlled burn and is not confirmed on the ground.' +
          AUTHORITY.en,
        hi:
          'पिछले {hours} घंटों में नासा उपग्रहों ने {district} में {count} जगह असामान्य गर्मी दर्ज की; अंतिम {latest}। यह जंगल की आग या नियंत्रित जलाना हो सकता है, ज़मीन पर पुष्टि नहीं हुई है।' +
          AUTHORITY.hi,
      },
      empty: {
        en: 'No satellite fire detections in {district} in the last {hours} hours.',
        hi: 'पिछले {hours} घंटों में {district} में उपग्रह से आग का कोई संकेत नहीं मिला।',
      },
    },
    followUps: ['alerts.district', 'air.district', 'travel.check'],
    cacheClass: 'live',
    route: to('/map'),
  },
  {
    id: 'quakes.recent',
    category: 'safety',
    text: { en: 'Were there any earthquakes recently?', hi: 'क्या हाल में कोई भूकंप आया?' },
    params: NONE,
    keywords: [
      'earthquake',
      'earthquakes',
      'quake',
      'tremor',
      'bhukamp',
      'bhookamp',
      'भूकंप',
      'झटके',
    ],
    resolver: safety.quakesRecent,
    templates: {
      ok: {
        en: '{count} earthquakes were recorded in and around Uttarakhand in the last 30 days. The latest was magnitude {magnitude}, {place}, on {when}.',
        hi: 'पिछले 30 दिनों में उत्तराखंड और आसपास {count} भूकंप दर्ज हुए। सबसे हाल का {when} को, तीव्रता {magnitude}, {place}।',
      },
      empty: {
        en: 'No earthquakes were recorded in and around Uttarakhand in the last 30 days.',
        hi: 'पिछले 30 दिनों में उत्तराखंड और आसपास कोई भूकंप दर्ज नहीं हुआ।',
      },
    },
    followUps: ['quakes.largest', 'alerts.active'],
    cacheClass: 'live',
    route: to('/seismic'),
  },
  {
    id: 'quakes.largest',
    category: 'safety',
    text: {
      en: 'What was the largest recent earthquake?',
      hi: 'हाल का सबसे बड़ा भूकंप कौन-सा था?',
    },
    params: NONE,
    keywords: [
      'largest earthquake',
      'biggest earthquake',
      'strongest',
      'magnitude',
      'sabse bada bhukamp',
      'सबसे बड़ा भूकंप',
    ],
    resolver: safety.quakesLargest,
    templates: {
      ok: {
        en: 'The largest of the recent earthquakes was magnitude {magnitude}, {place}, on {when}, at a depth of about {depth} km.',
        hi: 'हाल के भूकंपों में सबसे बड़ा {when} को आया, तीव्रता {magnitude}, {place}, गहराई लगभग {depth} किमी।',
      },
      empty: {
        en: 'No recent earthquakes are recorded for Uttarakhand.',
        hi: 'उत्तराखंड के लिए हाल का कोई भूकंप दर्ज नहीं है।',
      },
    },
    followUps: ['quakes.recent'],
    cacheClass: 'live',
    route: to('/seismic'),
  },

  // ── Weather & air ──────────────────────────────────────────────────────────────────────
  {
    id: 'weather.now',
    category: 'weather',
    text: {
      en: "What's the weather in {district} right now?",
      hi: '{district} में अभी मौसम कैसा है?',
    },
    params: D,
    keywords: ['weather', 'temperature', 'mausam', 'garmi', 'thand', 'मौसम', 'तापमान'],
    resolver: weather.weatherNow,
    templates: {
      ok: {
        en: 'In {district} it was {temperature}°C and {condition} at {when}.',
        hi: '{district} में {when} पर तापमान {temperature}°C था, मौसम: {condition}।',
      },
    },
    followUps: ['weather.rain', 'air.district', 'travel.check'],
    cacheClass: 'live',
    route: toDistrict,
  },
  {
    id: 'weather.rain',
    category: 'weather',
    text: {
      en: 'Will it rain in {district} in the next few days?',
      hi: 'क्या अगले कुछ दिनों में {district} में बारिश होगी?',
    },
    params: D,
    keywords: [
      'rain',
      'raining',
      'forecast',
      'baarish',
      'barish',
      'barsaat',
      'बारिश',
      'वर्षा',
      'पूर्वानुमान',
    ],
    resolver: weather.weatherRain,
    templates: {
      ok: {
        en: 'Rain is forecast in {district} on {wetDays}, up to {wettest} mm in a day. Check warnings before you travel.',
        hi: '{district} में {wetDays} को बारिश का पूर्वानुमान है, एक दिन में {wettest} मिमी तक। यात्रा से पहले चेतावनियाँ देखें।',
      },
      empty: {
        en: 'No significant rain is forecast in {district} over the next {days} days.',
        hi: 'अगले {days} दिनों में {district} में उल्लेखनीय बारिश का पूर्वानुमान नहीं है।',
      },
    },
    followUps: ['alerts.district', 'weather.now', 'roads.district'],
    cacheClass: 'live',
    route: toDistrict,
  },
  {
    id: 'air.district',
    category: 'weather',
    text: {
      en: 'How is the air quality in {district}?',
      hi: '{district} में हवा की गुणवत्ता कैसी है?',
    },
    params: D,
    keywords: ['air', 'aqi', 'pollution', 'smoke', 'hawa', 'pradushan', 'हवा', 'प्रदूषण', 'धुआँ'],
    resolver: weather.airDistrict,
    templates: {
      ok: {
        en: "{district}'s air quality index was {aqi} ({band}) at {when}, on India's national AQI scale.",
        hi: '{when} पर {district} का वायु गुणवत्ता सूचकांक {aqi} ({band}) था, भारत के राष्ट्रीय AQI पैमाने पर।',
      },
    },
    followUps: ['air.worst', 'fires.district', 'weather.now'],
    cacheClass: 'live',
    route: to('/air-quality'),
  },
  {
    id: 'air.worst',
    category: 'weather',
    text: {
      en: 'Which district has the worst air today?',
      hi: 'आज किस ज़िले की हवा सबसे ख़राब है?',
    },
    params: NONE,
    keywords: ['worst air', 'most polluted', 'polluted', 'kharab', 'ख़राब', 'प्रदूषित'],
    resolver: weather.airWorst,
    templates: {
      ok: {
        en: '{district} has the highest air quality index of the {rated} districts rated: {aqi} ({band}).',
        hi: 'जिन {rated} ज़िलों का सूचकांक उपलब्ध है, उनमें {district} का AQI सबसे अधिक है: {aqi} ({band})।',
      },
    },
    followUps: ['air.best', 'fires.state'],
    cacheClass: 'live',
    route: to('/air-quality'),
  },
  {
    id: 'air.best',
    category: 'weather',
    text: {
      en: 'Which district has the cleanest air today?',
      hi: 'आज किस ज़िले की हवा सबसे साफ़ है?',
    },
    params: NONE,
    keywords: ['cleanest', 'clean air', 'fresh air', 'saaf', 'साफ़', 'स्वच्छ'],
    resolver: weather.airBest,
    templates: {
      ok: {
        en: '{district} has the lowest air quality index of the {rated} districts rated: {aqi} ({band}).',
        hi: 'जिन {rated} ज़िलों का सूचकांक उपलब्ध है, उनमें {district} का AQI सबसे कम है: {aqi} ({band})।',
      },
    },
    followUps: ['air.worst', 'air.district'],
    cacheClass: 'live',
    route: to('/air-quality'),
  },

  // ── Roads & travel ─────────────────────────────────────────────────────────────────────
  {
    id: 'roads.closed',
    category: 'travel',
    text: { en: 'Which roads are closed right now?', hi: 'अभी कौन-सी सड़कें बंद हैं?' },
    params: NONE,
    keywords: [
      'road',
      'roads',
      'closed',
      'blocked',
      'landslide',
      'sadak',
      'band',
      'सड़क',
      'बंद',
      'भूस्खलन',
    ],
    resolver: travel.roadsClosed,
    templates: {
      ok: {
        en: '{count} road closures are reported to PWD Uttarakhand, including {roads}. For current status call {helpline}.',
        hi: 'PWD उत्तराखंड को {count} सड़कें बंद दर्ज हैं, जिनमें {roads}। ताज़ा स्थिति के लिए {helpline} पर कॉल करें।',
      },
      empty: {
        en: 'No road closures are currently reported to PWD Uttarakhand. Conditions change fast; call {helpline} before you travel.',
        hi: 'अभी PWD उत्तराखंड को कोई सड़क बंद दर्ज नहीं है। हालात जल्दी बदलते हैं; यात्रा से पहले {helpline} पर कॉल करें।',
      },
      unavailable: {
        en: "Road closure data isn't shown in Pahad Pulse yet. For current road status call {helpline}.",
        hi: 'सड़क बंद होने की जानकारी अभी Pahad Pulse में उपलब्ध नहीं है। ताज़ा स्थिति के लिए {helpline} पर कॉल करें।',
      },
    },
    followUps: ['roads.district', 'travel.check', 'roads.helpline'],
    cacheClass: 'live',
    route: to('/roads'),
  },
  {
    id: 'roads.district',
    category: 'travel',
    text: { en: 'Are any roads closed in {district}?', hi: 'क्या {district} में कोई सड़क बंद है?' },
    params: D,
    keywords: ['road', 'roads', 'closed', 'blocked', 'landslide', 'sadak', 'band', 'सड़क', 'बंद'],
    resolver: travel.roadsDistrict,
    templates: {
      ok: {
        en: '{count} road closures are reported to PWD in {district}, including {roads}. For current status call {helpline}.',
        hi: '{district} में PWD को {count} सड़कें बंद दर्ज हैं, जिनमें {roads}। ताज़ा स्थिति के लिए {helpline} पर कॉल करें।',
      },
      empty: {
        en: 'No road closures are currently reported to PWD in {district}. Call {helpline} before you travel.',
        hi: 'अभी {district} में PWD को कोई सड़क बंद दर्ज नहीं है। यात्रा से पहले {helpline} पर कॉल करें।',
      },
      unavailable: {
        en: "Road closure data isn't shown in Pahad Pulse yet. For roads in {district}, call {helpline}.",
        hi: 'सड़क बंद होने की जानकारी अभी Pahad Pulse में उपलब्ध नहीं है। {district} की सड़कों के लिए {helpline} पर कॉल करें।',
      },
    },
    followUps: ['travel.check', 'weather.rain', 'alerts.district'],
    cacheClass: 'live',
    route: to('/roads'),
  },
  {
    id: 'roads.helpline',
    category: 'travel',
    text: { en: 'Who do I call for road status?', hi: 'सड़क की स्थिति के लिए किसे कॉल करें?' },
    params: NONE,
    keywords: [
      'helpline',
      'call',
      'number',
      'phone',
      'contact',
      'emergency',
      'हेल्पलाइन',
      'नंबर',
      'फ़ोन',
    ],
    resolver: travel.roadsHelpline,
    templates: {
      ok: {
        en: 'For road and yatra status call {helpline}. In an emergency call {emergency}.',
        hi: 'सड़क व यात्रा की स्थिति के लिए {helpline} पर कॉल करें। आपात स्थिति में {emergency} पर कॉल करें।',
      },
    },
    followUps: ['roads.closed', 'travel.check'],
    cacheClass: 'reference',
    route: () => null,
  },
  {
    id: 'travel.check',
    category: 'travel',
    text: {
      en: 'What should I check before travelling to {district}?',
      hi: '{district} जाने से पहले क्या देखना चाहिए?',
    },
    params: D,
    keywords: [
      'travel',
      'trip',
      'going',
      'visit',
      'safe',
      'plan',
      'journey',
      'jana',
      'यात्रा',
      'जाना',
      'सुरक्षित',
    ],
    resolver: travel.travelCheck,
    templates: {
      ok: {
        en: 'What Pahad Pulse shows for {district} now. Warnings: {alerts}. Weather: {weather}. Satellite fire detections: {fires}. Roads: {roads}. For road status call {helpline}; in an emergency call {emergency}. These are signals, not advice on whether to travel.',
        hi: '{district} के लिए Pahad Pulse में अभी यह दिख रहा है। चेतावनियाँ: {alerts}। मौसम: {weather}। उपग्रह से आग के संकेत: {fires}। सड़कें: {roads}। सड़क की स्थिति के लिए {helpline}; आपात स्थिति में {emergency} पर कॉल करें। यह केवल संकेत हैं, यात्रा करने या न करने की सलाह नहीं।',
      },
    },
    followUps: ['weather.rain', 'travel.network', 'roads.helpline'],
    cacheClass: 'live',
    route: to('/trip-check'),
  },
  {
    id: 'travel.network',
    category: 'travel',
    text: {
      en: 'Will my phone have internet in {district}?',
      hi: 'क्या {district} में फ़ोन पर इंटरनेट चलेगा?',
    },
    params: D,
    keywords: [
      'phone',
      'signal',
      'network',
      'mobile',
      'internet',
      'data',
      '4g',
      '5g',
      'नेटवर्क',
      'सिग्नल',
    ],
    resolver: travel.networkDistrict,
    templates: {
      ok: {
        en: 'Mobile speed tests in {district} measured a median {download} Mbps download ({tests} tests, quarter from {quarter}). That is an average for the district; coverage in remote valleys can be much weaker.',
        hi: '{district} में मोबाइल स्पीड टेस्ट में औसत डाउनलोड {download} Mbps रहा ({tests} टेस्ट, {quarter} से शुरू तिमाही)। यह ज़िले का औसत है; दूर की घाटियों में नेटवर्क काफ़ी कमज़ोर हो सकता है।',
      },
      empty: {
        en: 'No mobile speed tests were recorded in {district} in the latest quarter.',
        hi: 'पिछली तिमाही में {district} में कोई मोबाइल स्पीड टेस्ट दर्ज नहीं हुआ।',
      },
    },
    followUps: ['network.fastest', 'travel.check'],
    cacheClass: 'reference',
    route: to('/connectivity'),
  },

  // ── Char Dham & tourism ────────────────────────────────────────────────────────────────
  {
    id: 'tourism.chardham',
    category: 'tourism',
    text: {
      en: 'How many pilgrims visited the Char Dham last year?',
      hi: 'पिछले साल चारधाम में कितने तीर्थयात्री आए?',
    },
    params: NONE,
    keywords: [
      'char dham',
      'chardham',
      'pilgrims',
      'pilgrim',
      'visitors',
      'tirth',
      'चारधाम',
      'तीर्थयात्री',
      'यात्री',
    ],
    resolver: profile.tourismCharDham,
    templates: {
      ok: {
        en: '{visitors} pilgrim visits were recorded at the Char Dham shrines and Hemkund Sahib in {year}.',
        hi: '{year} में चारधाम और हेमकुंड साहिब में {visitors} तीर्थयात्री दर्ज हुए।',
      },
    },
    followUps: ['tourism.busiest', 'tourism.trend', 'roads.helpline'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },
  {
    id: 'tourism.busiest',
    category: 'tourism',
    text: { en: 'Which shrine had the most visitors?', hi: 'किस धाम में सबसे अधिक यात्री आए?' },
    params: NONE,
    keywords: [
      'busiest',
      'most',
      'popular',
      'shrine',
      'dham',
      'kedarnath',
      'badrinath',
      'धाम',
      'सबसे अधिक',
    ],
    resolver: profile.tourismBusiest,
    templates: {
      ok: {
        en: '{shrine} recorded the most pilgrim visits in {year}: {visitors}.',
        hi: '{year} में सबसे अधिक तीर्थयात्री {shrine} पहुँचे: {visitors}।',
      },
    },
    followUps: ['tourism.chardham', 'tourism.trend'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },
  {
    id: 'tourism.trend',
    category: 'tourism',
    text: {
      en: 'Are pilgrim numbers going up or down?',
      hi: 'क्या तीर्थयात्रियों की संख्या बढ़ रही है या घट रही है?',
    },
    params: NONE,
    keywords: ['trend', 'increase', 'decrease', 'growing', 'going up', 'going down', 'बढ़', 'घट'],
    resolver: profile.tourismTrend,
    templates: {
      ok: {
        en: 'Pilgrim visits were {direction} {change}% in {year} ({visitors}) compared with {previousYear} ({previousVisitors}).',
        hi: '{previousYear} ({previousVisitors}) की तुलना में {year} ({visitors}) में तीर्थयात्री {change}% {direction} रहे।',
      },
    },
    followUps: ['tourism.chardham', 'tourism.busiest'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },

  // ── Districts ──────────────────────────────────────────────────────────────────────────
  {
    id: 'district.overview',
    category: 'districts',
    text: { en: 'Tell me about {district}', hi: '{district} के बारे में बताइए' },
    params: D,
    keywords: ['tell me about', 'overview', 'information', 'jankari', 'बारे', 'जानकारी'],
    resolver: profile.districtOverview,
    templates: {
      ok: {
        en: '{district} is in the {division} division, with its headquarters at {headquarters}. It has {tehsils} tehsils and a population of {population} (as of {year}).',
        hi: '{district} {division} मंडल में है और इसका मुख्यालय {headquarters} है। इसमें {tehsils} तहसीलें हैं और जनसंख्या {population} है ({year} के अनुसार)।',
      },
    },
    followUps: ['weather.now', 'district.literacy', 'data.district'],
    cacheClass: 'reference',
    route: toDistrict,
  },
  {
    id: 'district.population',
    category: 'districts',
    text: { en: 'What is the population of {district}?', hi: '{district} की जनसंख्या कितनी है?' },
    params: D,
    keywords: [
      'population',
      'people',
      'residents',
      'jansankhya',
      'aabadi',
      'abadi',
      'जनसंख्या',
      'आबादी',
    ],
    resolver: profile.indicatorResolver('population', 'district'),
    templates: {
      ok: {
        en: '{district} has a population of {value}, as of {year}.',
        hi: '{district} की जनसंख्या {value} है ({year} के अनुसार)।',
      },
    },
    followUps: ['district.literacy', 'district.largest', 'district.overview'],
    cacheClass: 'reference',
    route: toDistrict,
  },
  {
    id: 'district.hq',
    category: 'districts',
    text: { en: 'What is the headquarters of {district}?', hi: '{district} का मुख्यालय कहाँ है?' },
    params: D,
    keywords: ['headquarters', 'hq', 'capital', 'mukhyalay', 'मुख्यालय'],
    resolver: profile.districtHeadquarters,
    templates: {
      ok: {
        en: 'The headquarters of {district} is {headquarters}.',
        hi: '{district} का मुख्यालय {headquarters} है।',
      },
    },
    followUps: ['district.overview', 'district.division'],
    cacheClass: 'reference',
    route: toDistrict,
  },
  {
    id: 'district.literacy',
    category: 'districts',
    text: {
      en: 'What is the literacy rate in {district}?',
      hi: '{district} में साक्षरता दर कितनी है?',
    },
    params: D,
    keywords: ['literacy', 'literate', 'education', 'sakshar', 'saksharta', 'साक्षरता', 'शिक्षा'],
    resolver: profile.indicatorResolver('literacy_rate', 'district'),
    templates: {
      ok: {
        en: 'The literacy rate in {district} is {value}, as of {year}.',
        hi: '{district} में साक्षरता दर {value} है ({year} के अनुसार)।',
      },
    },
    followUps: ['district.population', 'state.literacy'],
    cacheClass: 'reference',
    route: toDistrict,
  },
  {
    id: 'district.largest',
    category: 'districts',
    text: { en: 'Which district has the most people?', hi: 'किस ज़िले की जनसंख्या सबसे अधिक है?' },
    params: NONE,
    keywords: ['most people', 'most populous', 'largest district', 'biggest district', 'सबसे अधिक'],
    resolver: profile.districtLargest,
    templates: {
      ok: {
        en: '{district} has the most people of any district: {value} (as of {year}).',
        hi: 'सबसे अधिक जनसंख्या {district} की है: {value} ({year} के अनुसार)।',
      },
    },
    followUps: ['district.smallest', 'state.population'],
    cacheClass: 'reference',
    route: to('/districts'),
  },
  {
    id: 'district.smallest',
    category: 'districts',
    text: { en: 'Which district has the fewest people?', hi: 'किस ज़िले की जनसंख्या सबसे कम है?' },
    params: NONE,
    keywords: ['fewest people', 'least populous', 'smallest district', 'सबसे कम'],
    resolver: profile.districtSmallest,
    templates: {
      ok: {
        en: '{district} has the fewest people of any district: {value} (as of {year}).',
        hi: 'सबसे कम जनसंख्या {district} की है: {value} ({year} के अनुसार)।',
      },
    },
    followUps: ['district.largest', 'district.list'],
    cacheClass: 'reference',
    route: to('/districts'),
  },
  {
    id: 'district.list',
    category: 'districts',
    text: { en: 'What are the districts of Uttarakhand?', hi: 'उत्तराखंड के ज़िले कौन-से हैं?' },
    params: NONE,
    keywords: ['districts', 'list of districts', 'all districts', 'zile', 'jile', 'ज़िले', 'सूची'],
    resolver: profile.districtList,
    templates: {
      ok: {
        en: 'Uttarakhand has {count} districts: {names}.',
        hi: 'उत्तराखंड में {count} ज़िले हैं: {names}।',
      },
    },
    followUps: ['district.largest', 'state.population'],
    cacheClass: 'reference',
    route: to('/districts'),
  },
  {
    id: 'district.division',
    category: 'districts',
    text: {
      en: 'Is {district} in Garhwal or Kumaon?',
      hi: '{district} गढ़वाल में है या कुमाऊँ में?',
    },
    params: D,
    keywords: ['garhwal', 'kumaon', 'kumaun', 'division', 'mandal', 'गढ़वाल', 'कुमाऊँ', 'मंडल'],
    resolver: profile.districtDivision,
    templates: {
      ok: {
        en: '{district} is in the {division} division.',
        hi: '{district} {division} मंडल में है।',
      },
    },
    followUps: ['district.overview', 'district.hq'],
    cacheClass: 'reference',
    route: toDistrict,
  },

  // ── Uttarakhand profile ────────────────────────────────────────────────────────────────
  {
    id: 'state.population',
    category: 'state',
    text: { en: 'What is the population of Uttarakhand?', hi: 'उत्तराखंड की जनसंख्या कितनी है?' },
    params: NONE,
    keywords: ['uttarakhand', 'state', 'population', 'people', 'jansankhya', 'जनसंख्या', 'राज्य'],
    resolver: profile.indicatorResolver('state_population_projection', 'state'),
    templates: {
      ok: {
        en: "Uttarakhand's projected population is {value} ({year}). This is an official projection based on Census 2011, not a new headcount.",
        hi: 'उत्तराखंड की अनुमानित जनसंख्या {value} है ({year})। यह जनगणना 2011 पर आधारित आधिकारिक अनुमान है, नई गणना नहीं।',
      },
    },
    followUps: ['district.largest', 'state.area', 'state.literacy'],
    cacheClass: 'reference',
    route: to('/'),
  },
  {
    id: 'state.forest',
    category: 'state',
    text: { en: 'How much of Uttarakhand is forest?', hi: 'उत्तराखंड का कितना हिस्सा वन है?' },
    params: NONE,
    keywords: ['forest', 'forests', 'trees', 'green', 'van', 'jungle', 'वन', 'जंगल'],
    resolver: profile.indicatorResolver('state_forest_cover_pct', 'state'),
    templates: {
      ok: {
        en: "{value} of Uttarakhand's area is under forest cover ({year}, published by {department}).",
        hi: 'उत्तराखंड के क्षेत्रफल का {value} वन आवरण में है ({year}, प्रकाशक: {department})।',
      },
    },
    followUps: ['fires.state', 'state.area'],
    cacheClass: 'reference',
    route: to('/'),
  },
  {
    id: 'state.area',
    category: 'state',
    text: { en: 'How big is Uttarakhand?', hi: 'उत्तराखंड का क्षेत्रफल कितना है?' },
    params: NONE,
    keywords: ['area', 'size', 'big', 'sq km', 'kshetrafal', 'क्षेत्रफल'],
    resolver: profile.indicatorResolver('state_area_sq_km', 'state'),
    templates: {
      ok: { en: 'Uttarakhand covers {value}.', hi: 'उत्तराखंड का क्षेत्रफल {value} है।' },
    },
    followUps: ['state.forest', 'district.list'],
    cacheClass: 'reference',
    route: to('/'),
  },
  {
    id: 'state.villages',
    category: 'state',
    text: { en: 'How many villages are in Uttarakhand?', hi: 'उत्तराखंड में कितने गाँव हैं?' },
    params: NONE,
    keywords: ['villages', 'village', 'gaon', 'gaanv', 'गाँव', 'गांव'],
    resolver: profile.indicatorResolver('state_administrative_villages', 'state'),
    templates: {
      ok: {
        en: "Uttarakhand's current Local Government Directory lists {value} villages.",
        hi: 'वर्तमान स्थानीय शासन निर्देशिका (LGD) में उत्तराखंड के {value} गाँव दर्ज हैं।',
      },
    },
    followUps: ['state.population', 'district.list'],
    cacheClass: 'reference',
    route: to('/'),
  },
  {
    id: 'state.literacy',
    category: 'state',
    text: { en: "What is Uttarakhand's literacy rate?", hi: 'उत्तराखंड की साक्षरता दर कितनी है?' },
    params: NONE,
    keywords: ['literacy', 'literate', 'education', 'saksharta', 'साक्षरता'],
    resolver: profile.indicatorResolver('state_literacy_plfs', 'state'),
    templates: {
      ok: {
        en: "Uttarakhand's literacy rate is {value} ({year}), a PLFS sample-survey estimate for people aged 7 and over.",
        hi: 'उत्तराखंड की साक्षरता दर {value} है ({year}); यह 7 वर्ष और अधिक आयु के लोगों के लिए PLFS नमूना-सर्वेक्षण अनुमान है।',
      },
    },
    followUps: ['district.literacy', 'state.population'],
    cacheClass: 'reference',
    route: to('/'),
  },

  // ── Internet ───────────────────────────────────────────────────────────────────────────
  {
    id: 'network.fastest',
    category: 'connectivity',
    text: {
      en: 'Which district has the fastest mobile internet?',
      hi: 'किस ज़िले में मोबाइल इंटरनेट सबसे तेज़ है?',
    },
    params: NONE,
    keywords: ['fastest internet', 'fastest', 'best network', 'tez', 'तेज़'],
    resolver: travel.networkFastest,
    templates: {
      ok: {
        en: '{district} measured the fastest median mobile download: {download} Mbps. The state average is {average} Mbps across {measured} districts.',
        hi: 'सबसे तेज़ मोबाइल डाउनलोड {district} में मापा गया: {download} Mbps। {measured} ज़िलों का राज्य औसत {average} Mbps है।',
      },
    },
    followUps: ['network.slowest', 'network.district'],
    cacheClass: 'reference',
    route: to('/connectivity'),
  },
  {
    id: 'network.slowest',
    category: 'connectivity',
    text: { en: 'Where is mobile internet slowest?', hi: 'मोबाइल इंटरनेट सबसे धीमा कहाँ है?' },
    params: NONE,
    keywords: ['slowest internet', 'slowest', 'slow internet', 'dheema', 'धीमा'],
    resolver: travel.networkSlowest,
    templates: {
      ok: {
        en: '{district} measured the slowest median mobile download: {download} Mbps. The state average is {average} Mbps across {measured} districts.',
        hi: 'सबसे धीमा मोबाइल डाउनलोड {district} में मापा गया: {download} Mbps। {measured} ज़िलों का राज्य औसत {average} Mbps है।',
      },
    },
    followUps: ['network.fastest', 'network.district'],
    cacheClass: 'reference',
    route: to('/connectivity'),
  },
  {
    id: 'network.district',
    category: 'connectivity',
    text: {
      en: 'How fast is internet in {district}?',
      hi: '{district} में इंटरनेट कितना तेज़ है?',
    },
    params: D,
    keywords: ['internet', 'speed', 'mbps', 'network', 'broadband', 'इंटरनेट', 'स्पीड'],
    resolver: travel.networkDistrict,
    templates: {
      ok: {
        en: 'In {district}, mobile speed tests measured a median {download} Mbps download and {upload} Mbps upload ({tests} tests, quarter from {quarter}).',
        hi: '{district} में मोबाइल स्पीड टेस्ट में औसत डाउनलोड {download} Mbps और अपलोड {upload} Mbps रहा ({tests} टेस्ट, {quarter} से शुरू तिमाही)।',
      },
      empty: {
        en: 'No mobile speed tests were recorded in {district} in the latest quarter.',
        hi: 'पिछली तिमाही में {district} में कोई मोबाइल स्पीड टेस्ट दर्ज नहीं हुआ।',
      },
    },
    followUps: ['network.fastest', 'travel.check'],
    cacheClass: 'reference',
    route: to('/connectivity'),
  },

  // ── Budget ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'budget.total',
    category: 'budget',
    text: { en: 'What is the state budget this year?', hi: 'इस वर्ष राज्य का बजट कितना है?' },
    params: NONE,
    keywords: [
      'budget',
      'expenditure',
      'spending',
      'money',
      'crore',
      'bajat',
      'बजट',
      'व्यय',
      'खर्च',
    ],
    resolver: profile.budgetTotal,
    templates: {
      ok: {
        en: "Uttarakhand's budgeted total expenditure for {year} is ₹{total} crore, as laid before the Legislative Assembly.",
        hi: '{year} के लिए उत्तराखंड का बजट में कुल व्यय ₹{total} करोड़ है, जैसा विधानसभा में प्रस्तुत किया गया।',
      },
    },
    followUps: ['budget.top'],
    cacheClass: 'daily',
    route: to('/governance'),
  },
  {
    id: 'budget.top',
    category: 'budget',
    text: {
      en: 'Which departments get the most money?',
      hi: 'किन विभागों को सबसे अधिक बजट मिलता है?',
    },
    params: NONE,
    keywords: [
      'department',
      'departments',
      'allocation',
      'allocations',
      'vibhag',
      'विभाग',
      'आवंटन',
    ],
    resolver: profile.budgetTop,
    templates: {
      ok: {
        en: 'The largest allocations in {year}: {departments}.',
        hi: '{year} में सबसे बड़े आवंटन: {departments}।',
      },
    },
    followUps: ['budget.total'],
    cacheClass: 'daily',
    route: to('/governance'),
  },

  // ── About the data ─────────────────────────────────────────────────────────────────────
  {
    id: 'data.sources',
    category: 'data',
    text: {
      en: 'Where does Pahad Pulse get its data?',
      hi: 'Pahad Pulse को डेटा कहाँ से मिलता है?',
    },
    params: NONE,
    keywords: ['source', 'sources', 'credible', 'data from', 'srot', 'स्रोत'],
    resolver: profile.dataSources,
    templates: {
      ok: {
        en: 'Pahad Pulse shows data from {count} published sources, including {examples}. It does not create data; every figure names who published it and the date it describes.',
        hi: 'Pahad Pulse {count} प्रकाशित स्रोतों का डेटा दिखाता है, जिनमें {examples} शामिल हैं। यह स्वयं डेटा नहीं बनाता; हर आँकड़े के साथ प्रकाशक और तिथि दी जाती है।',
      },
    },
    followUps: ['data.fresh', 'app.help'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'data.fresh',
    category: 'data',
    text: { en: 'How up to date is this data?', hi: 'यह डेटा कितना ताज़ा है?' },
    params: NONE,
    keywords: ['fresh', 'updated', 'latest', 'current', 'old', 'taza', 'ताज़ा', 'अपडेट'],
    resolver: profile.dataFreshness,
    templates: {
      ok: {
        en: 'Of {total} sources, {fresh} are up to date, {stale} are due for a refresh and {expired} are overdue. Each figure shows its own date.',
        hi: '{total} स्रोतों में से {fresh} ताज़ा हैं, {stale} अपडेट होने वाले हैं और {expired} पुराने हो चुके हैं। हर आँकड़े के साथ उसकी तिथि दिखती है।',
      },
    },
    followUps: ['data.sources'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'data.district',
    category: 'data',
    text: {
      en: 'What data is available for {district}?',
      hi: '{district} के लिए कौन-सा डेटा उपलब्ध है?',
    },
    params: D,
    keywords: ['data available', 'statistics', 'indicators', 'figures', 'aankde', 'आँकड़े'],
    resolver: profile.dataDistrict,
    templates: {
      ok: {
        en: 'Pahad Pulse holds {count} published figures for {district} across {categories} topics; the most recent describes {latest}.',
        hi: 'Pahad Pulse में {district} के {count} प्रकाशित आँकड़े हैं, {categories} विषयों में; सबसे हाल का {latest} का है।',
      },
      empty: {
        en: 'No published figures are held for {district} yet.',
        hi: '{district} के लिए अभी कोई प्रकाशित आँकड़ा उपलब्ध नहीं है।',
      },
    },
    followUps: ['district.overview', 'data.sources'],
    cacheClass: 'reference',
    route: toDistrict,
  },
  {
    id: 'app.help',
    category: 'about',
    text: { en: 'What can you answer?', hi: 'आप किन सवालों के जवाब दे सकते हैं?' },
    params: NONE,
    keywords: ['help', 'what can you', 'questions', 'madad', 'मदद', 'सवाल'],
    resolver: () =>
      Promise.resolve(
        ok({
          status: 'ok',
          slots: {
            topics: {
              en: CATEGORIES.map((c) => c.label.en.toLowerCase()).join(', '),
              hi: CATEGORIES.map((c) => c.label.hi).join(', '),
            },
          },
          facts: [],
        }),
      ),
    templates: {
      ok: {
        en: 'I answer set questions from Pahad Pulse data about: {topics}. Pick a topic, or type a question and I will find the closest one.',
        hi: 'मैं Pahad Pulse के डेटा से इन विषयों पर तय सवालों के जवाब देता हूँ: {topics}। कोई विषय चुनें, या सवाल लिखें, मैं सबसे निकट का सवाल ढूँढ दूँगा।',
      },
    },
    followUps: ['alerts.active', 'weather.now', 'tourism.chardham'],
    cacheClass: 'reference',
    route: () => null,
  },
  // ── Places from the official travel guide ─────────────────────────────────────────────
  {
    id: 'place.about',
    category: 'tourism',
    text: { en: 'Tell me about {place}', hi: '{place} के बारे में बताइए' },
    params: P,
    keywords: ['tell me about', 'information', 'jankari', 'बारे', 'जानकारी'],
    resolver: guide.placeAbout,
    templates: {
      ok: {
        en: '{place} is {kind} in {district} district. {details}',
        hi: '{place} {district} ज़िले में {kind} है। {details}',
      },
    },
    followUps: ['place.weather', 'place.travel', 'tourism.district'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },
  {
    id: 'place.weather',
    category: 'tourism',
    text: { en: "What's the weather at {place}?", hi: '{place} में मौसम कैसा है?' },
    params: P,
    keywords: ['weather', 'temperature', 'cold', 'mausam', 'thand', 'मौसम', 'तापमान', 'ठंड'],
    resolver: guide.placeWeather,
    templates: {
      ok: {
        en: 'The latest reading for {district} district, where {place} is, was {temperature}°C and {condition} at {when}. It is a district reading; high-altitude shrines are usually much colder.',
        hi: '{place} जिस {district} ज़िले में है, वहाँ {when} पर तापमान {temperature}°C था, मौसम: {condition}। यह ज़िले का आँकड़ा है; ऊँचाई वाले धाम आमतौर पर काफ़ी ठंडे होते हैं।',
      },
    },
    followUps: ['place.travel', 'weather.rain', 'place.about'],
    cacheClass: 'live',
    route: to('/tourism'),
  },
  {
    id: 'place.travel',
    category: 'tourism',
    text: {
      en: 'What should I check before visiting {place}?',
      hi: '{place} जाने से पहले क्या देखना चाहिए?',
    },
    params: P,
    keywords: [
      'travel',
      'trip',
      'going',
      'visit',
      'visiting',
      'safe',
      'plan',
      'jana',
      'यात्रा',
      'जाना',
      'सुरक्षित',
    ],
    resolver: guide.placeTravel,
    templates: {
      ok: {
        en: 'What Pahad Pulse shows now for {district} district, where {place} is. Warnings: {alerts}. Weather: {weather}. Satellite fire detections: {fires}. Roads: {roads}. For road and yatra status call {helpline}; in an emergency call {emergency}. These are signals, not advice on whether to travel.',
        hi: '{place} जिस {district} ज़िले में है, उसके लिए Pahad Pulse में अभी यह दिख रहा है। चेतावनियाँ: {alerts}। मौसम: {weather}। उपग्रह से आग के संकेत: {fires}। सड़कें: {roads}। सड़क व यात्रा की स्थिति के लिए {helpline}; आपात स्थिति में {emergency} पर कॉल करें। यह केवल संकेत हैं, यात्रा करने या न करने की सलाह नहीं।',
      },
    },
    followUps: ['tourism.register', 'tourism.guidelines', 'place.weather'],
    cacheClass: 'live',
    route: to('/trip-check'),
  },
  {
    id: 'tourism.pilgrimages',
    category: 'tourism',
    text: {
      en: 'Which pilgrim places are there besides the Char Dham?',
      hi: 'चारधाम के अलावा कौन-से तीर्थ स्थल हैं?',
    },
    params: NONE,
    keywords: [
      'pilgrim places',
      'pilgrimage',
      'pilgrimages',
      'temples',
      'temple',
      'shrines',
      'tirth',
      'mandir',
      'तीर्थ',
      'मंदिर',
      'besides char dham',
      'other than char dham',
    ],
    resolver: guide.tourismPilgrimages,
    templates: {
      ok: {
        en: 'Besides the Char Dham, the official travel guide lists {count} pilgrimage places: {places}.',
        hi: 'चारधाम के अलावा आधिकारिक यात्रा गाइड में {count} तीर्थ स्थल हैं: {places}।',
      },
    },
    followUps: ['place.about', 'tourism.destinations', 'tourism.chardham'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },
  {
    id: 'tourism.destinations',
    category: 'tourism',
    text: {
      en: 'What are the popular tourist places in Uttarakhand?',
      hi: 'उत्तराखंड के प्रसिद्ध पर्यटन स्थल कौन-से हैं?',
    },
    params: NONE,
    keywords: [
      'tourist places',
      'tourist',
      'tourism',
      'places to visit',
      'destinations',
      'hill station',
      'ghumne',
      'paryatan',
      'पर्यटन',
      'घूमने',
    ],
    resolver: guide.tourismDestinations,
    templates: {
      ok: {
        en: 'The official travel guide lists {count} destinations: {places}.',
        hi: 'आधिकारिक यात्रा गाइड में {count} पर्यटन स्थल हैं: {places}।',
      },
    },
    followUps: ['place.about', 'tourism.pilgrimages', 'tourism.district'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },
  {
    id: 'tourism.district',
    category: 'tourism',
    text: { en: 'What places can I visit in {district}?', hi: '{district} में कहाँ घूम सकते हैं?' },
    params: D,
    keywords: [
      'places to visit',
      'visit',
      'tourist',
      'places',
      'ghumne',
      'dekhne',
      'घूमने',
      'देखने',
    ],
    resolver: guide.tourismInDistrict,
    templates: {
      ok: {
        en: 'The official travel guide lists {count} places in {district}: {places}.',
        hi: 'आधिकारिक यात्रा गाइड में {district} के {count} स्थल हैं: {places}।',
      },
      empty: {
        en: 'The official travel guide lists no places in {district} yet.',
        hi: 'आधिकारिक यात्रा गाइड में अभी {district} का कोई स्थल नहीं है।',
      },
    },
    followUps: ['weather.now', 'travel.check', 'district.overview'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },
  {
    id: 'tourism.season',
    category: 'tourism',
    text: { en: 'When is the Char Dham yatra season?', hi: 'चारधाम यात्रा का मौसम कब होता है?' },
    params: NONE,
    keywords: ['season', 'best time', 'when to go', 'when', 'open', 'kab', 'मौसम कब', 'कब'],
    resolver: guide.tourismSeason,
    templates: {
      ok: {
        en: 'The official guide gives the Char Dham season as {season}. Opening dates are announced each year; check the official advisory before you plan.',
        hi: 'आधिकारिक गाइड के अनुसार चारधाम यात्रा का मौसम {season} है। कपाट खुलने की तिथियाँ हर वर्ष घोषित होती हैं; योजना से पहले आधिकारिक सूचना देखें।',
      },
    },
    followUps: ['tourism.register', 'tourism.guidelines', 'tourism.chardham'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },
  {
    id: 'tourism.register',
    category: 'tourism',
    text: {
      en: 'How do I register for the Char Dham yatra?',
      hi: 'चारधाम यात्रा के लिए पंजीकरण कैसे करें?',
    },
    params: NONE,
    keywords: [
      'register',
      'registration',
      'pass',
      'permit',
      'qr',
      'panjikaran',
      'पंजीकरण',
      'रजिस्ट्रेशन',
    ],
    resolver: guide.tourismRegister,
    templates: {
      ok: {
        en: 'Register yourself and your vehicle on the official portal before you set out: {url}. Carry the registration letter or QR code and a valid ID.',
        hi: 'यात्रा से पहले आधिकारिक पोर्टल पर अपना और वाहन का पंजीकरण करें: {url}। पंजीकरण पत्र या QR कोड और वैध पहचान पत्र साथ रखें।',
      },
    },
    followUps: ['tourism.guidelines', 'tourism.season', 'roads.helpline'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },
  {
    id: 'tourism.guidelines',
    category: 'tourism',
    text: {
      en: 'What should pilgrims keep in mind?',
      hi: 'तीर्थयात्रियों को किन बातों का ध्यान रखना चाहिए?',
    },
    params: NONE,
    keywords: [
      'guidelines',
      'tips',
      'advice',
      'keep in mind',
      'precautions',
      'dhyan',
      'सावधानी',
      'ध्यान',
      'सुझाव',
    ],
    resolver: guide.tourismGuidelines,
    templates: {
      ok: {
        en: 'The official travel guide advises: {guidelines}',
        hi: 'आधिकारिक यात्रा गाइड की सलाह (अंग्रेज़ी में प्रकाशित): {guidelines}',
      },
    },
    followUps: ['tourism.register', 'roads.helpline', 'place.travel'],
    cacheClass: 'reference',
    route: to('/tourism'),
  },

  // ── Pahad Pulse tools ──────────────────────────────────────────────────────────────────
  {
    id: 'tools.list',
    category: 'tools',
    text: { en: 'What tools does Pahad Pulse have?', hi: 'Pahad Pulse में कौन-से टूल हैं?' },
    params: NONE,
    keywords: ['tools', 'features', 'what can i do', 'फ़ीचर', 'टूल'],
    resolver: about.statement,
    templates: {
      ok: {
        en: 'Pahad Pulse has tools that do the checking for you: Trip Check (official signals for a place and date), the map (districts, warnings and satellite fire detections), district comparison for a business idea, the scheme finder, the budget explorer and the data explorer. Open them from More in the app or the menu on the website.',
        hi: 'Pahad Pulse के टूल आपके लिए जाँच करते हैं: ट्रिप चेक (किसी स्थान और तारीख़ के आधिकारिक संकेत), नक्शा (ज़िले, चेतावनियाँ और उपग्रह से आग के संकेत), व्यवसाय के लिए ज़िलों की तुलना, योजना खोजक, बजट एक्सप्लोरर और डेटा एक्सप्लोरर। इन्हें ऐप में More से या वेबसाइट के मेनू से खोलें।',
      },
    },
    followUps: ['tools.tripcheck', 'tools.compare', 'tools.schemes'],
    cacheClass: 'reference',
    route: () => null,
  },
  {
    id: 'tools.tripcheck',
    category: 'tools',
    text: { en: 'What does Trip Check do?', hi: 'ट्रिप चेक क्या करता है?' },
    params: NONE,
    keywords: ['trip check', 'tripcheck', 'trip tool', 'ट्रिप चेक'],
    resolver: about.statement,
    templates: {
      ok: {
        en: 'Trip Check takes a place and a date and puts the official signals in one report: warnings, the weather forecast, road status, mobile signal and help numbers. It lists signals; it does not certify that a trip is safe.',
        hi: 'ट्रिप चेक एक स्थान और तारीख़ लेकर आधिकारिक संकेत एक रिपोर्ट में दिखाता है: चेतावनियाँ, मौसम पूर्वानुमान, सड़क की स्थिति, मोबाइल सिग्नल और हेल्पलाइन नंबर। यह संकेत बताता है; यात्रा को सुरक्षित प्रमाणित नहीं करता।',
      },
    },
    followUps: ['travel.check', 'place.travel', 'tools.list'],
    cacheClass: 'reference',
    route: to('/trip-check'),
  },
  {
    id: 'tools.compare',
    category: 'tools',
    text: {
      en: 'How does the district comparison tool work?',
      hi: 'ज़िलों की तुलना का टूल कैसे काम करता है?',
    },
    params: NONE,
    keywords: [
      'compare',
      'comparison',
      'business',
      'which district',
      'invest',
      'tulna',
      'तुलना',
      'व्यवसाय',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: 'Pick a business idea and two districts. The tool scores each district on the evidence that idea needs, such as connectivity, tourism, roads, population, agriculture and safety, then says which district fits better, calls it a tie, or says the evidence is not enough. It also shows public investment in the area and schemes that could help.',
        hi: 'एक व्यवसाय और दो ज़िले चुनें। टूल उस व्यवसाय के लिए ज़रूरी आँकड़ों (जैसे कनेक्टिविटी, पर्यटन, सड़कें, जनसंख्या, कृषि और सुरक्षा) पर दोनों ज़िलों को अंक देता है, फिर बताता है कि कौन-सा ज़िला बेहतर है, बराबरी है, या आँकड़े पर्याप्त नहीं हैं। साथ ही सरकारी निवेश और मददगार योजनाएँ भी दिखाता है।',
      },
    },
    followUps: ['tools.schemes', 'network.fastest', 'district.largest'],
    cacheClass: 'reference',
    route: to('/compare'),
  },
  {
    id: 'tools.schemes',
    category: 'tools',
    text: { en: 'What is the scheme finder?', hi: 'योजना खोजक क्या है?' },
    params: NONE,
    keywords: [
      'scheme',
      'schemes',
      'scheme finder',
      'subsidy',
      'loan',
      'grant',
      'startup',
      'yojana',
      'योजना',
      'सब्सिडी',
      'ऋण',
    ],
    resolver: about.schemeFinder,
    templates: {
      ok: {
        en: 'The scheme finder lists {total} verified finance, subsidy, loan, training, incubation and market-access programmes you can use from Uttarakhand, across {supportTypes} kinds of support. Search by name or filter by sector; each scheme shows eligibility, benefits, how to apply and its official page. The directory was last verified on {verified}.',
        hi: 'योजना खोजक में उत्तराखंड से उपयोग की जा सकने वाली {total} सत्यापित वित्त, सब्सिडी, ऋण, प्रशिक्षण, इन्क्यूबेशन और बाज़ार-पहुँच योजनाएँ हैं, {supportTypes} प्रकार की सहायता में। नाम से खोजें या क्षेत्र से छाँटें; हर योजना में पात्रता, लाभ, आवेदन का तरीका और आधिकारिक पेज है। निर्देशिका अंतिम बार {verified} को सत्यापित हुई।',
      },
    },
    followUps: ['tools.compare', 'budget.top'],
    cacheClass: 'daily',
    route: to('/schemes'),
  },
  {
    id: 'tools.map',
    category: 'tools',
    text: { en: 'What can I see on the map?', hi: 'नक्शे पर क्या दिखता है?' },
    params: NONE,
    keywords: ['map', 'naksha', 'नक्शा', 'मैप'],
    resolver: about.statement,
    templates: {
      ok: {
        en: "The map shows every district on the state's terrain, active warning areas, satellite fire detections from the last 48 hours and the national and state highways. Tap a district, a warning or a fire for details, and switch each layer on or off.",
        hi: 'नक्शे पर राज्य की भू-आकृति के साथ सभी ज़िले, सक्रिय चेतावनी क्षेत्र, पिछले 48 घंटों के उपग्रह आग संकेत और राष्ट्रीय व राज्य राजमार्ग दिखते हैं। विवरण के लिए किसी ज़िले, चेतावनी या आग पर टैप करें, और हर परत को चालू या बंद करें।',
      },
    },
    followUps: ['fires.state', 'alerts.active'],
    cacheClass: 'reference',
    route: to('/map'),
  },
  {
    id: 'tools.explorer',
    category: 'tools',
    text: { en: 'What is the Data Explorer?', hi: 'डेटा एक्सप्लोरर क्या है?' },
    params: NONE,
    keywords: ['data explorer', 'explorer', 'indicators', 'catalogue', 'एक्सप्लोरर'],
    resolver: about.statement,
    templates: {
      ok: {
        en: 'The Data Explorer shows what Pahad Pulse holds: how many indicators it has in each sector and how complete they are across districts, which districts lead and trail on figures that can be fairly compared, and a searchable catalogue in English and Hindi.',
        hi: 'डेटा एक्सप्लोरर बताता है कि Pahad Pulse में क्या है: हर क्षेत्र में कितने संकेतक हैं और ज़िलों में वे कितने पूरे हैं, तुलना योग्य आँकड़ों पर कौन-से ज़िले आगे और पीछे हैं, और अंग्रेज़ी व हिंदी में खोजने योग्य सूची।',
      },
    },
    followUps: ['data.district', 'data.sources'],
    cacheClass: 'reference',
    route: to('/data-explorer'),
  },
  {
    id: 'tools.budget',
    category: 'tools',
    text: { en: 'What does the budget explorer show?', hi: 'बजट एक्सप्लोरर क्या दिखाता है?' },
    params: NONE,
    keywords: ['budget explorer', 'budget tool', 'बजट एक्सप्लोरर'],
    resolver: about.statement,
    templates: {
      ok: {
        en: "The budget explorer shows what the state plans to spend each year: total and capital expenditure, receipts, and every department's allocation and share, with a link to the official budget document.",
        hi: 'बजट एक्सप्लोरर बताता है कि राज्य हर वर्ष कितना खर्च करने की योजना बनाता है: कुल और पूंजीगत व्यय, प्राप्तियाँ, और हर विभाग का आवंटन व हिस्सा, आधिकारिक बजट दस्तावेज़ के लिंक के साथ।',
      },
    },
    followUps: ['budget.total', 'budget.top'],
    cacheClass: 'reference',
    route: to('/governance'),
  },
  {
    id: 'tools.notifications',
    category: 'tools',
    text: { en: 'How do I get warning notifications?', hi: 'चेतावनी की सूचनाएँ कैसे पाएँ?' },
    params: NONE,
    keywords: ['notification', 'notifications', 'notify', 'push', 'suchna', 'सूचना', 'नोटिफ़िकेशन'],
    resolver: about.statement,
    templates: {
      ok: {
        en: "In the app, open Settings, then Notifications, and turn on New alert notifications. You'll be told when a new official warning is issued, and when satellites detect new fires in a district, at most once a day per district. A notification can be missed, so official channels remain the authority.",
        hi: 'ऐप में सेटिंग्स, फिर नोटिफ़िकेशन खोलें और नई चेतावनी सूचनाएँ चालू करें। नई आधिकारिक चेतावनी जारी होने पर, और किसी ज़िले में उपग्रह से नई आग दिखने पर (हर ज़िले के लिए दिन में अधिकतम एक बार) आपको बताया जाएगा। सूचना छूट सकती है, इसलिए आधिकारिक माध्यम ही प्रमाण हैं।',
      },
    },
    followUps: ['alerts.active', 'fires.state'],
    cacheClass: 'reference',
    route: () => null,
  },

  // ── Data & sources ─────────────────────────────────────────────────────────────────────
  {
    id: 'data.official',
    category: 'data',
    text: { en: 'Is this official government data?', hi: 'क्या यह आधिकारिक सरकारी डेटा है?' },
    params: NONE,
    keywords: [
      'official',
      'government data',
      'trust',
      'reliable',
      'authentic',
      'sarkari',
      'सरकारी',
      'आधिकारिक',
      'भरोसेमंद',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: "The figures come from official publishers: state and central government departments, the Census, the national warning systems, and public datasets such as NASA's. Pahad Pulse is independent and never creates or edits a figure; each one is shown with its publisher and the date it describes, and links to the original.",
        hi: 'आँकड़े आधिकारिक प्रकाशकों से आते हैं: राज्य व केंद्र सरकार के विभाग, जनगणना, राष्ट्रीय चेतावनी प्रणालियाँ, और नासा जैसे सार्वजनिक डेटासेट। Pahad Pulse स्वतंत्र है और कोई आँकड़ा न बनाता है न बदलता है; हर आँकड़ा प्रकाशक और तिथि के साथ, मूल स्रोत के लिंक सहित दिखता है।',
      },
    },
    followUps: ['data.verify', 'data.sources', 'about.government'],
    cacheClass: 'reference',
    route: to('/sources'),
  },
  {
    id: 'data.verify',
    category: 'data',
    text: { en: 'How can I check a figure myself?', hi: 'किसी आँकड़े की जाँच ख़ुद कैसे करूँ?' },
    params: NONE,
    keywords: [
      'verify',
      'check a figure',
      'check myself',
      'proof',
      'original',
      'jaanch',
      'जाँच',
      'सत्यापित',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: 'Every figure in Pahad Pulse, including every answer here, shows its publisher and the date it describes, with a link to the original page. Open that source to check it yourself. The Sources page lists every dataset and when it was last updated.',
        hi: 'Pahad Pulse का हर आँकड़ा, यहाँ के हर जवाब सहित, अपने प्रकाशक और तिथि के साथ मूल पेज के लिंक सहित दिखता है। ख़ुद जाँचने के लिए वह स्रोत खोलें। स्रोत पेज पर हर डेटासेट और उसके अंतिम अपडेट की जानकारी है।',
      },
    },
    followUps: ['data.sources', 'data.fresh'],
    cacheClass: 'reference',
    route: to('/sources'),
  },
  {
    id: 'data.missing',
    category: 'data',
    text: {
      en: "Why do some figures say 'not available'?",
      hi: "कुछ आँकड़े 'उपलब्ध नहीं' क्यों दिखते हैं?",
    },
    params: NONE,
    keywords: [
      'not available',
      'missing',
      'dash',
      'blank',
      'empty',
      'zero',
      'उपलब्ध नहीं',
      'ग़ायब',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: "It means there is no current published figure, or Pahad Pulse doesn't yet have permission to show it. It is never shown as zero, because a missing figure and a real zero mean different things.",
        hi: 'इसका अर्थ है कि अभी कोई प्रकाशित आँकड़ा नहीं है, या उसे दिखाने की अनुमति अभी नहीं मिली है। इसे कभी शून्य नहीं दिखाया जाता, क्योंकि आँकड़ा न होना और सचमुच शून्य होना अलग बातें हैं।',
      },
    },
    followUps: ['data.fresh', 'data.verify'],
    cacheClass: 'reference',
    route: to('/sources'),
  },
  {
    id: 'source.weather',
    category: 'data',
    text: {
      en: 'Where do the weather and air figures come from?',
      hi: 'मौसम और हवा के आँकड़े कहाँ से आते हैं?',
    },
    params: NONE,
    keywords: ['weather data', 'weather source', 'air data', 'aqi source', 'मौसम स्रोत'],
    resolver: about.sourcesFor('hydromet'),
    templates: {
      ok: {
        en: 'Weather and air quality readings come from: {sources}.',
        hi: 'मौसम और वायु गुणवत्ता के आँकड़े यहाँ से आते हैं: {sources}।',
      },
    },
    followUps: ['weather.now', 'data.fresh'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'source.alerts',
    category: 'data',
    text: { en: 'Where do the warnings come from?', hi: 'चेतावनियाँ कहाँ से आती हैं?' },
    params: NONE,
    keywords: [
      'warnings come from',
      'alert source',
      'warning source',
      'who issues',
      'चेतावनी स्रोत',
    ],
    resolver: about.sourcesFor('alerts'),
    templates: {
      ok: {
        en: 'Warnings are published by: {sources}. Pahad Pulse shows them as issued and never rewrites them.',
        hi: 'चेतावनियाँ ये जारी करते हैं: {sources}। Pahad Pulse उन्हें जैसी जारी हुईं वैसी ही दिखाता है, बदलता नहीं।',
      },
    },
    followUps: ['alerts.active', 'tools.notifications'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'source.fires',
    category: 'data',
    text: { en: 'Where do the fire detections come from?', hi: 'आग के संकेत कहाँ से आते हैं?' },
    params: NONE,
    keywords: ['fire data', 'fire source', 'nasa', 'satellite', 'firms', 'उपग्रह'],
    resolver: about.sourcesFor('wildfire'),
    templates: {
      ok: {
        en: 'Fire detections come from {sources}, read from each satellite pass. A detection is a heat signature seen from orbit, not a report from the ground.',
        hi: 'आग के संकेत {sources} से आते हैं, हर उपग्रह के गुज़रने पर। यह अंतरिक्ष से दर्ज गर्मी है, ज़मीन से मिली सूचना नहीं।',
      },
    },
    followUps: ['fires.state', 'tools.map'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'source.quakes',
    category: 'data',
    text: { en: 'Where does the earthquake data come from?', hi: 'भूकंप का डेटा कहाँ से आता है?' },
    params: NONE,
    keywords: ['earthquake data', 'earthquake source', 'usgs', 'भूकंप स्रोत'],
    resolver: about.sourcesFor('seismic'),
    templates: {
      ok: {
        en: 'Earthquake records come from: {sources}.',
        hi: 'भूकंप के रिकॉर्ड यहाँ से आते हैं: {sources}।',
      },
    },
    followUps: ['quakes.recent'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'source.statistics',
    category: 'data',
    text: {
      en: 'Where do population and district statistics come from?',
      hi: 'जनसंख्या और ज़िलों के आँकड़े कहाँ से आते हैं?',
    },
    params: NONE,
    keywords: [
      'statistics source',
      'census',
      'population data',
      'district data',
      'जनगणना',
      'आँकड़े कहाँ से',
    ],
    resolver: about.sourcesFor('indicators'),
    templates: {
      ok: {
        en: 'District and state statistics come from {count} published sources, including: {sources}.',
        hi: 'ज़िले और राज्य के आँकड़े {count} प्रकाशित स्रोतों से आते हैं, जिनमें: {sources}।',
      },
    },
    followUps: ['state.population', 'tools.explorer'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'source.tourism',
    category: 'data',
    text: {
      en: 'Where do the pilgrim numbers come from?',
      hi: 'तीर्थयात्रियों की संख्या कहाँ से आती है?',
    },
    params: NONE,
    keywords: ['pilgrim data', 'tourism data', 'tourism source', 'visitor numbers', 'पर्यटन स्रोत'],
    resolver: about.sourcesFor('tourism'),
    templates: {
      ok: {
        en: 'Pilgrim and tourist numbers come from: {sources}.',
        hi: 'तीर्थयात्रियों और पर्यटकों की संख्या यहाँ से आती है: {sources}।',
      },
    },
    followUps: ['tourism.chardham', 'tourism.trend'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'source.internet',
    category: 'data',
    text: {
      en: 'Where do the internet speed figures come from?',
      hi: 'इंटरनेट स्पीड के आँकड़े कहाँ से आते हैं?',
    },
    params: NONE,
    keywords: ['internet data', 'speed data', 'speed source', 'ookla', 'स्पीड स्रोत'],
    resolver: about.sourcesFor('connectivity'),
    templates: {
      ok: {
        en: 'Internet speeds come from: {sources}. They are medians of real speed tests, published each quarter.',
        hi: 'इंटरनेट स्पीड यहाँ से आती है: {sources}। ये वास्तविक स्पीड टेस्ट के औसत हैं, जो हर तिमाही प्रकाशित होते हैं।',
      },
    },
    followUps: ['network.fastest', 'network.district'],
    cacheClass: 'daily',
    route: to('/sources'),
  },
  {
    id: 'source.budget',
    category: 'data',
    text: { en: 'Where do the budget figures come from?', hi: 'बजट के आँकड़े कहाँ से आते हैं?' },
    params: NONE,
    keywords: ['budget data', 'budget source', 'बजट स्रोत'],
    resolver: about.sourcesFor('governance'),
    templates: {
      ok: {
        en: 'Budget figures come from: {sources}, transcribed from the budget laid before the Legislative Assembly.',
        hi: 'बजट के आँकड़े यहाँ से आते हैं: {sources}, विधानसभा में प्रस्तुत बजट से लिए गए।',
      },
    },
    followUps: ['budget.total', 'tools.budget'],
    cacheClass: 'daily',
    route: to('/sources'),
  },

  // ── About Pahad Pulse ──────────────────────────────────────────────────────────────────
  {
    id: 'about.what',
    category: 'about',
    text: { en: 'What is Pahad Pulse?', hi: 'Pahad Pulse क्या है?' },
    params: NONE,
    keywords: [
      'what is pahad pulse',
      'this app',
      'this website',
      'पहाड़ पल्स',
      'about pahad pulse',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: "Pahad Pulse brings Uttarakhand's public data into one place: warnings, weather, air quality, fires, earthquakes, roads, tourism, district statistics and the state budget. Every figure shows who published it and the date it describes, and the tools turn that data into answers, from checking a trip to comparing districts. It needs no account and works in English and Hindi.",
        hi: 'Pahad Pulse उत्तराखंड का सार्वजनिक डेटा एक जगह लाता है: चेतावनियाँ, मौसम, वायु गुणवत्ता, आग, भूकंप, सड़कें, पर्यटन, ज़िलों के आँकड़े और राज्य का बजट। हर आँकड़े के साथ प्रकाशक और तिथि दिखती है, और टूल इस डेटा को जवाबों में बदलते हैं, यात्रा की जाँच से लेकर ज़िलों की तुलना तक। इसके लिए खाते की ज़रूरत नहीं, और यह अंग्रेज़ी व हिंदी में है।',
      },
    },
    followUps: ['about.why', 'tools.list', 'data.sources'],
    cacheClass: 'reference',
    route: () => null,
  },
  {
    id: 'about.why',
    category: 'about',
    text: {
      en: 'Why use Pahad Pulse instead of government portals?',
      hi: 'सरकारी पोर्टल की जगह Pahad Pulse क्यों?',
    },
    params: NONE,
    keywords: [
      'why',
      'why use',
      'instead',
      'portals',
      'difference',
      'need',
      'kyon',
      'क्यों',
      'पोर्टल',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: "Uttarakhand's data is spread across many department portals, each with its own format and schedule. Pahad Pulse puts it in front of you in one place, with the source beside every figure, and goes further than showing data: its tools answer practical questions, like what to check before a trip, which district suits a business, or which scheme fits, so you don't have to piece it together yourself.",
        hi: 'उत्तराखंड का डेटा कई विभागीय पोर्टलों पर बिखरा है, हर एक का अलग प्रारूप और समय। Pahad Pulse उसे एक जगह, हर आँकड़े के स्रोत के साथ, आपके सामने रखता है, और सिर्फ़ डेटा दिखाने से आगे जाता है: इसके टूल व्यावहारिक सवालों के जवाब देते हैं, जैसे यात्रा से पहले क्या देखें, व्यवसाय के लिए कौन-सा ज़िला ठीक है, या कौन-सी योजना उपयुक्त है, ताकि आपको ख़ुद सब जोड़ना न पड़े।',
      },
    },
    followUps: ['about.scope', 'tools.list', 'data.official'],
    cacheClass: 'reference',
    route: () => null,
  },
  {
    id: 'about.government',
    category: 'about',
    text: { en: 'Is Pahad Pulse a government app?', hi: 'क्या Pahad Pulse सरकारी ऐप है?' },
    params: NONE,
    keywords: [
      'government app',
      'official app',
      'sarkari app',
      'affiliated',
      'run by',
      'सरकारी ऐप',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: 'No. Pahad Pulse is an independent platform. It is not affiliated with, endorsed by or operated by the Government of Uttarakhand, the Government of India or any of their departments. The information it shows comes from those departments and other official publishers, and every figure links back to them.',
        hi: 'नहीं। Pahad Pulse एक स्वतंत्र प्लेटफ़ॉर्म है। यह उत्तराखंड सरकार, भारत सरकार या उनके किसी विभाग से संबद्ध, समर्थित या संचालित नहीं है। इसमें दिखाई जानकारी उन्हीं विभागों और अन्य आधिकारिक प्रकाशकों की है, और हर आँकड़ा उन तक लिंक करता है।',
      },
    },
    followUps: ['data.official', 'about.what'],
    cacheClass: 'reference',
    route: to('/sources'),
  },
  {
    id: 'about.scope',
    category: 'about',
    text: {
      en: "Why doesn't Pahad Pulse show live traffic or navigation?",
      hi: 'Pahad Pulse लाइव ट्रैफ़िक या नेविगेशन क्यों नहीं दिखाता?',
    },
    params: NONE,
    keywords: [
      'traffic',
      'live traffic',
      'navigation',
      'directions',
      'route',
      'google maps',
      'रास्ता',
      'ट्रैफ़िक',
      'नेविगेशन',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: "By design. The aim is to reduce complexity, not add to it. Live traffic and turn-by-turn navigation are already done well by map apps like Google Maps, so Pahad Pulse doesn't rebuild them; where you need directions, it opens your maps app. It focuses on what isn't in one place anywhere else: official signals, figures and tools for Uttarakhand.",
        hi: 'जानबूझकर। उद्देश्य जटिलता घटाना है, बढ़ाना नहीं। लाइव ट्रैफ़िक और नेविगेशन Google Maps जैसे ऐप पहले से अच्छी तरह करते हैं, इसलिए Pahad Pulse उन्हें दोबारा नहीं बनाता; रास्ते के लिए यह आपका मैप ऐप खोल देता है। इसका ध्यान उस पर है जो कहीं और एक जगह नहीं मिलता: उत्तराखंड के आधिकारिक संकेत, आँकड़े और टूल।',
      },
    },
    followUps: ['about.why', 'tools.tripcheck', 'roads.helpline'],
    cacheClass: 'reference',
    route: () => null,
  },
  {
    id: 'about.account',
    category: 'about',
    text: {
      en: 'Do I need an account to use Pahad Pulse?',
      hi: 'क्या Pahad Pulse के लिए खाता चाहिए?',
    },
    params: NONE,
    keywords: [
      'account',
      'sign up',
      'signup',
      'login',
      'log in',
      'register account',
      'खाता',
      'लॉगिन',
    ],
    resolver: about.statement,
    templates: {
      ok: {
        en: 'No. Everything in Pahad Pulse is open without an account or sign-in. Warning notifications in the app need only your permission.',
        hi: 'नहीं। Pahad Pulse में सब कुछ बिना खाते या लॉगिन के खुला है। ऐप में चेतावनी सूचनाओं के लिए केवल आपकी अनुमति चाहिए।',
      },
    },
    followUps: ['tools.notifications', 'about.what'],
    cacheClass: 'reference',
    route: () => null,
  },
];

/** Shown when the chat opens (§3.2): safety, weather, travel, fires, pilgrims, the state. */
export const STARTERS: readonly string[] = [
  'alerts.active',
  'weather.now',
  'travel.check',
  'fires.state',
  'tourism.chardham',
  'state.population',
];

export function findQuestion(id: string): Question | undefined {
  return QUESTIONS.find((question) => question.id === id);
}

export function questionsIn(category: CategoryId): Question[] {
  return QUESTIONS.filter((question) => question.category === category);
}
