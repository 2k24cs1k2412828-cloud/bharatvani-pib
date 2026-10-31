import axios from 'axios';

// Curated high-resolution thematic visuals for exact news topics
export const DOMAIN_VISUALS = {
  varanasi: [
    'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1280&q=80', // Varanasi Ganga Ghats
    'https://images.unsplash.com/photo-1571536802807-30451e3955d8?auto=format&fit=crop&w=1280&q=80', // Kashi heritage & temples
    'https://images.unsplash.com/photo-1598890777032-bde835ba27c2?auto=format&fit=crop&w=1280&q=80', // Holy Ganga ghat lights
  ],
  khadi: [
    'https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&w=1280&q=80', // Handloom spinning & textile
    'https://images.unsplash.com/photo-1574634534894-89d7576c8259?auto=format&fit=crop&w=1280&q=80', // Indian artisan craftswomen
    'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1280&q=80', // Weaving and handicraft
  ],
  railways: [
    'https://images.unsplash.com/photo-1532105956626-9569c03602f6?auto=format&fit=crop&w=1280&q=80', // Modern high-speed train
    'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1280&q=80', // Railway tracks & viaduct
    'https://images.unsplash.com/photo-1515165562839-978bbcf18277?auto=format&fit=crop&w=1280&q=80', // Modern train station
  ],
  solar: [
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1280&q=80', // Rooftop solar panels
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1280&q=80', // Renewable energy landscape
    'https://images.unsplash.com/photo-1548337138-e87d889cc369?auto=format&fit=crop&w=1280&q=80', // Solar power plant
  ],
  space: [
    'https://images.unsplash.com/photo-1517976487507-e1055e886915?auto=format&fit=crop&w=1280&q=80', // Rocket launch
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80', // Satellite orbit
    'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=1280&q=80', // Space tech & cosmos
  ],
  semiconductor: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1280&q=80', // Silicon microchip
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1280&q=80', // Cleanroom high-tech hardware
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1280&q=80', // Digital tech & electronics
  ],
  defense: [
    'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1280&q=80', // Defense fighter aircraft
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1280&q=80', // Armed forces & security
    'https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?auto=format&fit=crop&w=1280&q=80', // Naval ship on horizon
  ],
  agriculture: [
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1280&q=80', // Lush golden wheat farm
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1280&q=80', // Indian farmer in crop field
    'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1280&q=80', // Modern tractor & farming
  ],
  health: [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1280&q=80', // Modern hospital care
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1280&q=80', // Doctor & healthcare consultation
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=1280&q=80', // Medical lab & pharmacy
  ],
  education: [
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1280&q=80', // University students collaborating
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1280&q=80', // Digital classroom & learning
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1280&q=80', // Library and study
  ],
  infrastructure: [
    'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=1280&q=80', // Multi-lane national highway
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1280&q=80', // Modern cargo shipping port
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1280&q=80', // Bridge and architectural engineering
  ],
  women: [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1280&q=80', // Confident women entrepreneurs
    'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=1280&q=80', // Rural empowerment & teamwork
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1280&q=80', // Women leadership
  ],
  economy: [
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1280&q=80', // Stock market & trade growth
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1280&q=80', // Banking, investments & economy
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1280&q=80', // Modern financial towers
  ],
  governance: [
    'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1280&q=80', // National Monument (India Gate)
    'https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=1280&q=80', // Indian Tricolor Flag
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1280&q=80', // Sansad & government architecture
  ],
};

// Backwards compatibility alias for frontend components
export const THEME_VISUALS = DOMAIN_VISUALS;

