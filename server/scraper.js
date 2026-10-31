import axios from 'axios';
import * as cheerio from 'cheerio';
import xml2js from 'xml2js';
import { translateArticle, translateArticleDetail } from './translator.js';

const PIB_URLS = {
  hi_rss: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=2&Regid=3',
  hi_page: 'https://pib.gov.in/Allrel.aspx?reg=3&lang=2',
  en_page: 'https://pib.gov.in/Allrel.aspx?reg=3&lang=1',
  ta_rss: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=8&Regid=3',
  te_rss: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=9&Regid=3',
  gu_rss: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=5&Regid=3',
};

// In-memory cache for fast response
const cache = {
  hi: { data: [], timestamp: 0 },
  en: { data: [], timestamp: 0 },
  ta: { data: [], timestamp: 0 },
  te: { data: [], timestamp: 0 },
  gu: { data: [], timestamp: 0 },
  details: new Map(),
};

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

// Multilingual categorization helper
export function categorizeArticle(title = '', desc = '', ministry = '') {
  const text = `${title} ${desc} ${ministry}`.toLowerCase();

  // Agriculture keywords (Hindi, English, Tamil, Telugu, Gujarati)
  if (
    /कृषि|किसान|फसल|बीज|उर्वरक|ग्रामीण|सिंचाई|मंडी|पशुपालन|मत्स्य|मखाना|agri|farmer|crop|fertilizer|rural|soil|mandi|pm-kisan|icar|harvest|horticulture|monsoon|makhana|விவசாய|உழவர்|பயிர்|விதை|உரம்|వ్యవసాయ|రైతు|పంట|విత్తనాలు|ఎరువులు|કૃષિ|ખેડૂત|પાક|બિયારણ|ખાતર/i.test(text)
  ) {
    return 'agriculture';
  }

  // Technology keywords
  if (
    /तकनीक|डिजिटल|उपग्रह|विज्ञान|एआई|इंटरनेट|इसरो|डीआरडीओ|इलेक्ट्रॉनिक्स|साइबर|रोबोट|tech|digital|space|isro|drdo|ai|cyber|software|electronics|innovation|engineering|telecom|satellite|தொழில்நுட்ப|விஞ்ஞான|செயற்கை நுண்ணறிவு|ఇస్రో|సాంకేతిక|డిజిటલ|సైన్స్|ટેકનોલોજી|ડિજિટલ|ઇસરો|વિજ્ઞાન/i.test(text)
  ) {
    return 'technology';
  }

  // Economy keywords
  if (
    /वित्त|बजट|वाणिज्य|उद्योग|जीएसटी|निर्यात|आयात|निवेश|बैंक|आरबीआई|अर्थव्यवस्था|टैक्स|शेयर|कारोबार|cbam|economy|finance|budget|commerce|trade|export|import|tax|rbi|industry|business|msme|market|gdp|பொருளாதார|வர்த்தக|ஏற்றுமதி|வரி|ఆర్థిక|వాణిజ్య|ఎగుమతి|పన్ను|અર્થતંત્ર|વેપાર|નિકાસ|બજેટ/i.test(text)
  ) {
    return 'economy';
  }

  // Health keywords
  if (
    /स्वास्थ्य|अस्पताल|चिकित्सा|आयुष|पोषण|दवा|टीका|रोग|कल्याण|डॉक्टर|योग|health|medicine|hospital|ayush|nutrition|vaccine|disease|medical|welfare|yoga|pharma|wellness|சுகாதார|மருத்துவ|தடுப்பூசி|ஆரோக்கிய|వైద్య|ఆరోగ్య|ఔషధ|આરોગ્ય|તબીબી|દવા|રસી/i.test(text)
  ) {
    return 'health';
  }

  // Environment keywords
  if (
    /पर्यावरण|जलवायु|सौर|ऊर्जा|वन|प्रदूषण|नवीकरणीय|जल शक्ति|गंगा|environment|climate|solar|energy|forest|green|pollution|renewable|water|power|clean|சுற்றுச்சூழல்|சூரிய சக்தி|மின்சாரம்|పర్యావరణ|సౌర విద్యుత్|నీరు|પર્યાવરણ|સૌર ઊર્જા|પ્રદૂષણ/i.test(text)
  ) {
    return 'environment';
  }

  return 'governance';
}

