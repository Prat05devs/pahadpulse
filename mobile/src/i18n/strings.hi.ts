import type { en } from './strings.en';

/**
 * Hindi, matched key for key against `strings.en.ts`.
 *
 * Typed as `Record<keyof typeof en, string>`, so a key added in English and forgotten here is
 * a compile error, not an English word sitting in a Hindi screen.
 *
 * Register: everyday Hindi as a reader in Uttarakhand would say it, not Sanskritised official
 * prose.
 * Widely understood English loanwords are kept in Devanagari where the Hindi equivalent would
 * be less clear to most readers — "ऐप", "सेटिंग्स", "मैप" — because this is safety-adjacent
 * information and comprehension beats purity.
 *
 * Numerals stay Latin (see Global constraints in project/overview.md).
 */
export const hi: Record<keyof typeof en, string> = {
  /* ── Shared ─────────────────────────────────────────────────────── */
  'common.loading': 'लोड हो रहा है',
  'common.tryAgain': 'फिर कोशिश करें',
  'common.seeAll': 'सभी देखें',
  'common.done': 'हो गया',
  'common.close': 'बंद करें',
  'common.nothingToShow': 'दिखाने के लिए कुछ नहीं',
  'common.sourceNotRecorded': 'स्रोत दर्ज नहीं है',
  'common.statewide': 'पूरे राज्य में',

  /* ── Freshness ──────────────────────────────────────────────────── */
  'freshness.fresh': 'अद्यतन',
  'freshness.stale': 'पुराना हो सकता है',
  'freshness.expired': 'पुराना',
  'freshness.unknown': 'कब का है, पता नहीं',
  'source.openedInBrowser': 'स्रोत: {department}. ब्राउज़र में खुलेगा।',
  'source.dataForRetrieved': '{vintage} के आँकड़े · {fetched} लिए गए',

  /* ── Error and empty states ─────────────────────────────────────── */
  'error.offline.title': 'इंटरनेट नहीं है',
  'error.offline.message':
    'दोबारा ऑनलाइन होने तक कुछ नया नहीं दिखेगा। सहेजे गए पेज अब भी काम करते हैं।',
  'error.timeout.title': 'सर्वर से जवाब आने में देर लग रही है',
  'error.timeout.message': 'कनेक्शन कमज़ोर हो सकता है। थोड़ी देर बाद कोशिश करें।',
  'error.notFound.title': 'नहीं मिला',
  'error.notFound.message': 'इस पेज पर अभी कोई आँकड़ा नहीं है। शायद प्रकाशित न हुआ हो।',
  'error.invalidResponse.title': 'अप्रत्याशित आँकड़ा',
  'error.invalidResponse.message': '{detail} यह गड़बड़ी हमारी तरफ़ से है, आपकी नहीं।',
  'error.generic.title': 'लोड नहीं हो सका',
  'error.generic.message': 'कोई अनपेक्षित गड़बड़ी हुई।',
  'error.savedData.title': 'सहेजा हुआ आँकड़ा दिख रहा है',
  'error.savedData.checked': 'ताज़ा नहीं हो सका · आख़िरी बार {when} देखा गया',
  'error.savedData.noConnection': 'ताज़ा नहीं हो सका। इंटरनेट आने पर फिर कोशिश करें।',

  /* ── Navigation ─────────────────────────────────────────────────── */
  'nav.today': 'आज',
  'nav.map': 'मैप',
  'nav.districts': 'ज़िले',
  'nav.alerts': 'चेतावनियाँ',
  'nav.more': 'और',
  'nav.home': 'होम',
  'nav.back': 'वापस',
  'nav.alert': 'चेतावनी',
  'nav.roads': 'सड़कें और हाईवे',
  'nav.tourism': 'पर्यटन और तीर्थयात्रा',
  'nav.connectivity': 'इंटरनेट कनेक्टिविटी',
  'nav.seismic': 'भूकंपीय गतिविधि',
  'nav.airQuality': 'वायु गुणवत्ता',
  'nav.compare': 'ज़िलों की तुलना',
  'nav.credits': 'आँकड़ों के स्रोत',
  'nav.settings': 'सेटिंग्स',
  'nav.notFound': 'नहीं मिला',

  /* ── Not found ──────────────────────────────────────────────────── */
  'notFound.title': 'यह पेज मौजूद नहीं है',
  'notFound.message': 'हो सकता है यह लिंक पुराना हो।',
  'notFound.goHome': 'होम स्क्रीन पर जाएँ',
  'notFound.goToToday': 'आज पर जाएँ',

  /* ── More tab ───────────────────────────────────────────────────── */
  'more.title': 'और',
  'more.inTheApp': 'ऐप में',
  'more.districts.subtitle': 'सभी तेरह, आँकड़ों और स्रोतों के साथ',
  'more.alerts.subtitle': 'मौसम, नदी, सड़क और आपदा की चेतावनियाँ',
  'more.map.subtitle': 'ज़िले, हाईवे और चेतावनियाँ, उभरे हुए नक़्शे पर',
  'more.tourism': 'पर्यटन',
  'more.tourism.subtitle': 'प्रकाशित चारधाम यात्री संख्या, धाम और वर्ष के अनुसार',
  'more.compare': 'ज़िलों की तुलना',
  'more.compare.subtitle': 'कारोबार में आसानी के लिहाज़ से ज़िलों की तुलना',
  'more.roads': 'सड़कें और हाईवे',
  'more.roads.subtitle': 'दर्ज राष्ट्रीय और राज्य राजमार्ग नेटवर्क',
  'more.connectivity': 'कनेक्टिविटी',
  'more.connectivity.subtitle': 'फ़िक्स्ड और मोबाइल नेटवर्क की रफ़्तार',
  'more.airQuality': 'वायु गुणवत्ता',
  'more.airQuality.subtitle': 'ज़िलेवार राष्ट्रीय AQI और प्रदूषक',
  'more.seismic': 'भूकंप',
  'more.seismic.subtitle': 'हाल के भूकंप',
  'more.settings.subtitle': 'भाषा, रूप-रंग और आपका डेटा',
  'more.credits': 'आँकड़े और तकनीक',
  'more.credits.subtitle': 'हर आँकड़ा और मैप कहाँ से आता है',

  /* ── Settings ───────────────────────────────────────────────────── */
  'settings.language': 'भाषा',
  'settings.language.subtitle': 'ऐप पर, और दोनों भाषाओं में प्रकाशित नामों पर लागू',
  'settings.language.note':
    'जहाँ स्रोत केवल एक भाषा में प्रकाशित करता है, वह नाम जैसा प्रकाशित हुआ वैसा ही दिखाया जाता है।',
  'settings.appearance': 'रूप-रंग',
  'settings.theme.system': 'सिस्टम',
  'settings.theme.light': 'हल्का',
  'settings.theme.dark': 'गहरा',
  'settings.yourData': 'आपका डेटा',
  'settings.followed': 'फ़ॉलो किए ज़िले',
  'settings.followed.subtitle': 'सिर्फ़ इसी फ़ोन में सहेजा जाता है',
  'settings.reset': 'सेटिंग्स रीसेट करें',
  'settings.reset.subtitle': 'भाषा, थीम और फ़ॉलो किए ज़िले मिटा देता है',
  'settings.reset.confirmTitle': 'सेटिंग्स रीसेट करें?',
  'settings.reset.confirmBody':
    'इससे इस फ़ोन पर आपकी भाषा, रूप-रंग और फ़ॉलो किए ज़िले मिट जाएँगे।',
  'settings.reset.cancel': 'रहने दें',
  'settings.reset.confirm': 'रीसेट करें',
  'settings.about': 'ऐप के बारे में',
  'settings.version': 'वर्ज़न',
  'settings.api': 'API',
  'settings.webPortal': 'वेब पोर्टल',
  'settings.support': 'सहायता',
  'settings.support.subtitle': 'मदद, सुधार और सुगम्यता पर आपकी राय',
  'settings.privacy': 'निजता नीति',
  'settings.privacy.subtitle': 'पहाड़ पल्स आपकी जानकारी कैसे रखता है',
  'settings.disclaimer':
    'पहाड़ पल्स उत्तराखंड सरकार के विभागों द्वारा प्रकाशित आँकड़ों को एक जगह लाता है। कोई भी आँकड़ा यह ख़ुद नहीं बनाता। जहाँ स्रोत आगे बाँटने पर रोक लगाता है, वह आँकड़ा ऐप में दिखता है पर निर्यात नहीं होता।',
  'settings.closeSettings': 'सेटिंग्स बंद करें',

  /* ── Credits ────────────────────────────────────────────────────── */
  'credits.title': 'आँकड़े और तकनीक',
  'credits.intro':
    'इस ऐप का हर आँकड़ा किसी और का प्रकाशित किया हुआ है, और यह रही उनकी सूची। यहाँ कुछ भी पहाड़ पल्स का लिखा हुआ नहीं है।',
  'credits.map.title': 'मैप',
  'credits.map.subtitle': 'बिना API key, और Google Maps नहीं',
  'credits.figures.title': 'आँकड़े',
  'credits.figures.subtitle': 'इन्हें प्रकाशित करने वाले विभाग',
  'credits.osm.detail':
    'ज़िलों की सीमाएँ, और वे हाईवे नंबर जिनसे NH और SH परतें मिलाई जाती हैं। OpenStreetMap के योगदानकर्ताओं ने जुटाए, Overpass के ज़रिए लिए गए।',
  'credits.terrain.detail':
    'पहाड़ी छाया और 3D दृश्य के पीछे का ऊँचाई मॉडल। AWS के सार्वजनिक डेटासेट रजिस्ट्री से, मूल रूप से Mapzen का।',
  'credits.openfreemap.detail': 'वह बेसमैप जिस पर ज़िले और हाईवे बनाए जाते हैं।',
  'credits.maplibre.detail':
    'नक़्शा बनाने वाला रेंडरर। यही ऐप और वेब पोर्टल दोनों इस्तेमाल करते हैं, ताकि दोनों मैप एक जैसे दिखें।',
  'credits.imd.detail': 'मौसम और आपदा की चेतावनियाँ, CAP प्रारूप में प्रकाशित।',
  'credits.openMeteo.detail': 'हर ज़िले के सबसे नज़दीकी स्टेशन के अवलोकन और पूर्वानुमान।',
  'credits.licence.odbl': 'Open Database Licence (ODbL)',
  'credits.licence.publicDataset': 'सार्वजनिक डेटासेट, बिना key',
  'credits.licence.freeNoKey': 'मुफ़्त, बिना API key',
  'credits.licence.bsd': 'BSD-3-Clause',
  'credits.licence.govIndia': 'भारत सरकार',
  'credits.licence.nonCommercial': 'ग़ैर-व्यावसायिक उपयोग के लिए मुफ़्त',
};