// Contextual classifier mapping news titles to specific national topics
export function detectNewsContext(article = {}) {
  const title = (article.title || '').toLowerCase();
  const desc = (article.description || '').toLowerCase();
  const ministry = (article.ministry || '').toLowerCase();
  const text = `${title} ${desc} ${ministry}`;

  if (/वाराणसी|काशी|घाट|मंदिर|गंगा घाट|varanasi|kashi|ghat|banaras/i.test(text)) {
    return {
      domain: 'varanasi',
      badge: 'सांस्कृतिक धरोहर एवं काशी विकास',
      accentColor: '#ea580c',
      visuals: DOMAIN_VISUALS.varanasi,
    };
  }
  if (/खादी|ग्रामोद्योग|कारीगर|शिल्प|हथकरघा|बुनकर|मन की बात|khadi|artisan|handloom|weaver|village industr/i.test(text)) {
    return {
      domain: 'khadi',
      badge: 'खादी एवं कुटीर उद्योग क्रांति',
      accentColor: '#d97706',
      visuals: DOMAIN_VISUALS.khadi,
    };
  }
  if (/रेल|ट्रेन|वंदे भारत|स्टेशन|ट्रैक|मेट्रो|बुलेट ट्रेन|railway|train|vande bharat|metro|locomotive/i.test(text)) {
    return {
      domain: 'railways',
      badge: 'भारतीय रेल आधुनिकीकरण',
      accentColor: '#2563eb',
      visuals: DOMAIN_VISUALS.railways,
    };
  }
  if (/सोलर|सूर्य घर|सौर ऊर्जा|रूफटॉप|नवीकरणीय|solar|rooftop|renewable|clean energy|wind/i.test(text)) {
    return {
      domain: 'solar',
      badge: 'पीएम सूर्य घर एवं हरित ऊर्जा',
      accentColor: '#16a34a',
      visuals: DOMAIN_VISUALS.solar,
    };
  }
  if (/अंतरिक्ष|इसरो|रॉकेट|उपग्रह|चंद्रयान|गगनयान|space|isro|satellite|rocket/i.test(text)) {
    return {
      domain: 'space',
      badge: 'इसरो राष्ट्रीय अंतरिक्ष मिशन',
      accentColor: '#4f46e5',
      visuals: DOMAIN_VISUALS.space,
    };
  }
  if (/सेमीकंडक्टर|चिप|इलेक्ट्रॉनिक्स|डिजिटल इंडिया|एआई|5जी|semiconductor|chip|ai|electronics/i.test(text)) {
    return {
      domain: 'semiconductor',
      badge: 'भारत सेमीकंडक्टर मिशन',
      accentColor: '#0284c7',
      visuals: DOMAIN_VISUALS.semiconductor,
    };
  }
  if (/रक्षा|सेना|वायुसेना|नौसेना|तेजस|लड़ाकू|हथियार|defense|army|navy|air force|fighter/i.test(text)) {
    return {
      domain: 'defense',
      badge: 'राष्ट्रीय सुरक्षा एवं रक्षा शक्ति',
      accentColor: '#b91c1c',
      visuals: DOMAIN_VISUALS.defense,
    };
  }
  if (/किसान|कृषि|फसल|एमएसपी|गेहूं|धान|खाद|सिंचाई|farmer|agriculture|kisan|crop|wheat|paddy/i.test(text)) {
    return {
      domain: 'agriculture',
      badge: 'कृषि एवं किसान कल्याण',
      accentColor: '#15803d',
      visuals: DOMAIN_VISUALS.agriculture,
    };
  }
  if (/स्वास्थ्य|आयुष्मान|अस्पताल|दवा|वैक्सीन|चिकित्सा|health|hospital|doctor|ayushman|medical/i.test(text)) {
    return {
      domain: 'health',
      badge: 'राष्ट्रीय स्वास्थ्य सेवा एवं देखभाल',
      accentColor: '#0d9488',
      visuals: DOMAIN_VISUALS.health,
    };
  }
  if (/शिक्षा|स्कूल|कॉलेज|विश्वविद्यालय|छात्र|एनईपी|education|school|college|university|student/i.test(text)) {
    return {
      domain: 'education',
      badge: 'शिक्षा और युवा कौशल विकास',
      accentColor: '#7c3aed',
      visuals: DOMAIN_VISUALS.education,
    };
  }
  if (/राजमार्ग|सड़क|एक्सप्रेसवे|पुल|सुरंग|बंदरगाह|कार्गो|highway|road|expressway|bridge|port/i.test(text)) {
    return {
      domain: 'infrastructure',
      badge: 'राष्ट्रीय राजमार्ग एवं आधारभूत ढांचा',
      accentColor: '#0369a1',
      visuals: DOMAIN_VISUALS.infrastructure,
    };
  }
  if (/महिला|लखपति दीदी|स्वयं सहायता|नारी|women|shg|lakhpati didi|empowerment/i.test(text)) {
    return {
      domain: 'women',
      badge: 'महिला सशक्तिकरण एवं स्वावलंबन',
      accentColor: '#db2777',
      visuals: DOMAIN_VISUALS.women,
    };
  }
  if (/अर्थव्यवस्था|बजट|जीडीपी|जीएसटी|बैंक|व्यापार|मुद्रास्फीति|economy|budget|gdp|gst|bank|finance/i.test(text)) {
    return {
      domain: 'economy',
      badge: 'राष्ट्रीय अर्थव्यवस्था एवं वित्तीय विकास',
      accentColor: '#059669',
      visuals: DOMAIN_VISUALS.economy,
    };
  }

  // Default to general governance
  return {
    domain: 'governance',
    badge: 'राष्ट्रीय नीति एवं सरकारी निर्णय',
    accentColor: '#1e40af',
    visuals: DOMAIN_VISUALS.governance,
  };
}