// Generate simple 2-3 sentence summary/takeaways for Kisan mode
export function generateKeyPoints(paragraphs = [], title = '', lang = 'hi') {
  const points = [];
  if (paragraphs.length > 0) {
    for (const p of paragraphs.slice(0, 4)) {
      const clean = p.trim().replace(/\s+/g, ' ');
      if (clean.length > 30 && clean.length < 240 && !clean.startsWith('***') && !clean.includes('PIB') && !clean.includes('पीआईबी')) {
        points.push(clean);
      }
      if (points.length >= 3) break;
    }
  }
  if (points.length === 0 && title) {
    points.push(title);
  }
  return points;
}

// Check if string has Devanagari/Hindi characters
export function isHindiText(str = '') {
  return /[\u0900-\u097F]/.test(str);
}

// Scrape / Fetch PIB Feed according to Language
export async function fetchPibFeed(lang = 'hi', forceRefresh = false) {
  const now = Date.now();
  const safeLang = ['hi', 'en', 'ta', 'te', 'gu'].includes(lang) ? lang : 'hi';
  const cached = cache[safeLang];

  if (!forceRefresh && cached && cached.data.length > 0 && (now - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (safeLang === 'en') {
    // 1. ENGLISH FEED SCRAPER
    try {
      const response = await axios.get(PIB_URLS.en_page, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const items = [];

      $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim();
        
        if (
          (href.includes('PRID=') || href.includes('PressReleaseDetail') || href.includes('PressReleasePage')) &&
          title.length > 15 &&
          !isHindiText(title) &&
          !title.toLowerCase().includes('skip to') &&
          !title.toLowerCase().includes('screen reader')
        ) {
          const pridMatch = href.match(/PRID=(\d+)/i);
          const prid = pridMatch ? pridMatch[1] : `pib-en-${items.length + 1}`;

          if (!items.some((i) => i.id === prid || i.title === title)) {
            const category = categorizeArticle(title, '');
            items.push({
              id: prid,
              prid: prid,
              title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
              link: href.startsWith('http') ? href : `https://pib.gov.in${href.startsWith('/') ? '' : '/'}${href}`,
              iframeLink: `https://pib.gov.in/PressReleaseIframePage.aspx?PRID=${prid}`,
              pubDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
              description: `Official press release from Government of India regarding ${title}.`,
              category: category,
              lang: 'en',
              source: 'Press Information Bureau (PIB), GoI',
            });
          }
        }
      });

      if (items.length > 0) {
        const allEn = [...items, ...getFallbackData('en').filter((fb) => !items.some((it) => it.id === fb.id))];
        cache.en = { data: allEn, timestamp: now };
        return allEn;
      }
    } catch (err) {
      console.error('[Scraper] Error fetching English PIB page:', err.message);
    }

    const fallbackEn = getFallbackData('en');
    cache.en = { data: fallbackEn, timestamp: now };
    return fallbackEn;

  } else if (safeLang === 'hi') {
    // 2. MASTER HINDI RSS FEED SCRAPER
    try {
      const response = await axios.get(PIB_URLS.hi_rss, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
      });

      const parser = new xml2js.Parser({ explicitArray: false, trim: true });
      const parsed = await parser.parseStringPromise(response.data);
      const rawItems = parsed?.rss?.channel?.item || [];
      const itemsArray = Array.isArray(rawItems) ? rawItems : (rawItems ? [rawItems] : []);

      const articles = itemsArray.map((item, idx) => {
        const title = item.title || 'प्रेस विज्ञप्ति';
        const link = item.link || '';
        const pubDate = item.pubDate || new Date().toISOString();
        const description = item.description || '';
        
        const pridMatch = link.match(/PRID=(\d+)/i);
        const prid = pridMatch ? pridMatch[1] : `pib-hi-${idx}`;
        const category = categorizeArticle(title, description);

        return {
          id: prid,
          prid: prid,
          title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
          link: link || `https://pib.gov.in/PressReleasePage.aspx?PRID=${prid}`,
          iframeLink: `https://pib.gov.in/PressReleaseIframePage.aspx?PRID=${prid}`,
          pubDate: pubDate,
          description: description || `भारत सरकार द्वारा जारी आधिकारिक प्रेस विज्ञप्ति: ${title}`,
          category: category,
          lang: 'hi',
          source: 'Press Information Bureau (PIB), GoI',
        };
      });

      const fallbacks = getFallbackData('hi');
      const combined = [...articles, ...fallbacks.filter((fb) => !articles.some((it) => it.id === fb.id))];
      cache.hi = { data: combined, timestamp: now };
      return combined;
    } catch (err) {
      console.error('[Scraper] Error fetching Hindi PIB feed:', err.message);
    }

    const fallbackHi = getFallbackData('hi');
    cache.hi = { data: fallbackHi, timestamp: now };
    return fallbackHi;

  } else {
    // 3. REGIONAL FEEDS (Tamil, Telugu, Gujarati) - Full Master Feed with Cross-Lingual Translation
    try {
      // First obtain full national live feed
      const masterFeed = await fetchPibFeed('hi', forceRefresh);
      const fallbacks = getFallbackData(safeLang);

      // Translate all master articles in parallel into the target regional language
      const translatedMaster = await Promise.all(
        masterFeed.map((art) => translateArticle(art, safeLang))
      );

      // Merge native regional curated articles at the top with translated live feed
      const mergedList = [
        ...fallbacks,
        ...translatedMaster.filter((tm) => !fallbacks.some((fb) => fb.id === tm.id || fb.prid === tm.prid)),
      ];

      cache[safeLang] = { data: mergedList, timestamp: now };
      return mergedList;
    } catch (err) {
      console.error(`[Scraper] Error generating multilingual feed for ${safeLang}:`, err.message);
    }

    const fallbackRegional = getFallbackData(safeLang);
    cache[safeLang] = { data: fallbackRegional, timestamp: now };
    return fallbackRegional;
  }
}

