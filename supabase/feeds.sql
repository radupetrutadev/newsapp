-- Starter publishers and RSS/Atom feeds for real news.
-- Run after the migrations. Safe to re-run: existing rows are left alone.
--
-- Pulse stores only each story's headline, summary, image and link, and sends
-- readers to the publisher for the full article. Check each publisher's RSS
-- terms before using their feeds commercially.
--
-- Add a feed:     insert into public.feeds (source_id, url, category)
--                 select id, 'https://example.com/feed.xml', 'tech' from public.sources where handle = 'example';
-- Pause a feed:   update public.feeds set active = false where url = '…';
-- Feed health:    select url, last_success_at, last_error from public.feeds order by last_error nulls last;

insert into public.sources (handle, name, description, website, category, color, verified) values
  ('bbcnews', 'BBC News', 'World, UK, business, science and technology news from the BBC.', 'https://www.bbc.com/news', 'world', '#bb1919', true),
  ('bbcsport', 'BBC Sport', 'Sports news, results and analysis from BBC Sport.', 'https://www.bbc.com/sport', 'sports', '#ffd230', true),
  ('guardian', 'The Guardian', 'News, analysis and opinion from The Guardian.', 'https://www.theguardian.com', 'world', '#052962', true),
  ('npr', 'NPR', 'News from NPR: US and world affairs, politics, science and culture.', 'https://www.npr.org', 'world', '#237bbd', true),
  ('aljazeera', 'Al Jazeera', 'Breaking news and in-depth reporting from around the world.', 'https://www.aljazeera.com', 'world', '#fa9000', true),
  ('arstechnica', 'Ars Technica', 'Technology, science and policy news and analysis.', 'https://arstechnica.com', 'tech', '#ff4e00', true),
  ('theverge', 'The Verge', 'Technology, science, art and culture.', 'https://www.theverge.com', 'tech', '#5200ff', true),
  ('techcrunch', 'TechCrunch', 'Startup and technology news.', 'https://techcrunch.com', 'tech', '#0a9e01', true),
  ('nasa', 'NASA', 'News releases from NASA.', 'https://www.nasa.gov', 'science', '#0b3d91', true),
  ('carbonbrief', 'Carbon Brief', 'Climate science, energy and policy reporting.', 'https://www.carbonbrief.org', 'climate', '#2a9d8f', true),
  ('espn', 'ESPN', 'Sports news and scores.', 'https://www.espn.com', 'sports', '#d00000', true),
  ('variety', 'Variety', 'Entertainment news: film, TV, music and the business behind them.', 'https://variety.com', 'entertainment', '#c4121a', true)
on conflict (handle) do nothing;

insert into public.feeds (source_id, url, category)
select sources.id, feeds.url, feeds.category
from (values
  ('bbcnews', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'world'),
  ('bbcnews', 'https://feeds.bbci.co.uk/news/politics/rss.xml', 'politics'),
  ('bbcnews', 'https://feeds.bbci.co.uk/news/business/rss.xml', 'business'),
  ('bbcnews', 'https://feeds.bbci.co.uk/news/technology/rss.xml', 'tech'),
  ('bbcnews', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 'science'),
  ('bbcnews', 'https://feeds.bbci.co.uk/news/health/rss.xml', 'health'),
  ('bbcnews', 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', 'entertainment'),
  ('bbcsport', 'https://feeds.bbci.co.uk/sport/rss.xml', 'sports'),
  ('guardian', 'https://www.theguardian.com/world/rss', 'world'),
  ('guardian', 'https://www.theguardian.com/politics/rss', 'politics'),
  ('guardian', 'https://www.theguardian.com/business/rss', 'business'),
  ('guardian', 'https://www.theguardian.com/technology/rss', 'tech'),
  ('guardian', 'https://www.theguardian.com/science/rss', 'science'),
  ('guardian', 'https://www.theguardian.com/environment/rss', 'climate'),
  ('guardian', 'https://www.theguardian.com/culture/rss', 'entertainment'),
  ('guardian', 'https://www.theguardian.com/sport/rss', 'sports'),
  ('npr', 'https://feeds.npr.org/1004/rss.xml', 'world'),
  ('npr', 'https://feeds.npr.org/1014/rss.xml', 'politics'),
  ('npr', 'https://feeds.npr.org/1006/rss.xml', 'business'),
  ('npr', 'https://feeds.npr.org/1128/rss.xml', 'health'),
  ('aljazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'world'),
  ('arstechnica', 'https://feeds.arstechnica.com/arstechnica/index', 'tech'),
  ('theverge', 'https://www.theverge.com/rss/index.xml', 'tech'),
  ('techcrunch', 'https://techcrunch.com/feed/', 'tech'),
  ('nasa', 'https://www.nasa.gov/news-release/feed/', 'science'),
  ('carbonbrief', 'https://www.carbonbrief.org/feed/', 'climate'),
  ('espn', 'https://www.espn.com/espn/rss/news', 'sports'),
  ('variety', 'https://variety.com/feed/', 'entertainment')
) as feeds (handle, url, category)
join public.sources on sources.handle = feeds.handle
on conflict (url) do nothing;