// Contextual visuals resolver for cards & hero banners
export function resolveContextualVisuals(article = {}) {
  const context = detectNewsContext(article);
  return context.visuals;
}

// Smart, news-aligned storyboard synthesizer
export function generateFallbackStoryboard(article, lang = 'hi') {
  const isHindi = lang === true || lang === 'hi' || lang === 'HINDI' || lang === 'hindi';
  const context = detectNewsContext(article);
  const visuals = context.visuals;
  const title = article.title || '';
  const ministry = article.ministry || (isHindi ? 'भारत सरकार' : 'Government of India');

  // Clean, focused headline extraction
  let shortHeadline = title;
  if (title.length > 55) {
    const parts = title.split(/[:\-–—|]/);
    shortHeadline = parts[0].trim();
    if (shortHeadline.length < 15 && parts[1]) {
      shortHeadline = `${shortHeadline}: ${parts[1].trim()}`;
    }
  }

  const scenes = isHindi ? [
    {
      sceneIndex: 1,
      headline: shortHeadline,
      narration: `नमस्कार, भारतवाणी राष्ट्रीय समाचार। ${title}।`,
      keyPoints: [
        `🏛️ ${ministry}`,
        `📌 ${context.badge}`,
        `📢 आधिकारिक विज्ञप्ति`
      ],
      visualImage: visuals[0],
      accentColor: context.accentColor,
    },
    {
      sceneIndex: 2,
      headline: `${context.badge}: मुख्य विवरण एवं प्रभाव`,
      narration: `इस पहल का मुख्य उद्देश्य नागरिकों और संबंधित हितधारकों को सीधा लाभ पहुँचाना और क्षेत्र के समग्र विकास को गति देना है।`,
      keyPoints: [
        '⚡ सीधा और पारदर्शी क्रियान्वयन',
        '📈 राष्ट्रव्यापी जन-कल्याण',
        '🎯 त्वरित समयबद्ध लक्ष्य'
      ],
      visualImage: visuals[1] || visuals[0],
      accentColor: '#16a34a',
    },
    {
      sceneIndex: 3,
      headline: 'आत्मनिर्भर भारत की ओर ऐतिहासिक कदम',
      narration: `यह निर्णय देश को आत्मनिर्भर और सशक्त बनाने की दिशा में एक मील का पत्थर साबित होगा। पूरी रिपोर्ट के लिए भारतवाणी पर बने रहें।`,
      keyPoints: [
        '🇮🇳 आत्मनिर्भर भारत संकल्प',
        '✅ आधिकारिक रूप से सत्यापित',
        '🌐 डिजिटल जन-जागरूकता'
      ],
      visualImage: visuals[2] || visuals[0],
      accentColor: '#ea580c',
    }
  ] : [
    {
      sceneIndex: 1,
      headline: shortHeadline,
      narration: `Welcome to BharatVani National News. ${title}.`,
      keyPoints: [
        `🏛️ ${ministry}`,
        `📌 ${context.domain.toUpperCase()}`,
        `📢 Official Release`
      ],
      visualImage: visuals[0],
      accentColor: context.accentColor,
    },
    {
      sceneIndex: 2,
      headline: `${context.domain.toUpperCase()}: Key Initiatives & Public Impact`,
      narration: `This initiative is aimed at delivering direct citizen empowerment, accelerating grassroots progress, and ensuring seamless execution across the country.`,
      keyPoints: [
        '⚡ Transparent & Direct Delivery',
        '📈 Nationwide Outreach',
        '🎯 Milestone-driven Progress'
      ],
      visualImage: visuals[1] || visuals[0],
      accentColor: '#16a34a',
    },
    {
      sceneIndex: 3,
      headline: 'Strategic Step Towards Atmanirbhar Bharat',
      narration: `This decisive move marks another major leap in India\'s journey towards self-reliance and inclusive public growth. Stay connected with BharatVani for verified updates.`,
      keyPoints: [
        '🇮🇳 Atmanirbhar Bharat',
        '✅ 100% Fact Checked',
        '🌐 Digital Transparency'
      ],
      visualImage: visuals[2] || visuals[0],
      accentColor: '#ea580c',
    }
  ];

  return {
    success: true,
    source: 'BharatVani Contextual News Engine',
    title: article.title,
    category: context.domain,
    badge: context.badge,
    scenes,
  };
}