// Fetch Full Article Details from PIB
export async function fetchArticleDetail(prid, lang = 'hi') {
  if (!prid) throw new Error('PRID is required');

  const safeLang = ['hi', 'en', 'ta', 'te', 'gu'].includes(lang) ? lang : 'hi';
  const cacheKey = `${prid}_${safeLang}`;
  if (cache.details.has(cacheKey)) {
    return cache.details.get(cacheKey);
  }

  const targetUrl = `https://pib.gov.in/PressReleasePage.aspx?PRID=${prid}`;

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 12000,
    });

    const $ = cheerio.load(response.data);

    let title = $('h2').first().text().trim() || 
                $('h3').first().text().trim() || 
                $('.ReleaseHeadline').text().trim() || 
                $('title').text().replace(': Press Information Bureau', '').trim();

    let ministry = $('#lblMinistry').text().trim() || 
                   $('.MinistryName').text().trim() || 
                   $('.innner-content h3').first().text().trim();

    let releaseDate = $('#lblReleaseDate').text().trim() || 
                      $('.ReleaseDate').text().trim() || 
                      $('.innner-content .release-date').text().trim();

    const paragraphs = [];
    const images = [];

    const contentArea = $('.innner-content, .release-content, #pageContent, form');
    
    contentArea.find('p').each((_, el) => {
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (text && !text.startsWith('***') && !text.includes('उपयोग संबंधी शर्तें') && text.length > 15) {
        paragraphs.push(text);
      }
    });

    contentArea.find('img').each((_, el) => {
      let src = $(el).attr('src');
      if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('header')) {
        if (src.startsWith('/')) src = `https://pib.gov.in${src}`;
        images.push(src);
      }
    });

    const category = categorizeArticle(title, paragraphs.join(' '), ministry);
    const keyTakeaways = generateKeyPoints(paragraphs, title, safeLang);

    let rawResult = {
      id: prid,
      prid: prid,
      title: title,
      ministry: ministry || (safeLang === 'ta' ? 'இந்திய அரசு' : safeLang === 'te' ? 'భారత ప్రభుత్వం' : safeLang === 'gu' ? 'ભારત સરકાર' : safeLang === 'hi' ? 'भारत सरकार' : 'Government of India'),
      releaseDate: releaseDate || new Date().toLocaleDateString(),
      paragraphs: paragraphs.length > 0 ? paragraphs : [title],
      keyTakeaways: keyTakeaways,
      images: images.slice(0, 3),
      category: category,
      originalUrl: targetUrl,
      lang: safeLang === 'en' ? 'en' : 'hi',
    };

    // If target language is Tamil, Telugu, or Gujarati, translate the full detail
    if (safeLang === 'ta' || safeLang === 'te' || safeLang === 'gu') {
      rawResult = await translateArticleDetail(rawResult, safeLang);
    }

    cache.details.set(cacheKey, rawResult);
    return rawResult;
  } catch (err) {
    console.error(`[Scraper] Error fetching detail for PRID ${prid}:`, err.message);

    const feed = cache[safeLang]?.data || [];
    const item = feed.find((i) => i.prid === prid) || {};

    let fallbackResult = {
      id: prid,
      prid: prid,
      title: item.title || 'Press Release',
      ministry: safeLang === 'ta' ? 'இந்திய அரசு' : safeLang === 'te' ? 'భారత ప్రభుత్వం' : safeLang === 'gu' ? 'ભારત સરકાર' : safeLang === 'hi' ? 'भारत सरकार' : 'Government of India',
      releaseDate: item.pubDate || new Date().toLocaleDateString(),
      paragraphs: [
        item.description || item.title || 'Full details available on the official PIB portal.'
      ],
      keyTakeaways: [item.title || ''],
      images: [],
      category: item.category || 'governance',
      originalUrl: targetUrl,
      lang: safeLang,
    };

    if (safeLang === 'ta' || safeLang === 'te' || safeLang === 'gu') {
      fallbackResult = await translateArticleDetail(fallbackResult, safeLang);
    }

    return fallbackResult;
  }
}

