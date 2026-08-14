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
const SMART_SILENCE_WINDOW_SECONDS = 8;
const SMART_SILENCE_HOLD_MS = 1800;
const SMART_SILENCE_RMS = 0.0085;
const SMART_SIGNAL_RMS = 0.014;
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
  const [upNext, setUpNext] = useState<Episode | null>(null);
  const [transitionChoices, setTransitionChoices] = useState<Episode[]>([]);
  const [showBedtimeHandoff, setShowBedtimeHandoff] = useState(false);
  const [handoffDismissedFor, setHandoffDismissedFor] = useState<string | null>(null);
  const [chimePlayedFor, setChimePlayedFor] = useState<string | null>(null);
  const [queuedEpisode, setQueuedEpisode] = useState<Episode | null>(null);
  const [smartHandoffActive, setSmartHandoffActive] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queuedEpisodeRef = useRef<Episode | null>(null);
  const analysisAudioRef = useRef<HTMLAudioElement | null>(null);
  const analysisContextRef = useRef<AudioContext | null>(null);
  const analysisFrameRef = useRef<number | null>(null);
  const analysisSilenceStartedAtRef = useRef<number | null>(null);
  const analysisSawSignalRef = useRef(false);
  const transitionInFlightRef = useRef(false);

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

  useEffect(() => {
    queuedEpisodeRef.current = queuedEpisode;
  }, [queuedEpisode]);

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

  const getBedtimeChoices = (episode: Episode) => {
    const next = findNextChapter(episode);
    const alternatives = episodes
      .filter((candidate) => candidate.id !== episode.id && candidate.id !== next?.id)
      .slice(0, next ? 2 : 3);
    return next ? [next, ...alternatives] : alternatives;
  };

  const playParentChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const gain = context.createGain();
      const first = context.createOscillator();
      const second = context.createOscillator();
      const now = context.currentTime;

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.018, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      first.frequency.setValueAtTime(784, now);
      second.frequency.setValueAtTime(1174.66, now);
      first.type = 'sine';
      second.type = 'sine';
      first.connect(gain);
      second.connect(gain);
      gain.connect(context.destination);
      first.start(now);
      second.start(now + 0.08);
      first.stop(now + 0.5);
      second.stop(now + 0.7);
      window.setTimeout(() => void context.close(), 900);
    } catch {
      // The story must never be interrupted because a notification tone failed.
    }
  };

  const stopSilenceMonitor = () => {
    if (analysisFrameRef.current !== null) {
      cancelAnimationFrame(analysisFrameRef.current);
      analysisFrameRef.current = null;
    }

    const analysisAudio = analysisAudioRef.current;
    if (analysisAudio) {
      analysisAudio.pause();
      analysisAudio.removeAttribute('src');
      analysisAudio.load();
      analysisAudioRef.current = null;
    }

    const context = analysisContextRef.current;
    if (context) {
      void context.close().catch(() => {});
      analysisContextRef.current = null;
    }

    analysisSilenceStartedAtRef.current = null;
    analysisSawSignalRef.current = false;
    setSmartHandoffActive(false);
  };

  const startSilenceMonitor = async () => {
    const mainAudio = audioRef.current;
    const currentEpisode = activeEpisode;
    if (!mainAudio || !currentEpisode || mainAudio.ended) return;

    stopSilenceMonitor();

    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const analysisAudio = new Audio();
      analysisAudio.crossOrigin = 'anonymous';
      analysisAudio.preload = 'auto';
      analysisAudio.src = currentEpisode.audioUrl;
      analysisAudioRef.current = analysisAudio;

      await new Promise<void>((resolve, reject) => {
        const onReady = () => { cleanup(); resolve(); };
        const onError = () => { cleanup(); reject(new Error('Analyzer media unavailable')); };
        const cleanup = () => {
          analysisAudio.removeEventListener('loadedmetadata', onReady);
          analysisAudio.removeEventListener('error', onError);
        };
        analysisAudio.addEventListener('loadedmetadata', onReady, { once: true });
        analysisAudio.addEventListener('error', onError, { once: true });
        analysisAudio.load();
      });

      const context = new AudioContextClass();
      analysisContextRef.current = context;
      const source = context.createMediaElementSource(analysisAudio);
      const analyser = context.createAnalyser();
      const silentGain = context.createGain();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0;
      silentGain.gain.value = 0;
      source.connect(analyser);
      analyser.connect(silentGain);
      silentGain.connect(context.destination);

      if (context.state === 'suspended') await context.resume();

      const target = Math.min(mainAudio.currentTime || 0, Number.isFinite(analysisAudio.duration) ? Math.max(0, analysisAudio.duration - 0.05) : mainAudio.currentTime || 0);
      analysisAudio.currentTime = target;
      await analysisAudio.play();
      setSmartHandoffActive(true);

      const samples = new Uint8Array(analyser.fftSize);

      const monitor = () => {
        const main = audioRef.current;
        const queued = queuedEpisodeRef.current;
        if (!main || !queued || transitionInFlightRef.current) {
          stopSilenceMonitor();
          return;
        }

        if (main.paused || main.ended) {
          analysisSilenceStartedAtRef.current = null;
          if (!analysisAudio.paused) analysisAudio.pause();
          analysisFrameRef.current = requestAnimationFrame(monitor);
          return;
        }

        if (analysisAudio.paused) {
          void analysisAudio.play().catch(() => stopSilenceMonitor());
        }

        if (Math.abs((analysisAudio.currentTime || 0) - (main.currentTime || 0)) > 0.45) {
          try { analysisAudio.currentTime = main.currentTime || 0; } catch { /* seek sync is best effort */ }
        }

        analyser.getByteTimeDomainData(samples);
        let squareSum = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const normalized = (samples[i] - 128) / 128;
          squareSum += normalized * normalized;
        }
        const rms = Math.sqrt(squareSum / samples.length);
        if (rms >= SMART_SIGNAL_RMS) analysisSawSignalRef.current = true;

        const total = Number.isFinite(main.duration) ? main.duration : 0;
        const remaining = total - (main.currentTime || 0);
        const inSmartWindow = total > 0 && remaining > 0 && remaining <= SMART_SILENCE_WINDOW_SECONDS;

        if (inSmartWindow && analysisSawSignalRef.current && rms <= SMART_SILENCE_RMS) {
          if (analysisSilenceStartedAtRef.current === null) {
            analysisSilenceStartedAtRef.current = performance.now();
          } else if (performance.now() - analysisSilenceStartedAtRef.current >= SMART_SILENCE_HOLD_MS) {
            transitionInFlightRef.current = true;
            const next = queuedEpisodeRef.current;
            stopSilenceMonitor();
            setQueuedEpisode(null);
            if (next) void beginEpisode(next);
            return;
          }
        } else {
          analysisSilenceStartedAtRef.current = null;
        }

        analysisFrameRef.current = requestAnimationFrame(monitor);
      };

      analysisFrameRef.current = requestAnimationFrame(monitor);
    } catch {
      // Cross-origin analysis is optional. Never risk the production audio:
      // if the browser/CDN cannot expose waveform data, the queued story
      // simply waits for the real ended event instead.
      stopSilenceMonitor();
    }
  };

  const beginEpisode = async (episode: Episode) => {
    const audio = audioRef.current;
    if (!audio) return;

    stopSilenceMonitor();
    transitionInFlightRef.current = false;
    setQueuedEpisode(null);
    setPlaybackError(false);
    setUpNext(null);
    setTransitionChoices([]);
    setShowBedtimeHandoff(false);
    setHandoffDismissedFor(null);
    setChimePlayedFor(null);
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
    stopSilenceMonitor();
    transitionInFlightRef.current = false;
    setQueuedEpisode(null);
    setActiveEpisode(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setUpNext(null);
    setTransitionChoices([]);
    setShowBedtimeHandoff(false);
    setHandoffDismissedFor(null);
    setChimePlayedFor(null);
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

    // Quiet parent cue: once, when the story enters its final minute.
    // It never pauses, ducks, seeks, or otherwise changes the production audio.
    if (
      total > 75 &&
      remaining <= 60 &&
      remaining > 15 &&
      chimePlayedFor !== activeEpisode.id
    ) {
      setChimePlayedFor(activeEpisode.id);
      playParentChime();
    }

    // Bedtime handoff: change only the screen in the final 15 seconds.
    // Audio continues untouched through the real end, including trailing silence.
    if (
      total > 30 &&
      remaining <= 15 &&
      remaining > 0 &&
      handoffDismissedFor !== activeEpisode.id &&
      !showBedtimeHandoff
    ) {
      const choices = getBedtimeChoices(activeEpisode);
      const next = findNextChapter(activeEpisode);
      setUpNext(next);
      setTransitionChoices(choices);
      setShowBedtimeHandoff(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(duration);
    stopSilenceMonitor();

    const queued = queuedEpisodeRef.current;
    if (queued && !transitionInFlightRef.current) {
      transitionInFlightRef.current = true;
      setQueuedEpisode(null);
      void beginEpisode(queued);
      return;
    }

    // Bedtime-first behavior: without an explicit parental choice, never
    // auto-start another production. The choices remain on screen while
    // the room stays quiet.
    if (activeEpisode && handoffDismissedFor !== activeEpisode.id) {
      const next = findNextChapter(activeEpisode);
      setUpNext(next);
      setTransitionChoices(getBedtimeChoices(activeEpisode));
      setShowBedtimeHandoff(true);
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

  const chooseBedtimeHandoff = (episode: Episode) => {
    const audio = audioRef.current;
    const storyHasEnded = !audio || audio.ended || (duration > 0 && duration - currentTime <= 0.2);

    // Once the file has ended, a tap starts immediately. During the final
    // seconds, the first tap queues the selection for a natural-silence
    // handoff; tapping the already-queued choice again is an explicit
    // "start now" override.
    if (storyHasEnded || queuedEpisode?.id === episode.id) {
      transitionInFlightRef.current = true;
      stopSilenceMonitor();
      setQueuedEpisode(null);
      void beginEpisode(episode);
      return;
    }

    setQueuedEpisode(episode);
    queuedEpisodeRef.current = episode;
    void startSilenceMonitor();
  };

  const dismissBedtimeHandoff = () => {
    if (activeEpisode) setHandoffDismissedFor(activeEpisode.id);
    setQueuedEpisode(null);
    queuedEpisodeRef.current = null;
    stopSilenceMonitor();
    setShowBedtimeHandoff(false);
  };

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => () => stopSilenceMonitor(), []);

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

  const remainingSeconds = duration > 0 ? Math.max(0, Math.ceil(duration - currentTime)) : 0;
  const finalMinuteAlert = Boolean(
    activeEpisode &&
    duration > 75 &&
    remainingSeconds <= 60 &&
    remainingSeconds > 15 &&
    !showBedtimeHandoff
  );

  return (
    <div className={`app-shell ${lightsDown ? 'lights-down' : ''} ${activeEpisode ? 'has-player' : ''} ${finalMinuteAlert ? 'final-minute-alert' : ''}`}>
      {finalMinuteAlert && <div className="final-minute-ambient" aria-hidden="true" />}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          if (analysisAudioRef.current?.paused && queuedEpisodeRef.current) {
            void analysisAudioRef.current.play().catch(() => stopSilenceMonitor());
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          analysisAudioRef.current?.pause();
          analysisSilenceStartedAtRef.current = null;
        }}
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
          {showBedtimeHandoff && transitionChoices.length > 0 && (
            <aside className="bedtime-handoff" aria-live="polite" aria-label="Story ending choices">
              <div className="bedtime-handoff-shade" />
              <div className="bedtime-handoff-panel">
                <button className="bedtime-handoff-close" onClick={dismissBedtimeHandoff} aria-label="Keep listening without choices"><X size={18} /></button>
                <div className="bedtime-handoff-copy">
                  <span className="bedtime-kicker">The next adventure awaits</span>
                  <h2>Where will Jewish Audio Theater take you next?</h2>
                  <p>Continue the adventure with the next chapter, or step into a whole new story.</p>
                </div>
                <div className="bedtime-choice-grid">
                  {transitionChoices.map((episode, index) => {
                    const isNextChapter = upNext?.id === episode.id;
                    return (
                      <button key={episode.id} className={`bedtime-choice ${isNextChapter ? 'next-chapter' : ''} ${queuedEpisode?.id === episode.id ? 'queued' : ''}`} onClick={() => chooseBedtimeHandoff(episode)}>
                        <Artwork src={episode.imageUrl} alt="" className="bedtime-choice-art" />
                        <span>{isNextChapter ? 'Next Chapter' : index === 0 && !upNext ? 'New Adventure' : 'Discover Another Story'}</span>
                        <strong>{episode.title}</strong>
                        <small>{queuedEpisode?.id === episode.id
                          ? (smartHandoffActive ? 'Queued • listening for the natural ending • tap again to start now' : 'Queued • starts when this story ends • tap again to start now')
                          : (isPlaying ? 'Tap to queue for the natural ending' : 'Tap to start now')}</small>
                      </button>
                    );
                  })}
                </div>
                <div className="bedtime-rest-note">No choice? The curtain falls here. Nothing else will play.</div>
              </div>
            </aside>
          )}

          <div className={`player-shell ${finalMinuteAlert ? 'player-final-minute' : ''}`} role="region" aria-label="Audio player">
            {finalMinuteAlert && (
              <div className="final-minute-banner" role="status">
                <span>1 Minute Alert</span>
                <strong>Story finishes in {remainingSeconds}s</strong>
              </div>
            )}
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
