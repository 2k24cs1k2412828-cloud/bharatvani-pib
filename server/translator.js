import dns from 'dns';
import https from 'https';
import axios from 'axios';
import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);

dns.setDefaultResultOrder('ipv4first');
const httpsAgent = new https.Agent({ family: 4, keepAlive: true });

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

  // 1. Try curl directly (most reliable, avoids node 429/IPv6 issues)
  try {
    const { stdout } = await execFilePromise(
      'curl',
      [
        '-s',
        '-G',
        'https://translate.googleapis.com/translate_a/single',
        '--data-urlencode', 'client=gtx',
        '--data-urlencode', 'sl=auto',
        '--data-urlencode', `tl=${targetLang}`,
        '--data-urlencode', 'dt=t',
        '--data-urlencode', `q=${clean}`,
      ],
      { timeout: 5000 }
    );

    const parsed = JSON.parse(stdout);
    if (parsed && Array.isArray(parsed[0])) {
      const translated = parsed[0].map((item) => item[0]).filter(Boolean).join('');
      if (translated) {
        if (translationCache.size > 5000) {
          const firstKey = translationCache.keys().next().value;
          translationCache.delete(firstKey);
        }
        translationCache.set(cacheKey, translated);
        return translated;
      }
    }
  } catch (curlErr) {
    // 2. Fallback to axios if curl failed
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(clean)}`;
      const response = await axios.get(url, {
        httpsAgent,
        timeout: 4000,
      });

      if (response.data && Array.isArray(response.data[0])) {
        const translated = response.data[0].map((item) => item[0]).filter(Boolean).join('');
        if (translated) {
          translationCache.set(cacheKey, translated);
          return translated;
        }
      }
    } catch (err) {
      console.warn(`[Translator] Failed to translate text to ${targetLang}:`, err.message);
    }
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
