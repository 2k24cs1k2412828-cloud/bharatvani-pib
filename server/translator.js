import axios from 'axios';

// In-memory translation cache: Map<`${targetLang}___${cleanText}`, translatedText>
const translationCache = new Map();

// Helper to translate single or multiple text snippets
export async function translateText(text = '', targetLang = 'en') {
  if (!text || typeof text !== 'string') return text;
  const clean = text.trim();
  if (!clean) return clean;
  if (targetLang === 'hi' && /[\u0900-\u097F]/.test(clean)) return clean;
  if (targetLang === 'ta' && /[\u0B80-\u0BFF]/.test(clean)) return clean;
  if (targetLang === 'te' && /[\u0C00-\u0C7F]/.test(clean)) return clean;
  if (targetLang === 'gu' && /[\u0A80-\u0AFF]/.test(clean)) return clean;

  const cacheKey = `${targetLang}___${clean}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(clean)}`;
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (response.data && Array.isArray(response.data[0])) {
      const translated = response.data[0].map((item) => item[0]).filter(Boolean).join('');
      if (translated) {
        if (translationCache.size > 5000) {
          const firstKey = translationCache.keys().next().value;
          translationCache.delete(firstKey);
        }
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch (err) {
    console.warn(`[Translator] Failed to translate text to ${targetLang}:`, err.message);
  }

  return clean;
}

// Translate full article object for feed
export async function translateArticle(article, targetLang = 'hi') {
  if (!article) return article;
  if (article.lang === targetLang) return article;

  // Check if article title is already in target script
  if (targetLang === 'ta' && /[\u0B80-\u0BFF]/.test(article.title)) return { ...article, lang: 'ta' };
  if (targetLang === 'te' && /[\u0C00-\u0C7F]/.test(article.title)) return { ...article, lang: 'te' };
  if (targetLang === 'gu' && /[\u0A80-\u0AFF]/.test(article.title)) return { ...article, lang: 'gu' };
  if (targetLang === 'hi' && /[\u0900-\u097F]/.test(article.title)) return { ...article, lang: 'hi' };

  try {
    const [translatedTitle, translatedDesc] = await Promise.all([
      translateText(article.title, targetLang),
      translateText(article.description || article.title, targetLang),
    ]);

    let translatedKeyTakeaways = [];
    if (Array.isArray(article.keyTakeaways) && article.keyTakeaways.length > 0) {
      translatedKeyTakeaways = await Promise.all(
        article.keyTakeaways.slice(0, 3).map((kt) => translateText(kt, targetLang))
      );
    } else {
      translatedKeyTakeaways = [translatedTitle];
    }

    return {
      ...article,
      title: translatedTitle || article.title,
      description: translatedDesc || article.description,
      keyTakeaways: translatedKeyTakeaways,
      lang: targetLang,
    };
  } catch (err) {
    console.warn(`[Translator] Error translating article ${article.id}:`, err.message);
    return { ...article, lang: targetLang };
  }
}

// Translate full article detail with paragraphs
export async function translateArticleDetail(detail, targetLang = 'hi') {
  if (!detail) return detail;
  if (detail.lang === targetLang) return detail;

  try {
    const [translatedTitle, translatedMinistry] = await Promise.all([
      translateText(detail.title, targetLang),
      translateText(detail.ministry, targetLang),
    ]);

    let translatedParagraphs = [];
    if (Array.isArray(detail.paragraphs) && detail.paragraphs.length > 0) {
      translatedParagraphs = await Promise.all(
        detail.paragraphs.slice(0, 8).map((p) => translateText(p, targetLang))
      );
    }

    let translatedKeyTakeaways = [];
    if (Array.isArray(detail.keyTakeaways) && detail.keyTakeaways.length > 0) {
      translatedKeyTakeaways = await Promise.all(
        detail.keyTakeaways.slice(0, 4).map((kt) => translateText(kt, targetLang))
      );
    }

    return {
      ...detail,
      title: translatedTitle || detail.title,
      ministry: translatedMinistry || detail.ministry,
      paragraphs: translatedParagraphs.length > 0 ? translatedParagraphs : detail.paragraphs,
      keyTakeaways: translatedKeyTakeaways.length > 0 ? translatedKeyTakeaways : detail.keyTakeaways,
      lang: targetLang,
    };
  } catch (err) {
    console.warn(`[Translator] Error translating article detail ${detail.id}:`, err.message);
    return { ...detail, lang: targetLang };
  }
}
