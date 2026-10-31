import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseClientConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-ref')
  );
};

export const supabase = isSupabaseClientConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Subscribe to live PIB press releases published to the Supabase database
 * @param {Function} onNewArticle - Callback when a new article is inserted
 * @param {string} lang - Optional language filter (e.g., 'hi', 'en')
 * @returns {Function} unsubscribe cleanup function
 */
export function subscribeToLiveNews(onNewArticle, lang = 'hi') {
  if (!isSupabaseClientConfigured() || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel('public:articles')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'articles',
      },
      (payload) => {
        if (payload.new) {
          // Format payload.new into app format
          const formatted = {
            id: payload.new.id,
            prid: payload.new.prid,
            title: payload.new.title,
            description: payload.new.description,
            category: payload.new.category,
            ministry: payload.new.ministry,
            lang: payload.new.lang,
            link: payload.new.link,
            iframeLink: payload.new.iframe_link,
            pubDate: payload.new.pub_date,
            paragraphs: payload.new.paragraphs || [],
            keyTakeaways: payload.new.key_takeaways || [],
            images: payload.new.images || [],
            source: payload.new.source,
            isLiveIncoming: true,
          };

          if (!lang || formatted.lang === lang) {
            onNewArticle(formatted);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
