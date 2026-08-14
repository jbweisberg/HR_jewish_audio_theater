import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ChevronRight,
  Headphones,
  Mail,
  Menu,
  Moon,
  Pause,
  Play,
  Search,
  SkipForward,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';

type Episode = {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  imageUrl: string;
  publishedAt: string;
  durationText: string;
  index: number;
};

type SequenceInfo = {
  root: string;
  part: number | null;
};

const FEED_URL = '/api/feed';
const CACHE_KEY = 'jat_repertory_v3';
const CACHE_TTL = 10 * 60 * 1000;
const FALLBACK_ART =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
      <defs>
        <radialGradient id="bg" cx="50%" cy="35%" r="75%">
          <stop offset="0" stop-color="#65181c"/>
          <stop offset="0.48" stop-color="#1a0b0d"/>
          <stop offset="1" stop-color="#050506"/>
        </radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f4df9b"/>
          <stop offset="0.45" stop-color="#c59a38"/>
          <stop offset="1" stop-color="#7a5520"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="1200" fill="url(#bg)"/>
      <circle cx="600" cy="600" r="370" fill="none" stroke="url(#gold)" stroke-width="3" opacity=".55"/>
      <circle cx="600" cy="600" r="320" fill="none" stroke="#d8b45b" stroke-width="1" opacity=".22"/>
      <text x="600" y="625" text-anchor="middle" fill="url(#gold)" font-size="260" font-family="Georgia, serif" font-weight="700" font-style="italic">JAT</text>
      <text x="600" y="740" text-anchor="middle" fill="#eee7db" opacity=".75" font-size="34" font-family="Arial, sans-serif" letter-spacing="12">JEWISH AUDIO THEATER</text>
    </svg>
  `);

const htmlToText = (html: string) => {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

const formatClock = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const seconds = Math.floor(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
};

const romanToNumber = (value: string) => {
  const roman = value.toUpperCase();
  const map: Record<string, number> = { I: 1, V: 5, X: 10 };
  let total = 0;
  for (let i = 0; i < roman.length; i += 1) {
    const current = map[roman[i]] || 0;
    const next = map[roman[i + 1]] || 0;
    total += current < next ? -current : current;
  }
  return total || null;
};

const sequenceInfo = (title: string): SequenceInfo => {
  const normalized = title.replace(/[–—]/g, '-').trim();
  const match = normalized.match(
    /(?:\s*[-:|]\s*|\s+)(?:part|pt\.?|chapter|episode)\s*(\d+|[ivx]+)\b/i
  );
  const part = match
    ? /^\d+$/.test(match[1])
      ? Number(match[1])
      : romanToNumber(match[1])
    : null;
  const root = normalized
    .replace(/(?:\s*[-:|]\s*|\s+)(?:part|pt\.?|chapter|episode)\s*(?:\d+|[ivx]+)\b.*$/i, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return { root, part };
};

const sameStory = (a: string, b: string) => {
  const aa = sequenceInfo(a);
  const bb = sequenceInfo(b);
  if (!aa.root || !bb.root) return false;
  return aa.root === bb.root || (aa.root.length > 8 && bb.root.includes(aa.root)) || (bb.root.length > 8 && aa.root.includes(bb.root));
};

const parseFeed = (xmlText: string): Episode[] => {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('Invalid RSS response');

  const channelArt =
    xml.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ||
    xml.querySelector('channel > image > url')?.textContent ||
    '';

  return Array.from(xml.querySelectorAll('item'))
    .map((item, index) => {
      const rawDescription =
        item.querySelector('description')?.textContent ||
        item.getElementsByTagName('content:encoded')[0]?.textContent ||
        '';
      const imageUrl =
        item.getElementsByTagName('itunes:image')[0]?.getAttribute('href') ||
        item.querySelector('image')?.getAttribute('href') ||
        channelArt ||
        '';
      return {
        id: item.querySelector('guid')?.textContent?.trim() || `jat-${index}`,
        title: item.querySelector('title')?.textContent?.trim() || 'Jewish Audio Theater Production',
        description: htmlToText(rawDescription),
        audioUrl: item.querySelector('enclosure')?.getAttribute('url') || '',
        imageUrl,
        publishedAt: item.querySelector('pubDate')?.textContent?.trim() || '',
        durationText: item.getElementsByTagName('itunes:duration')[0]?.textContent?.trim() || '',
        index,
      };
    })
    .filter((episode) => Boolean(episode.audioUrl));
};

const safeDate = (date: string) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.valueOf())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function Artwork({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={!src || failed ? FALLBACK_ART : src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function App() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [entered, setEntered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);
  const [lightsDown, setLightsDown] = useState(false);
  const [autoContinue, setAutoContinue] = useState(true);
  const [upNext, setUpNext] = useState<Episode | null>(null);
  const [upNextDismissedFor, setUpNextDismissedFor] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadCatalog = async (force = false) => {
    setLoadError(false);
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { savedAt: number; episodes: Episode[] };
          if (Date.now() - parsed.savedAt < CACHE_TTL && parsed.episodes?.length) {
            setEpisodes(parsed.episodes);
            setLoading(false);
          }
        }
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    try {
      const response = await fetch(FEED_URL, { headers: { Accept: 'application/rss+xml, text/xml' } });
      if (!response.ok) throw new Error('Feed request failed');
      const xml = await response.text();
      const parsed = parseFeed(xml);
      if (!parsed.length) throw new Error('No productions found');
      setEpisodes(parsed);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), episodes: parsed }));
      setLoading(false);
    } catch {
      setLoading(false);
      setLoadError(true);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  const featured = episodes[0] || null;

  const filteredEpisodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = featured ? episodes.slice(1) : episodes;
    if (!needle) return list;
    return list.filter((episode) =>
      `${episode.title} ${episode.description}`.toLowerCase().includes(needle)
    );
  }, [episodes, featured, query]);

  const findNextChapter = (episode: Episode | null) => {
    if (!episode) return null;
    const current = sequenceInfo(episode.title);
    if (!current.root) return null;

    const candidates = episodes.filter((candidate) => candidate.id !== episode.id && sameStory(candidate.title, episode.title));
    if (!candidates.length) return null;

    if (current.part !== null) {
      const exact = candidates.find((candidate) => sequenceInfo(candidate.title).part === current.part! + 1);
      if (exact) return exact;
    }

    const currentPosition = episodes.findIndex((candidate) => candidate.id === episode.id);
    const adjacentNewer = currentPosition > 0 ? episodes[currentPosition - 1] : null;
    if (adjacentNewer && sameStory(adjacentNewer.title, episode.title)) return adjacentNewer;
    const adjacentOlder = currentPosition < episodes.length - 1 ? episodes[currentPosition + 1] : null;
    if (adjacentOlder && sameStory(adjacentOlder.title, episode.title)) return adjacentOlder;

    return null;
  };

  const beginEpisode = async (episode: Episode) => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlaybackError(false);
    setUpNext(null);
    setUpNextDismissedFor(null);
    setCurrentTime(0);
    setDuration(0);
    setActiveEpisode(episode);
    setEntered(true);

    audio.pause();
    audio.src = episode.audioUrl;
    audio.load();

    try {
      await audio.play();
    } catch {
      setIsPlaying(false);
      setPlaybackError(true);
    }
  };

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio || !activeEpisode) return;
    setPlaybackError(false);
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaybackError(true);
      }
    } else {
      audio.pause();
    }
  };

  const closePlayer = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setActiveEpisode(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setUpNext(null);
    setUpNextDismissedFor(null);
    setPlaybackError(false);
    setLightsDown(false);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !activeEpisode) return;
    const current = audio.currentTime || 0;
    const total = Number.isFinite(audio.duration) ? audio.duration : 0;
    setCurrentTime(current);
    if (total) setDuration(total);

    const remaining = total - current;
    if (
      total > 30 &&
      remaining <= 18 &&
      remaining > 0 &&
      upNextDismissedFor !== activeEpisode.id &&
      !upNext
    ) {
      setUpNext(findNextChapter(activeEpisode));
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(duration);
    const next = findNextChapter(activeEpisode);
    if (autoContinue && next) {
      void beginEpisode(next);
    } else {
      setUpNext(next);
    }
  };

  const seek = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setCurrentTime(value);
  };

  const skipForward = () => {
    if (!audioRef.current) return;
    const target = Math.min((audioRef.current.currentTime || 0) + 30, duration || Infinity);
    seek(target);
  };

  const dismissUpNext = () => {
    if (activeEpisode) setUpNextDismissedFor(activeEpisode.id);
    setUpNext(null);
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading && episodes.length === 0) {
    return (
      <main className="loading-screen">
        <div className="loading-mark">JAT</div>
        <div className="loading-line" />
        <p>Raising the curtain</p>
      </main>
    );
  }

  if (loadError && episodes.length === 0) {
    return (
      <main className="error-screen">
        <div className="error-monogram">JAT</div>
        <p className="eyebrow">The repertory is temporarily unavailable</p>
        <h1>The curtain will rise again.</h1>
        <p>We couldn't reach the Jewish Audio Theater archive. Your browser and the site are still working.</p>
        <button className="gold-button" onClick={() => { setLoading(true); void loadCatalog(true); }}>
          Try Again <ArrowRight size={18} />
        </button>
      </main>
    );
  }

  return (
    <div className={`app-shell ${lightsDown ? 'lights-down' : ''} ${activeEpisode ? 'has-player' : ''}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => setPlaybackError(true)}
      />

      {!entered && (
        <div className="entrance" role="dialog" aria-label="Enter Jewish Audio Theater">
          <div className="entrance-haze entrance-haze-one" />
          <div className="entrance-haze entrance-haze-two" />
          <div className="entrance-frame" />
          <div className="entrance-content">
            <span className="entrance-kicker">Heshy Riesel presents</span>
            <div className="entrance-mark">JAT</div>
            <h1>Jewish Audio Theater</h1>
            <p>Timeless stories. Brought to life.</p>
            <button className="entrance-button" onClick={() => setEntered(true)}>
              Enter the Theater <ArrowRight size={18} />
            </button>
            <span className="entrance-footnote">Stories • History • Suspense • Imagination</span>
          </div>
        </div>
      )}

      <header className="site-header">
        <button className="brand-lockup" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Jewish Audio Theater home">
          <span className="brand-monogram">JAT</span>
          <span className="brand-copy">
            <strong>Jewish Audio Theater</strong>
            <small>Timeless stories brought to life</small>
          </span>
        </button>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <button onClick={() => scrollTo('repertory')}>Repertory</button>
          <button onClick={() => scrollTo('maggid')}>The Maggid</button>
          <button onClick={() => scrollTo('auditions')}>Auditions</button>
          <a href="mailto:Maggid@jewishaudiotheater.com">Contact</a>
        </nav>

        <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu size={25} />
        </button>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <button className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
          <span className="mobile-menu-mark">JAT</span>
          <button onClick={() => scrollTo('repertory')}>The Repertory</button>
          <button onClick={() => scrollTo('maggid')}>The Maggid</button>
          <button onClick={() => scrollTo('auditions')}>Auditions</button>
          <a href="mailto:Maggid@jewishaudiotheater.com">Contact Heshy</a>
        </div>
      )}

      <main id="stage-content">
        {featured && (
          <section className="hero" aria-labelledby="featured-title">
            <div className="hero-glow" />
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="hero-status"><span /> Now Showing</div>
                <p className="eyebrow">A Jewish Audio Theater Production</p>
                <h1 id="featured-title">{featured.title}</h1>
                <p className="hero-description">
                  {featured.description || 'Step inside a world of Jewish history, character, suspense and imagination.'}
                </p>
                <div className="hero-actions">
                  <button className="gold-button hero-play" onClick={() => beginEpisode(featured)}>
                    <Play size={19} fill="currentColor" /> Begin Production
                  </button>
                  <button className="text-button" onClick={() => scrollTo('repertory')}>
                    Explore the Repertory <ArrowDown size={17} />
                  </button>
                </div>
                <div className="hero-meta">
                  {safeDate(featured.publishedAt) && <span>{safeDate(featured.publishedAt)}</span>}
                  {featured.durationText && <span>{featured.durationText}</span>}
                  <span>Heshy Riesel • The Maggid</span>
                </div>
              </div>

              <div className="hero-art-wrap">
                <div className="hero-art-backdrop" />
                <Artwork src={featured.imageUrl} alt={`Artwork for ${featured.title}`} className="hero-art" />
                <div className="hero-art-seal">
                  <span>Now</span>
                  <strong>Playing</strong>
                </div>
              </div>
            </div>
            <button className="hero-scroll" onClick={() => scrollTo('repertory')} aria-label="Scroll to repertory"><ArrowDown /></button>
          </section>
        )}

        <section className="manifesto" aria-label="Jewish Audio Theater introduction">
          <div className="manifesto-rule" />
          <p>Not simply told.</p>
          <h2>Heard. Felt. Remembered.</h2>
          <p className="manifesto-body">Jewish stories transformed into immersive audio theater through voice, character, atmosphere and suspense.</p>
        </section>

        <section id="repertory" className="repertory section-anchor">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">The Archive</p>
              <h2>The Repertory</h2>
            </div>
            <p>Every production. One stage.</p>
          </div>

          <div className="repertory-toolbar">
            <label className="search-box">
              <Search size={18} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stories, history, characters..."
                aria-label="Search the repertory"
              />
              {query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}
            </label>
            <span>{filteredEpisodes.length} productions</span>
          </div>

          {filteredEpisodes.length ? (
            <div className="repertory-grid">
              {filteredEpisodes.map((episode, index) => (
                <article className="production-card" key={episode.id}>
                  <button className="production-art-button" onClick={() => beginEpisode(episode)} aria-label={`Play ${episode.title}`}>
                    <Artwork src={episode.imageUrl} alt={`Artwork for ${episode.title}`} className="production-art" />
                    <span className="production-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="production-play"><Play fill="currentColor" /></span>
                  </button>
                  <div className="production-card-copy">
                    <p className="production-label">The Maggid Production</p>
                    <h3>{episode.title}</h3>
                    <p>{episode.description || 'A production from the Jewish Audio Theater repertory.'}</p>
                    <button onClick={() => beginEpisode(episode)}>
                      Listen Now <ChevronRight size={16} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-search">
              <Search />
              <h3>No production matches “{query}”</h3>
              <button onClick={() => setQuery('')}>View the full repertory</button>
            </div>
          )}
        </section>

        <section id="maggid" className="maggid section-anchor">
          <div className="maggid-orbit" />
          <div className="maggid-grid">
            <div className="maggid-mark" aria-hidden="true">HR</div>
            <div className="maggid-copy">
              <p className="eyebrow">Behind the Curtain</p>
              <h2>Heshy Riesel</h2>
              <h3>The Maggid</h3>
              <p>Storyteller, dramatist and creator of Jewish Audio Theater. Heshy Riesel brings Jewish stories and history to life through immersive audio productions made to be experienced, not merely heard.</p>
              <a className="outline-button" href="mailto:Maggid@jewishaudiotheater.com">
                <Mail size={17} /> Contact the Maggid
              </a>
            </div>
          </div>
        </section>

        <section id="auditions" className="auditions section-anchor">
          <div className="audition-icon"><Sparkles /></div>
          <p className="eyebrow dark">Step Onto the Stage</p>
          <h2>Your voice could be part of the next story.</h2>
          <p>Jewish Audio Theater periodically casts children and adults for upcoming productions. Introduce yourself and ask about current opportunities.</p>
          <a className="dark-button" href="mailto:Maggid@jewishaudiotheater.com?subject=Jewish%20Audio%20Theater%20Audition">
            Audition Inquiry <ArrowRight size={18} />
          </a>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="footer-monogram">JAT</span>
          <div>
            <strong>Jewish Audio Theater</strong>
            <p>Timeless stories brought to life.</p>
          </div>
        </div>
        <div className="footer-contact">
          <span>Heshy Riesel • The Maggid</span>
          <a href="mailto:Maggid@jewishaudiotheater.com">Maggid@jewishaudiotheater.com</a>
        </div>
        <p className="footer-legal">© {new Date().getFullYear()} Jewish Audio Theater. All rights reserved.</p>
      </footer>

      {activeEpisode && (
        <>
          {upNext && (
            <aside className="up-next" aria-live="polite">
              <button className="up-next-close" onClick={dismissUpNext} aria-label="Dismiss up next"><X size={16} /></button>
              <Artwork src={upNext.imageUrl} alt="" className="up-next-art" />
              <div>
                <span>Up Next</span>
                <strong>{upNext.title}</strong>
                <p>{autoContinue ? 'Begins when this production ends' : 'Ready when you are'}</p>
              </div>
              <button className="up-next-play" onClick={() => beginEpisode(upNext)} aria-label={`Play ${upNext.title}`}><Play size={17} fill="currentColor" /></button>
            </aside>
          )}

          <div className="player-shell" role="region" aria-label="Audio player">
            {playbackError && (
              <div className="player-error">Playback could not start. Press play to try again.</div>
            )}
            <div className="player-progress-wrap">
              <input
                className="player-progress"
                type="range"
                min="0"
                max={duration || 0}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label="Playback position"
              />
            </div>
            <div className="player-inner">
              <div className="player-episode">
                <Artwork src={activeEpisode.imageUrl} alt="" className="player-art" />
                <div className="player-title-wrap">
                  <span>Now Playing</span>
                  <strong>{activeEpisode.title}</strong>
                  <small>{formatClock(currentTime)} / {formatClock(duration)}</small>
                </div>
              </div>

              <div className="player-controls">
                <button className="icon-button" onClick={skipForward} aria-label="Skip forward 30 seconds"><SkipForward size={20} /></button>
                <button className="main-play" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause size={27} fill="currentColor" /> : <Play size={27} fill="currentColor" />}
                </button>
                <button
                  className={`icon-button ${lightsDown ? 'active' : ''}`}
                  onClick={() => setLightsDown((value) => !value)}
                  aria-label="Toggle lights down mode"
                >
                  <Moon size={20} />
                </button>
              </div>

              <div className="player-options">
                <label className="autoplay-control">
                  <input type="checkbox" checked={autoContinue} onChange={(event) => setAutoContinue(event.target.checked)} />
                  <span>Continue chapters</span>
                </label>
                <Volume2 size={18} className="volume-icon" />
                <button className="player-close" onClick={closePlayer} aria-label="Close player"><X size={22} /></button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