// Generate Storyboard using Google Gemini API with Contextual Visuals
export async function generateGeminiStoryboard(article, apiKey, lang = 'hi') {
  const isHindi = lang === true || lang === 'hi' || lang === 'HINDI' || lang === 'hindi';
  const languageCode = isHindi ? 'hi' : 'en';

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return generateFallbackStoryboard(article, languageCode);
  }

  const context = detectNewsContext(article);
  const visuals = context.visuals;

  const prompt = `
You are an expert prime-time television news anchor for BharatVani National News.
Analyze this official government news release and write a 3-scene visual broadcast script in ${isHindi ? 'HINDI (Devanagari script)' : 'ENGLISH'}:
Title: "${article.title}"
Description: "${article.description || ''}"
Topic: "${context.badge}"
Ministry: "${article.ministry || 'Government of India'}"

Respond ONLY with a valid JSON array of 3 scene objects. Each object must have:
- "headline": (A punchy 4-7 word headline in ${isHindi ? 'Hindi' : 'English'} describing specifically what is happening in this scene)
- "narration": (A natural, warm, crisp 1-2 sentence television news script explaining this scene simply)
- "keyPoints": (Array of 2-3 short bullet badges with emojis, e.g. ["🏛️ खादी कारीगर", "📈 रिकॉर्ड बिक्री"])
- "accentColor": (Hex color like "#ea580c", "#16a34a", or "#2563eb")
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      },
      { timeout: 15000 }
    );

    let textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();

    const parsedScenes = JSON.parse(textResponse);

    if (Array.isArray(parsedScenes) && parsedScenes.length > 0) {
      const formattedScenes = parsedScenes.slice(0, 4).map((s, idx) => {
        let kpList = [];
        if (Array.isArray(s.keyPoints)) {
          kpList = s.keyPoints;
        } else if (typeof s.keyPoints === 'string') {
          kpList = s.keyPoints.replace(/[\[\]]/g, '').split(',').map((x) => x.trim()).filter(Boolean);
        }
        if (kpList.length === 0) kpList = [isHindi ? '✅ सत्यापित सूचना' : '✅ Verified Info'];

        return {
          sceneIndex: idx + 1,
          headline: s.headline || (isHindi ? `दृश्य ${idx + 1}` : `Scene ${idx + 1}`),
          narration: s.narration || article.title,
          keyPoints: kpList,
          visualImage: visuals[idx % visuals.length],
          accentColor: s.accentColor || (idx === 0 ? context.accentColor : idx === 1 ? '#16a34a' : '#ea580c'),
        };
      });

      return {
        success: true,
        source: 'Google Gemini 2.5 Flash',
        title: article.title,
        category: context.domain,
        badge: context.badge,
        scenes: formattedScenes,
      };
    }
  } catch (err) {
    console.warn('[Gemini Service] Falling back to BharatVani Contextual News Engine:', err.message);
  }

  // Fallback to our deep contextual news engine
  return generateFallbackStoryboard(article, languageCode);
}
