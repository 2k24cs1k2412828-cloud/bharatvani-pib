import { supabase, isSupabaseConfigured } from './supabaseClient.js';

/**
 * Batch upsert scraped PIB articles into Supabase
 */
export async function upsertArticles(articles = []) {
  if (!isSupabaseConfigured() || !articles.length) return false;

  try {
    const rows = articles.map((a) => ({
      id: a.id || a.prid,
      prid: a.prid || a.id,
      title: a.title,
      description: a.description || '',
      category: a.category || 'governance',
      ministry: a.ministry || '',
      lang: a.lang || 'hi',
      link: a.link || '',
      iframe_link: a.iframeLink || '',
      pub_date: a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString(),
      paragraphs: a.paragraphs || [],
      key_takeaways: a.keyTakeaways || [],
      images: a.images || [],
      source: a.source || 'Press Information Bureau (PIB), GoI',
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('articles')
      .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

    if (error) {
      console.warn('⚠️ Supabase upsertArticles warning:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error upserting articles to Supabase:', err.message);
    return false;
  }
}

/**
 * Query articles with filtering, search, pagination, and date ranges
 */
export async function getArticles({
  lang = 'hi',
  category = 'all',
  search = '',
  limit = 20,
  offset = 0,
  dateFrom = null,
  dateTo = null,
} = {}) {
  if (!isSupabaseConfigured()) return null;

  try {
    let query = supabase
      .from('articles')
      .select('*', { count: 'exact' })
      .eq('lang', lang)
      .order('pub_date', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (search) {
      // Search in title, description, or ministry
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,ministry.ilike.%${search}%`);
    }

    if (dateFrom) {
      query = query.gte('pub_date', new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      query = query.lte('pub_date', new Date(dateTo).toISOString());
    }

    if (limit) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      console.warn('⚠️ Supabase getArticles error:', error.message);
      return null;
    }

    // Format DB rows back into app Article format
    const formatted = (data || []).map((row) => ({
      id: row.id,
      prid: row.prid,
      title: row.title,
      description: row.description,
      category: row.category,
      ministry: row.ministry,
      lang: row.lang,
      link: row.link,
      iframeLink: row.iframe_link,
      pubDate: row.pub_date,
      paragraphs: row.paragraphs,
      keyTakeaways: row.key_takeaways,
      images: row.images,
      source: row.source,
      createdAt: row.created_at,
    }));

    return {
      articles: formatted,
      total: count || formatted.length,
    };
  } catch (err) {
    console.error('Error fetching articles from Supabase:', err.message);
    return null;
  }
}

/**
 * Save full scraped detail (paragraphs, takeaways, images) for an article
 */
export async function saveArticleDetail(prid, lang, detail) {
  if (!isSupabaseConfigured() || !prid || !detail) return false;

  try {
    const { error } = await supabase
      .from('articles')
      .update({
        ministry: detail.ministry,
        paragraphs: detail.paragraphs || [],
        key_takeaways: detail.keyTakeaways || [],
        images: detail.images || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', prid)
      .eq('lang', lang);

    if (error) {
      console.warn('⚠️ Supabase saveArticleDetail error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving article detail to Supabase:', err.message);
    return false;
  }
}

/**
 * Get cached Fact-Checking report for an article
 */
export async function getFactReport(articleId, lang = 'hi') {
  if (!isSupabaseConfigured() || !articleId) return null;

  try {
    const { data, error } = await supabase
      .from('fact_reports')
      .select('*')
      .eq('article_id', articleId)
      .eq('lang', lang)
      .single();

    if (error || !data) return null;

    return {
      atomicClaims: data.atomic_claims,
      deterministicFigures: data.deterministic_figures,
      canonicalEntities: data.canonical_entities,
      groundingScore: data.grounding_score,
      fromDbCache: true,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Save Fact-Checking report to Supabase
 */
export async function saveFactReport(articleId, lang, report) {
  if (!isSupabaseConfigured() || !articleId || !report) return false;

  try {
    const { error } = await supabase.from('fact_reports').upsert(
      {
        article_id: articleId,
        lang: lang || 'hi',
        atomic_claims: report.atomicClaims || [],
        deterministic_figures: report.deterministicFigures || [],
        canonical_entities: report.canonicalEntities || [],
        grounding_score: report.groundingScore || 1.0,
      },
      { onConflict: 'article_id,lang' }
    );

    if (error) {
      console.warn('⚠️ Supabase saveFactReport error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving fact report:', err.message);
    return false;
  }
}

/**
 * Get cached AI Storyboard for an article
 */
export async function getStoryboard(articleId, lang = 'hi') {
  if (!isSupabaseConfigured() || !articleId) return null;

  try {
    const { data, error } = await supabase
      .from('storyboards')
      .select('*')
      .eq('article_id', articleId)
      .eq('lang', lang)
      .single();

    if (error || !data) return null;

    return {
      title: data.title,
      category: data.category,
      scenes: data.scenes,
      fromDbCache: true,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Save AI Storyboard to Supabase
 */
export async function saveStoryboard(articleId, lang, storyboard) {
  if (!isSupabaseConfigured() || !articleId || !storyboard) return false;

  try {
    const { error } = await supabase.from('storyboards').upsert(
      {
        article_id: articleId,
        lang: lang || 'hi',
        title: storyboard.title || '',
        category: storyboard.category || 'governance',
        scenes: storyboard.scenes || [],
      },
      { onConflict: 'article_id,lang' }
    );

    if (error) {
      console.warn('⚠️ Supabase saveStoryboard error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving storyboard:', err.message);
    return false;
  }
}

/**
 * Get database statistics for health and admin views
 */
export async function getDatabaseStats() {
  if (!isSupabaseConfigured()) {
    return { status: 'unconfigured', articlesCount: 0 };
  }

  try {
    const { count: articlesCount, error } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return {
      status: 'connected',
      articlesCount: articlesCount || 0,
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.message,
    };
  }
}
