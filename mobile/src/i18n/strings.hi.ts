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
  'credits.disclaimer.title': 'एक स्वतंत्र मंच',
  'credits.disclaimer.body':
    'पहाड़ पल्स कोई सरकारी ऐप नहीं है। यह उत्तराखंड सरकार, भारत सरकार या उनके किसी विभाग से संबद्ध, अनुमोदित या संचालित नहीं है। यहाँ दिखाई गई सरकारी जानकारी उसे प्रकाशित करने वाले विभाग की ही है, और हर आँकड़ा नीचे उसी विभाग से जुड़ा है।',
  'credits.official.title': 'आधिकारिक स्रोत',
  'credits.official.subtitle': 'हर डेटासेट, और उसे प्रकाशित करने वाला विभाग',
  'credits.official.loading': 'स्रोत सूची लोड हो रही है…',
  'credits.official.failed': 'स्रोत सूची लोड नहीं हो सकी।',
  'credits.official.openHint': 'प्रकाशक की अपनी वेबसाइट खोलता है',
  'credits.official.updated': 'अंतिम जाँच {date}',
  'credits.contact.title': 'संपर्क',
  'credits.contact.body': 'सवाल, सुधार और डेटा संबंधी अनुरोध:',
  'credits.contact.email': 'admin@wtsolutions.cc',

  /* ── Today ──────────────────────────────────────────────────────── */
  'today.brand': 'पहाड़ पल्स',
  'today.title': 'आज उत्तराखंड में',
  'today.headerLabel': 'पहाड़ पल्स। आज उत्तराखंड में',
  'today.openSettings': 'सेटिंग्स खोलें',
  'today.openSettings.hint': 'भाषा, रूप-रंग और ऐप की पसंद खोलता है',
  'today.activeAlerts': 'चालू चेतावनियाँ',
  'today.severeOrWorse': '{count} गंभीर या उससे ज़्यादा',
  'today.villages': '{count} गाँव',
  'today.glance.title': 'एक नज़र में उत्तराखंड',
  'today.glance.subtitle': 'राज्य के प्रकाशित आँकड़े',
  'today.glance.loading': 'राज्य की जानकारी आ रही है',
  'today.glance.empty': 'राज्य के आँकड़े उपलब्ध नहीं',
  'today.following.title': 'आप जिन्हें देख रहे हैं',
  'today.following.subtitle': 'आपके सहेजे ज़िले',
  'today.following.manage': 'बदलें',
  'today.follow.title': 'कोई ज़िला फ़ॉलो करें',
  'today.follow.body': 'सहेजे गए ज़िले यहाँ अपने मौसम और चेतावनियों के साथ दिखेंगे।',
  'today.follow.browse': 'देखें',
  'today.follow.browseLabel': 'ज़िले देखें',
  'today.alerts.title': 'ताज़ा चेतावनियाँ',
  'today.alerts.subtitle': 'IMD, CWC और ज़िला प्रशासन द्वारा जारी',
  'today.alerts.loading': 'चेतावनियाँ आ रही हैं',
  'today.alerts.empty': 'कोई चालू चेतावनी नहीं',
  'today.alerts.emptyMessage': 'इस समय राज्य में कोई चेतावनी लागू नहीं है।',
  'today.districts.subtitle': 'आँकड़ों और स्रोतों के लिए कोई ज़िला खोलें',
  'today.districts.loading': 'ज़िले आ रहे हैं',
  'today.districts.empty': 'कोई ज़िला लोड नहीं हुआ',
  'today.explore.title': 'और देखें',
  'today.explore.subtitle': 'राज्य की और जानकारी',
  'today.explore.tourism': 'पर्यटन',
  'today.explore.business': 'कारोबार',
  'today.explore.compare': 'तुलना करें',
  'today.explore.connectivity': 'कनेक्टिविटी',
  'today.explore.network': 'नेटवर्क',
  'today.explore.roads': 'सड़कें',
  'today.explore.highways': 'हाईवे',
  'today.promise':
    'पहाड़ पल्स आँकड़े ख़ुद नहीं बनाता। हर आँकड़े के साथ यह दिखता है कि उसे किस विभाग ने प्रकाशित किया, वह किस तारीख़ का है, और कितना ताज़ा है।',

  /* ── Alert vocabulary (data encodings, shown as words) ──────────── */
  'severity.minor': 'हल्की',
  'severity.moderate': 'मध्यम',
  'severity.severe': 'गंभीर',
  'severity.extreme': 'अत्यंत गंभीर',
  'severity.unknown': 'अज्ञात',
  'alertType.all': 'सभी',
  'alertType.weather': 'मौसम',
  'alertType.river': 'नदी',
  'alertType.flood': 'बाढ़',
  'alertType.road': 'सड़क',
  'alertType.disaster': 'आपदा',

  /* ── Alerts ─────────────────────────────────────────────────────── */
  'alerts.inForce': '{count} लागू',
  'alerts.savedActive': '{count} सहेजी गईं, आख़िरी बार देखे जाने पर लागू थीं',
  'alerts.savedTitle': 'सहेजी गई चेतावनियाँ दिख रही हैं',
  'alerts.savedPullDown': 'ताज़ा नहीं हो सका। दोबारा कोशिश के लिए नीचे खींचें।',
  'alerts.empty.all': 'कोई चालू चेतावनी नहीं',
  'alerts.empty.filtered': '{type} से जुड़ी कोई चेतावनी नहीं',
  'alerts.empty.allMessage': 'इस समय उत्तराखंड में कोई चेतावनी लागू नहीं है।',
  'alerts.empty.filteredMessage': 'कोई दूसरी श्रेणी देखें, या ताज़ा करने के लिए नीचे खींचें।',
  'alerts.card.label': '{severity} स्तर की {type} चेतावनी। {headline}। प्रभावित: {areas}।',
  'alerts.card.areasMore': '{areas} +{count}',

  /* ── Districts ──────────────────────────────────────────────────── */
  'districts.search': '{count} ज़िलों में खोजें',
  'districts.searchLabel': 'ज़िले खोजें',
  'districts.clearSearch': 'खोज मिटाएँ',
  'districts.noMatch': 'इससे मिलता कोई ज़िला नहीं',
  'districts.noMatchMessage': '"{query}" के लिए कुछ नहीं मिला। नाम का कुछ हिस्सा लिखकर देखें।',
  'districts.countOf': '{total} में से {shown} ज़िले',
  'districts.cardLabel': '{name} ज़िला',
  'districts.counts': '{tehsils} तहसील · {villages} गाँव',
  'districts.follow': '{name} को फ़ॉलो करें',
  'districts.unfollow': '{name} को फ़ॉलो करना बंद करें',
  'districts.division': '{division} मंडल',
  'districts.tileLabel': '{name}, {degrees} डिग्री',
  'districts.noStation': 'कोई स्टेशन नहीं',

  /* ── Alert lifecycle vocabulary ─────────────────────────────────── */
  'urgency.unknown': 'तात्कालिकता अज्ञात',
  'urgency.immediate': 'तुरंत',
  'urgency.expected': 'अपेक्षित',
  'urgency.future': 'आगे चलकर',
  'urgency.past': 'बीत चुकी',
  'certainty.unknown': 'निश्चितता अज्ञात',
  'certainty.observed': 'देखी गई',
  'certainty.likely': 'संभावित',
  'certainty.possible': 'हो सकती है',
  'certainty.unlikely': 'कम संभावना',

  /* ── Alert detail ───────────────────────────────────────────────── */
  'alertDetail.meta': '{type} · {urgency} · {certainty}',
  'alertDetail.issued': 'जारी हुई',
  'alertDetail.inForceFrom': 'लागू',
  'alertDetail.expires': 'समाप्ति',
  'alertDetail.authority': 'जारीकर्ता',
  'alertDetail.affectedAreas': 'प्रभावित क्षेत्र',
  'alertDetail.openArea': '{name} खोलें',
  'alertDetail.originalNotice': 'मूल सूचना पढ़ें',
  'alertDetail.originalNoticeLabel': 'मूल सूचना खोलें',
  'alertDetail.dateTime': '{date}, {time}',

  /* ── District detail ────────────────────────────────────────────── */
  'districtDetail.loading': '{name} आ रहा है',
  'districtDetail.hq': 'मुख्यालय {name}',
  'districtDetail.noBoundary': 'नक़्शे की सीमा उपलब्ध नहीं',
  'districtDetail.weather': 'मौसम',
  'districtDetail.weather.subtitle': 'सबसे नज़दीकी वेधशाला',
  'districtDetail.weather.loading': 'मौसम आ रहा है',
  'districtDetail.alerts.subtitle': '{name} के लिए लागू चेतावनियाँ',
  'districtDetail.alerts.empty': 'इस ज़िले के लिए इस समय कोई चेतावनी लागू नहीं है।',
  'districtDetail.stats': 'आँकड़े',
  'districtDetail.stats.subtitle': 'हर आँकड़े के साथ उसका स्रोत',
  'districtDetail.stats.loading': 'आँकड़े आ रहे हैं',
  'districtDetail.stats.empty': 'कोई प्रकाशित आँकड़ा नहीं',
  'districtDetail.stats.emptyMessage': 'इस ज़िले के लिए अभी कुछ प्रकाशित नहीं हुआ है।',
  'districtDetail.connectivity': 'कनेक्टिविटी',
  'districtDetail.connectivity.subtitle': 'Speedtest से मापी गई रफ़्तार',

  /* ── Weather ────────────────────────────────────────────────────── */
  'weather.rain': 'वर्षा',
  'weather.humidity': 'नमी',
  'weather.wind': 'हवा',
  'weather.nextDays': 'अगले {count} दिन',

  /* ── Map ────────────────────────────────────────────────────────── */
  'map.layer.districts': 'ज़िले',
  'map.layer.alerts': 'चेतावनियाँ',
  'map.layer.highways': 'हाईवे',
  'map.loading': 'मैप आ रहा है',
  'map.drawing': 'भू-आकृति बन रही है',
  'map.zoomIn': 'ज़ूम इन',
  'map.zoomOut': 'ज़ूम आउट',
  'map.fitState': 'पूरा राज्य दिखाएँ',
  'map.credits': 'मैप के स्रोत और श्रेय',
  'map.creditsTitle': 'मैप के स्रोत',
  'map.creditsClose': 'मैप के स्रोत बंद करें',
  'map.creditsBody':
    'ज़िलों की सीमाएँ और हाईवे नंबर OpenStreetMap से हैं। ऊँचाई AWS Terrain Tiles के सार्वजनिक डेटासेट से है। इस मैप के लिए किसी API key की ज़रूरत नहीं है।',
  'map.label':
    'उत्तराखंड का इंटरैक्टिव मैप, {count} ज़िलों के साथ। हर ज़िले की सुलभ सूची के लिए ज़िले टैब खोलें।',

  'alertDetail.whatToDo': 'क्या करें',
  'alertDetail.dateTimeRelative': '{date}, {time} ({relative})',

  'districtDetail.connectivity.loading': 'कनेक्टिविटी आ रही है',
  'districtDetail.connectivity.empty': 'नेटवर्क का कोई माप नहीं',
  'districtDetail.connectivity.emptyMessage':
    'पिछली तिमाही में इस ज़िले के लिए Speedtest का कोई माप दर्ज नहीं हुआ।',
  'districtDetail.tehsils': 'तहसीलें',
  'districtDetail.tehsils.subtitle': 'इस ज़िले में {count}',
  'districtDetail.tehsils.empty': 'कोई तहसील दर्ज नहीं',
  'districtDetail.villages': '{count} गाँव',

  /* ── Air quality ────────────────────────────────────────────────── */
  'air.loading': 'वायु गुणवत्ता आ रही है',
  'air.empty': 'वायु गुणवत्ता का कोई माप नहीं',
  'air.emptyMessage': 'हर घंटे चलने वाली प्रक्रिया के साथ आँकड़े आते हैं।',
  'air.missing': ' · {count} उपलब्ध नहीं',
  'air.byDistrict': 'ज़िलेवार',
  'air.byDistrict.subtitle': 'राष्ट्रीय AQI, PM2.5 और PM10',
  'air.observed': '{when} दर्ज',
  'air.caveat':
    'ये ज़िला मुख्यालयों के लिए मॉडल से लगाए गए अनुमान हैं, किसी संदर्भ-श्रेणी के ज़मीनी मॉनिटर की रीडिंग नहीं। जहाँ CPCB के आँकड़े उपलब्ध हों, वही अधिकृत माने जाएँ।',
  'air.rivers': 'नदियों का जलस्तर यहाँ अभी प्रकाशित नहीं होता।',

  /* ── Connectivity ───────────────────────────────────────────────── */
  'net.loading': 'नेटवर्क के आँकड़े आ रहे हैं',
  'net.empty': 'नेटवर्क का कोई माप नहीं',
  'net.spread': 'राज्य में अंतर',
  'net.spread.subtitle': '{quarter} के माप',
  'net.spreadRatio': '{ratio}× अंतर',
  'net.ranking': 'ज़िलों की सूची',
  'net.ranking.subtitle': 'डाउनलोड, अपलोड, लेटेंसी और नमूनों की संख्या',
  'net.fixed': 'फ़िक्स्ड ब्रॉडबैंड',
  'net.mobile': 'मोबाइल',
  'net.thinSample': 'कम नमूने',
  'net.howToRead': 'इसे कैसे पढ़ें',
  'net.caveat':
    'ये आँकड़े बताते हैं कि जिन लोगों ने Speedtest चलाया उन्हें असल में क्या रफ़्तार मिली। ये यह नहीं बताते कि हर गाँव तक कनेक्शन है या नहीं।',
  'net.caveatLong':
    'स्पीड टेस्ट लोग ख़ुद चुनकर चलाते हैं, इसलिए ये मापी गई रफ़्तार की तुलना करते हैं — सबको कनेक्शन मिलने की नहीं। कम नमूनों वाले आँकड़े सावधानी से पढ़ें। BharatNet की तैयारी और ऑपरेटर कवरेज अभी लोड नहीं किए गए हैं।',

  /* ── Roads ──────────────────────────────────────────────────────── */
  'roads.notOpenStatus': 'यह नहीं बताता कि सड़क खुली है या बंद।',
  'roads.loading': 'सड़क नेटवर्क आ रहा है',
  'roads.empty': 'सड़कों के आँकड़े नहीं',
  'roads.register': 'हाईवे रजिस्टर',
  'roads.register.subtitle': 'संदर्भ और मैप किए गए हिस्सों की संख्या',
  'roads.national': 'राष्ट्रीय ({count})',
  'roads.state': 'राज्य ({count})',
  'roads.openMap': 'हाईवे मैप खोलें',
  'roads.networkRead': ' नेटवर्क {date} को पढ़ा गया।',

  /* ── Seismic ────────────────────────────────────────────────────── */
  'seismic.loading': 'भूकंप के आँकड़े आ रहे हैं',
  'seismic.events': 'दर्ज भूकंप',
  'seismic.events.subtitle': 'तीव्रता, समय, गहराई और समीक्षा की स्थिति',
  'seismic.empty': 'हाल में कोई भूकंप नहीं',
  'seismic.largest': '; सबसे बड़ा M{magnitude}, {place} के पास',
  'seismic.depth': '{depth} किमी गहराई',
  'seismic.openRecord': 'तीव्रता {magnitude} के भूकंप का स्रोत रिकॉर्ड खोलें',
  'seismic.caveat':
    'ये भूकंप हो चुके हैं। भूकंप की भविष्यवाणी नहीं की जा सकती, और स्वतः निकाले गए आँकड़े बाद में संशोधित हो सकते हैं।',

  /* ── Tourism ────────────────────────────────────────────────────── */
  'tourism.loading': 'यात्रियों की संख्या आ रही है',
  'tourism.empty': 'यात्रियों के आँकड़े नहीं',
  'tourism.touristsIn': '{year} में पर्यटक',
  'tourism.acrossDestinations': 'सूचीबद्ध स्थलों पर कुल {count} (जारी)',
  'tourism.record': '{count} (अब तक का सर्वाधिक)',
  'tourism.byDestination': 'स्थल के अनुसार यात्री',
  'tourism.selectYear': 'कोई प्रकाशित वर्ष चुनें',
  'tourism.tentative': 'अस्थायी आँकड़े',
  'tourism.total': 'सूचीबद्ध स्थलों का कुल',
  'tourism.caveat':
    'ये राज्य पर्यटन विभाग द्वारा प्रकाशित सालाना कुल संख्याएँ हैं। ये यह नहीं बतातीं कि इस समय किसी धाम पर कितनी भीड़ है।',
  'tourism.ongoing':
    '2026 की यात्रा अभी चल रही है। ये आँकड़े नवीनतम उपलब्ध अनुमान हैं, अंतिम नहीं।',
  'tourism.suspended':
    'जिन वर्षों में यात्रा रुकी या सीमित रही, वे जैसे प्रकाशित हुए वैसे ही दिखाए गए हैं — गिरावट ऐतिहासिक है, आँकड़ों की कमी नहीं।',

  /* ── Compare districts ──────────────────────────────────────────── */
  'compare.metric.connectivity': 'डिजिटल कनेक्टिविटी',
  'compare.metric.tourism': 'पर्यटकों की आवाजाही',
  'compare.metric.roads': 'सड़क ढाँचा',
  'compare.metric.urbanPopulation': 'शहरी बाज़ार का आकार',
  'compare.metric.agriculture': 'कृषि/दुग्ध उत्पादन',
  'compare.metric.safety': 'भूगर्भीय सुरक्षा',
  'compare.choicesHint': 'विकल्पों की सूची खोलता है',
  'compare.select': 'चुनें...',
  'compare.whatBusiness': 'आप कौन-सा कारोबार सोच रहे हैं?',
  'compare.districtA': 'इनकी तुलना',
  'compare.districtB': 'इनसे',
  'compare.vs': 'बनाम',
  'compare.sameDistrict': 'दो अलग-अलग ज़िले चुनें।',
  'compare.run': 'तुलना करें',
  'compare.runHint': 'दोनों ज़िलों की आमने-सामने सिफ़ारिश बनाता है',
  'compare.scenariosFailed': 'कारोबार के प्रकार लोड नहीं हो सके।',
  'compare.retryScenarios': 'कारोबार के प्रकार दोबारा लोड करें',
  'compare.failed': 'तुलना लोड नहीं हो सकी।',
  'compare.tie': 'दोनों बराबर!',
  'compare.recommended': '{name} बेहतर रहेगा',
  'compare.insufficient': 'सिफ़ारिश के लिए पर्याप्त प्रमाण नहीं',
  'compare.notScored': 'आकलन नहीं',
  'compare.confidence.low': 'कम विश्वसनीयता',
  'compare.confidence.medium': 'मध्यम विश्वसनीयता',
  'compare.confidence.high': 'उच्च विश्वसनीयता',
  'compare.coverage': 'इस कारोबार के {pct}% कारकों के पीछे मापे गए आँकड़े हैं।',
  'compare.notScoredList': 'आकलन नहीं: {metrics}',
  'compare.closeChoices': '{label} के विकल्प बंद करें',

  /* ── Small labels (shown uppercase in English) ──────────────────── */
  'air.statePicture': 'राज्य की तस्वीर',
  'air.dominant': 'प्रमुख प्रदूषक',
  'districtDetail.download': 'डाउनलोड',
  'districtDetail.upload': 'अपलोड',
  'districtDetail.latency': 'लेटेंसी',
  'districtDetail.lgdCode': 'LGD कोड',
  'districtDetail.tehsilsUpper': 'तहसीलें',
  'districtDetail.stillCompiling': 'अभी संकलित हो रहा है',
  'districtDetail.notCoverage': 'मापे गए नतीजे कवरेज का नक़्शा या विज्ञापित रफ़्तार नहीं हैं।',
  'roads.nationalUpper': 'राष्ट्रीय राजमार्ग',
  'roads.stateUpper': 'राज्य राजमार्ग',
  'seismic.last30Days': 'पिछले 30 दिन',
  'seismic.openEventRecord': 'भूकंप का रिकॉर्ड खोलें',
};