// Fallback seed data in case PIB server times out
export function getFallbackData(lang = 'hi') {
  if (lang === 'hi') {
    return [
      {
        id: '2301058',
        prid: '2301058',
        title: 'भारत का मखाना सेक्टर: पारंपरिक फसल से ग्लोबल सुपरफूड तक की प्रेरक यात्रा',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2301058',
        pubDate: '19 Aug 2026 10:00:00 GMT',
        description: 'मखाना उत्पादन, प्रसंस्करण और वैश्विक निर्यात को बढ़ावा देने के लिए नई योजनाओं और सब्सिडी की घोषणा।',
        category: 'agriculture',
        lang: 'hi',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2301039',
        prid: '2301039',
        title: 'वाणिज्य विभाग द्वारा निर्यातकों के लिए यूरोपीय संघ के कार्बन बॉर्डर एडजस्टमेंट मैकेनिज्म (CBAM) नियमों पर जागरूकता सत्र का आयोजन',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2301039',
        pubDate: '19 Aug 2026 09:00:00 GMT',
        description: 'भारतीय निर्यातकों को वैश्विक मानकों और ईयू सीएबीएम नियमों की तकनीकी जानकारी देने के लिए विशेष सत्र आयोजित किया गया।',
        category: 'economy',
        lang: 'hi',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2300990',
        prid: '2300990',
        title: 'कृषि एवं किसान कल्याण मंत्रालय द्वारा पीएम-किसान और मृदा स्वास्थ्य कार्ड योजना के तहत नए डिजिटल टूल्स जारी',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2300990',
        pubDate: '19 Aug 2026 06:15:00 GMT',
        description: 'किसानों को मौसम पूर्वानुमान, सटीक उर्वरक सलाह और प्रत्यक्ष वित्तीय सहायता ट्रैकिंग की सुविधा मोबाइल ऐप पर मिलेगी।',
        category: 'agriculture',
        lang: 'hi',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2300970',
        prid: '2300970',
        title: 'नवीन एवं नवीकरणीय ऊर्जा मंत्रालय द्वारा पीएम-कुसुम योजना के तहत सौर पंपों की स्थापना में रिकॉर्ड वृद्धि',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2300970',
        pubDate: '19 Aug 2026 04:45:00 GMT',
        description: 'किसानों को दिन के समय निर्बाध सौर बिजली मिलने से सिंचाई लागत में 70% तक की भारी बचत।',
        category: 'environment',
        lang: 'hi',
        source: 'Press Information Bureau (PIB), GoI',
      }
    ];
  } else if (lang === 'ta') {
    return [
      {
        id: '2302001',
        prid: '2302001',
        title: 'இந்தியாவின் மகானா விவசாயம்: பாரம்பரிய பயிரிலிருந்து உலகளாவிய சூப்பர்ஃபுட் வரை புதிய திட்டம்',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2302001',
        pubDate: '19 Aug 2026 10:00:00 GMT',
        description: 'விவசாயிகளின் வருமானத்தை உயர்த்தவும் மகானா பதப்படுத்துதல் மற்றும் ஏற்றுமதியை அதிகரிக்கவும் அரசு மானியங்கள் அறிவிப்பு.',
        category: 'agriculture',
        lang: 'ta',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2302002',
        prid: '2302002',
        title: 'பிரதமர் கிசான் மற்றும் மண்வள அட்டை திட்டத்தின் கீழ் விவசாயிகளுக்கான புதிய டிஜிட்டல் சேவைகள் தொடக்கம்',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2302002',
        pubDate: '19 Aug 2026 09:00:00 GMT',
        description: 'விவசாயிகளுக்கு நேரடி நிதி உதவி மற்றும் துல்லிய வானிலை முன்னறிவிப்பு வழங்கும் மொபைல் செயலி பயன்பாட்டுக்கு வந்தது.',
        category: 'agriculture',
        lang: 'ta',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2302003',
        prid: '2302003',
        title: 'வணிகத் துறை சார்பில் இந்திய ஏற்றுமதியாளர்களுக்கு ஐரோப்பிய ஒன்றிய CBAM விதிமுறைகள் குறித்த விழிப்புணர்வு முகாம்',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2302003',
        pubDate: '19 Aug 2026 08:30:00 GMT',
        description: 'சர்வதேச வர்த்தகத்தில் இந்திய ஏற்றுமதியாளர்கள் போட்டியிடும் வகையில் தொழில்நுட்ப பயிற்சி வழங்கப்பட்டது.',
        category: 'economy',
        lang: 'ta',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2302004',
        prid: '2302004',
        title: 'சூரிய சக்தி பாசன பம்புகள்: பிஎம்-குசும் திட்டத்தில் தமிழகம் உட்பட நாடு முழுவதும் அபார வளர்ச்சி',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2302004',
        pubDate: '19 Aug 2026 07:00:00 GMT',
        description: 'சூரிய ஒளி மூலம் விவசாயிகளுக்கு தடையற்ற பகல்நேர மின்சாரம் கிடைப்பதால் பாசன செலவு பெருமளவு குறைந்துள்ளது.',
        category: 'environment',
        lang: 'ta',
        source: 'Press Information Bureau (PIB), GoI',
      }
    ];
  } else if (lang === 'te') {
    return [
      {
        id: '2303001',
        prid: '2303001',
        title: 'భారత మఖానా రంగం: సంప్రదాయ పంట నుండి గ్లోబల్ సూపర్ ఫుడ్ వరకు సరికొత్త ప్రయాణం',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2303001',
        pubDate: '19 Aug 2026 10:00:00 GMT',
        description: 'రైతుల ఆదాయాన్ని పెంచేందుకు, మఖానా ప్రాసెసింగ్ మరియు ఎగుమతులను ప్రోత్సహించేందుకు భారీ సబ్సిడీలు.',
        category: 'agriculture',
        lang: 'te',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2303002',
        prid: '2303002',
        title: 'పీఎం-కిసాన్ మరియు భూసార పరీక్ష పథకం కింద రైతులకు సరికొత్త డిజిటల్ సేవలు ప్రారంభం',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2303002',
        pubDate: '19 Aug 2026 09:00:00 GMT',
        description: 'రైతులకు నేరుగా ఆర్థిక సహాయం మరియు వాతావరణ సమాచారాన్ని అందించే మొబైల్ యాప్ అందుబాటులోకి వచ్చింది.',
        category: 'agriculture',
        lang: 'te',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2303003',
        prid: '2303003',
        title: 'భారత ఎగుమతిదారుల కోసం యూరోపియన్ యూనియన్ CBAM నిబంధనలపై అవగాహన సదస్సు',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2303003',
        pubDate: '19 Aug 2026 08:30:00 GMT',
        description: 'అంతర్జాతీయ వాణిజ్యంలో భారతీయ ఎగుమతులను పెంచేందుకు వాణిజ్య మంత్రిత్వ శాఖ ప్రత్యేక శిక్షణ.',
        category: 'economy',
        lang: 'te',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2303004',
        prid: '2303004',
        title: 'పీఎం-కుసుమ్ సౌర పంపుల పథకంలో రికార్డు వృద్ధి: రైతులకు భారీగా తగ్గిన విద్యుత్ వ్యయం',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2303004',
        pubDate: '19 Aug 2026 07:00:00 GMT',
        description: 'రైతులకు పగటిపూట ఉచిత సౌర విద్యుత్ అందుబాటులోకి రావడంతో సాగునీటి ఖర్చులు 70% వరకు తగ్గాయి.',
        category: 'environment',
        lang: 'te',
        source: 'Press Information Bureau (PIB), GoI',
      }
    ];
  } else if (lang === 'gu') {
    return [
      {
        id: '2304001',
        prid: '2304001',
        title: 'ભારતનું મખાના ક્ષેત્ર: પરંપરાગત પાકથી ગ્લોબલ સુપરફૂડ સુધીની ઐતિહાસિક સફર',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2304001',
        pubDate: '19 Aug 2026 10:00:00 GMT',
        description: 'ખેડૂતોની આવક વધારવા અને વૈશ્વિક નિકાસને પ્રોત્સાહન આપવા માટે સરકારી યોજનાઓ અને સબસિડી જાહેર.',
        category: 'agriculture',
        lang: 'gu',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2304002',
        prid: '2304002',
        title: 'પીએમ-કિસાન અને જમીન સ્વાસ્થ્ય કાર્ડ યોજના હેઠળ ખેડૂતો માટે નવા ડિજિટલ સાધનો લૉન્ચ',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2304002',
        pubDate: '19 Aug 2026 09:00:00 GMT',
        description: 'ખેડૂતોને હવામાન આગાહી, ખાતર સલાહ અને સીધી નાણાકીય સહાય ટ્રેકિંગની સુવિધા મોબાઈલ એપ પર મળશે.',
        category: 'agriculture',
        lang: 'gu',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2304003',
        prid: '2304003',
        title: 'વાણિજ્ય વિભાગ દ્વારા નિકાસકારો માટે EU કાર્બન બોર્ડર નિયમો (CBAM) પર જાગૃતિ સત્ર યોજાયું',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2304003',
        pubDate: '19 Aug 2026 08:30:00 GMT',
        description: 'ભારતીય નિકાસકારોને વૈશ્વિક ધોરણો અને ઈયુ નિયમોની તકનીકી માહિતી આપવા માટે વિશેષ સત્ર યોજાયું.',
        category: 'economy',
        lang: 'gu',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2304004',
        prid: '2304004',
        title: 'પીએમ-કુસુમ યોજના હેઠળ સોલાર પંપ સ્થાપનામાં રેકોર્ડ વૃદ્ધિ: ખેડૂતોના વીજ બિલમાં મોટો ઘટાડો',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2304004',
        pubDate: '19 Aug 2026 07:00:00 GMT',
        description: 'ખેડૂતોને દિવસ દરમિયાન અવિરત સૌર વીજળી મળવાથી સિંચાઈ ખર્ચમાં 70% સુધીની મોટી બચત.',
        category: 'environment',
        lang: 'gu',
        source: 'Press Information Bureau (PIB), GoI',
      }
    ];
  } else {
    // English defaults
    return [
      {
        id: '2301052',
        prid: '2301052',
        title: 'India’s Makhana Sector: Traditional Crop to Global Superfood Milestone',
        link: 'https://pib.gov.in/PressReleaseDetail.aspx?PRID=2301052',
        pubDate: '19 Aug 2026 10:00:00 GMT',
        description: 'Government announces major processing infrastructure upgrades and export incentives to position Indian Makhana in premier international markets.',
        category: 'agriculture',
        lang: 'en',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2301039',
        prid: '2301039',
        title: 'Department of Commerce organizes Awareness Session for Exporters on EU Carbon Border Adjustment Mechanism (CBAM)',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2301039',
        pubDate: '19 Aug 2026 09:00:00 GMT',
        description: 'Special session conducted to empower Indian exporters with technical knowledge of EU CBAM regulations and compliance tools.',
        category: 'economy',
        lang: 'en',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2300990',
        prid: '2300990',
        title: 'Ministry of Agriculture launches Upgraded Digital Suite for PM-KISAN and Soil Health Advisory',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2300990',
        pubDate: '19 Aug 2026 06:15:00 GMT',
        description: 'Real-time weather tracking, customized fertilizer calculations, and direct subsidy monitoring enabled on mobile phones.',
        category: 'agriculture',
        lang: 'en',
        source: 'Press Information Bureau (PIB), GoI',
      },
      {
        id: '2300970',
        prid: '2300970',
        title: 'Ministry of New & Renewable Energy reports Milestone 40% Growth in PM-KUSUM Solar Irrigation Pumps',
        link: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2300970',
        pubDate: '19 Aug 2026 04:45:00 GMT',
        description: 'Solarized agriculture feeders provide dependable daytime irrigation power, slashing diesel expenses for farming families.',
        category: 'environment',
        lang: 'en',
        source: 'Press Information Bureau (PIB), GoI',
      }
    ];
  }
}

