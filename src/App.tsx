import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ChevronRight,
  Copy,
  ExternalLink,
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

type SequenceInfo = { root: string; part: number | null };
type ResumeState = { episodeId: string; currentTime: number; duration: number; savedAt: number };

const FEED_URL = '/api/feed';
const CHIME_URL = '/api/chime';
const CONTACT_EMAIL = 'Maggid@jewishaudiotheater.com';
const CACHE_KEY = 'jat_repertory_v3';
const CACHE_TTL = 10 * 60 * 1000;
const RESUME_KEY = 'jat_resume_v1';
const FALLBACK_ART = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
    <defs><radialGradient id="bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#65181c"/><stop offset="0.48" stop-color="#1a0b0d"/><stop offset="1" stop-color="#050506"/></radialGradient><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4df9b"/><stop offset="0.45" stop-color="#c59a38"/><stop offset="1" stop-color="#7a5520"/></linearGradient></defs>
    <rect width="1200" height="1200" fill="url(#bg)"/><circle cx="600" cy="600" r="370" fill="none" stroke="url(#gold)" stroke-width="3" opacity=".55"/><circle cx="600" cy="600" r="320" fill="none" stroke="#d8b45b" stroke-width="1" opacity=".22"/><text x="600" y="625" text-anchor="middle" fill="url(#gold)" font-size="260" font-family="Georgia, serif" font-weight="700" font-style="italic">JAT</text><text x="600" y="740" text-anchor="middle" fill="#eee7db" opacity=".75" font-size="34" font-family="Arial, sans-serif" letter-spacing="12">JEWISH AUDIO THEATER</text>
  </svg>`);

const htmlToText = (html: string) => {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
};

const formatClock = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
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
  const match = normalized.match(/(?:\s*[-:|]\s*|\s+)(?:part|pt\.?|chapter|episode)\s*(\d+|[ivx]+)\b/i);
  const part = match ? (/^\d+$/.test(match[1]) ? Number(match[1]) : romanToNumber(match[1])) : null;
  const root = normalized.replace(/(?:\s*[-:|]\s*|\s+)(?:part|pt\.?|chapter|episode)\s*(?:\d+|[ivx]+)\b.*$/i, '').replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return { root, part };
};

const sameStory = (a: string, b: string) => {
  const aa = sequenceInfo(a), bb = sequenceInfo(b);
  if (!aa.root || !bb.root) return false;
  return aa.root === bb.root || (aa.root.length > 8 && bb.root.includes(aa.root)) || (bb.root.length > 8 && aa.root.includes(bb.root));
};

const parseFeed = (xmlText: string): Episode[] => {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('Invalid RSS response');
  const channelArt = xml.getElementsByTagName('itunes:image')[0]?.getAttribute('href') || xml.querySelector('channel > image > url')?.textContent || '';
  return Array.from(xml.querySelectorAll('item')).map((item, index) => {
    const rawDescription = item.querySelector('description')?.textContent || item.getElementsByTagName('content:encoded')[0]?.textContent || '';
    return {
      id: item.querySelector('guid')?.textContent?.trim() || `jat-${index}`,
      title: item.querySelector('title')?.textContent?.trim() || 'Jewish Audio Theater Production',
      description: htmlToText(rawDescription),
      audioUrl: item.querySelector('enclosure')?.getAttribute('url') || '',
      imageUrl: item.getElementsByTagName('itunes:image')[0]?.getAttribute('href') || item.querySelector('image')?.getAttribute('href') || channelArt || '',
      publishedAt: item.querySelector('pubDate')?.textContent?.trim() || '',
      durationText: item.getElementsByTagName('itunes:duration')[0]?.textContent?.trim() || '',
      index,
    };
  }).filter((episode) => Boolean(episode.audioUrl));
};

const safeDate = (date: string) => {
  if (!date) return '';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.valueOf())) return '';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function Artwork({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const desiredSrc = src || FALLBACK_ART;
  const [displaySrc, setDisplaySrc] = useState(desiredSrc);
  const [ready, setReady] = useState(false);
  useEffect(() => { setDisplaySrc(desiredSrc); setReady(false); }, [desiredSrc]);
  return <img key={displaySrc} src={displaySrc} alt={alt} className={className} loading="lazy" style={{ opacity: ready ? 1 : 0, transition: 'opacity 140ms ease' }} onLoad={() => setReady(true)} onError={() => displaySrc !== FALLBACK_ART ? (setReady(false), setDisplaySrc(FALLBACK_ART)) : setReady(true)} />;
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
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState('Jewish Audio Theater');
  const [contactCopied, setContactCopied] = useState(false);
  const [resumeState, setResumeState] = useState<ResumeState | null>(() => { try { const raw = localStorage.getItem(RESUME_KEY); return raw ? JSON.parse(raw) as ResumeState : null; } catch { return null; } });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chimeRef = useRef<HTMLAudioElement | null>(null);
  const chimeArmedRef = useRef(false);
  const chimePlayedForRef = useRef<string | null>(null);
  const pendingResumeRef = useRef(0);
  const lastResumeSavedSecondRef = useRef(-1);

  const loadCatalog = async (force = false) => {
    setLoadError(false); setLoading(true);
    let cachedEpisodes: Episode[] | null = null;
    if (!force) try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) { const parsed = JSON.parse(cached) as { savedAt: number; episodes: Episode[] }; if (Date.now() - parsed.savedAt < CACHE_TTL && parsed.episodes?.length) cachedEpisodes = parsed.episodes; }
    } catch { localStorage.removeItem(CACHE_KEY); }
    try {
      const response = await fetch(FEED_URL, { headers: { Accept: 'application/rss+xml, text/xml' } });
      if (!response.ok) throw new Error('Feed request failed');
      const parsed = parseFeed(await response.text());
      if (!parsed.length) throw new Error('No productions found');
      setEpisodes(parsed); localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), episodes: parsed })); setLoadError(false);
    } catch {
      if (cachedEpisodes?.length) { setEpisodes(cachedEpisodes); setLoadError(false); } else setLoadError(true);
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadCatalog(); }, []);
  const featured = episodes[0] || null;
  const filteredEpisodes = useMemo(() => { const needle = query.trim().toLowerCase(); const list = featured ? episodes.slice(1) : episodes; return needle ? list.filter((episode) => `${episode.title} ${episode.description}`.toLowerCase().includes(needle)) : list; }, [episodes, featured, query]);
  const resumeEpisode = useMemo(() => resumeState && resumeState.currentTime >= 30 && (resumeState.duration <= 0 || resumeState.duration - resumeState.currentTime >= 60) ? episodes.find((episode) => episode.id === resumeState.episodeId) || null : null, [episodes, resumeState]);

  const findNextChapter = (episode: Episode | null) => {
    if (!episode) return null;
    const current = sequenceInfo(episode.title); if (!current.root) return null;
    const candidates = episodes.filter((candidate) => candidate.id !== episode.id && sameStory(candidate.title, episode.title));
    if (!candidates.length) return null;
    if (current.part !== null) { const exact = candidates.find((candidate) => sequenceInfo(candidate.title).part === current.part! + 1); if (exact) return exact; }
    const position = episodes.findIndex((candidate) => candidate.id === episode.id);
    const newer = position > 0 ? episodes[position - 1] : null; if (newer && sameStory(newer.title, episode.title)) return newer;
    const older = position < episodes.length - 1 ? episodes[position + 1] : null; if (older && sameStory(older.title, episode.title)) return older;
    return null;
  };

  const getBedtimeChoices = (episode: Episode) => { const next = findNextChapter(episode); const alternatives = episodes.filter((candidate) => candidate.id !== episode.id && candidate.id !== next?.id).slice(0, next ? 2 : 3); return next ? [next, ...alternatives] : alternatives; };

  const getChime = () => { if (chimeRef.current) return chimeRef.current; const chime = new Audio(CHIME_URL); chime.preload = 'auto'; chime.loop = true; chime.volume = 0.001; chime.playsInline = true; chimeRef.current = chime; return chime; };
  const armChime = () => { const chime = getChime(); chime.loop = true; chime.volume = 0.001; if (!chime.paused) { chimeArmedRef.current = true; return; } void chime.play().then(() => { chimeArmedRef.current = true; }).catch(() => { chimeArmedRef.current = false; }); };
  const stopChime = () => { const chime = chimeRef.current; if (!chime) return; try { chime.pause(); chime.currentTime = 0; chime.volume = 0.001; chime.loop = true; } catch {} chimeArmedRef.current = false; };
  const soundTheaterChime = () => { const chime = getChime(); if (chimeArmedRef.current && !chime.paused) { try { chime.loop = false; chime.currentTime = 0; chime.volume = 0.9; return true; } catch {} } const direct = new Audio(CHIME_URL); direct.volume = 0.9; void direct.play().catch(() => {}); return !direct.paused; };

  useEffect(() => { const cleanup = () => stopChime(); window.addEventListener('pagehide', cleanup); window.addEventListener('beforeunload', cleanup); return () => { window.removeEventListener('pagehide', cleanup); window.removeEventListener('beforeunload', cleanup); stopChime(); }; }, []);
  useEffect(() => { if (!contactOpen) return; const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setContactOpen(false); }; document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close); }, [contactOpen]);

  const persistResume = (episode: Episode, position: number, total: number) => {
    if (!Number.isFinite(position) || position < 20) return;
    if (total > 0 && total - position < 30) { try { localStorage.removeItem(RESUME_KEY); } catch {} setResumeState(null); return; }
    const state = { episodeId: episode.id, currentTime: position, duration: total, savedAt: Date.now() }; try { localStorage.setItem(RESUME_KEY, JSON.stringify(state)); setResumeState(state); } catch {}
  };
  const clearResume = () => { try { localStorage.removeItem(RESUME_KEY); } catch {} setResumeState(null); };

  const beginEpisode = async (episode: Episode, startAt = 0) => {
    const audio = audioRef.current; if (!audio) return;
    if (activeEpisode && activeEpisode.id !== episode.id) persistResume(activeEpisode, currentTime, duration);
    setPlaybackError(false); setUpNext(null); setTransitionChoices([]); setShowBedtimeHandoff(false); setHandoffDismissedFor(null); setCurrentTime(startAt); setDuration(0); setActiveEpisode(episode); setEntered(true); chimePlayedForRef.current = null; lastResumeSavedSecondRef.current = -1; pendingResumeRef.current = Math.max(0, startAt);
    audio.pause(); audio.muted = startAt > 0; audio.src = episode.audioUrl; audio.load();
    try { await audio.play(); } catch { audio.muted = false; setIsPlaying(false); setPlaybackError(true); }
  };
  const startEpisodeFromGesture = (episode: Episode, startAt = 0) => { armChime(); void beginEpisode(episode, startAt); };
  const togglePlayback = async () => { const audio = audioRef.current; if (!audio || !activeEpisode) return; setPlaybackError(false); if (audio.paused) { armChime(); try { await audio.play(); } catch { setPlaybackError(true); } } else audio.pause(); };
  const closePlayer = () => { const audio = audioRef.current; if (activeEpisode) persistResume(activeEpisode, currentTime, duration); if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } stopChime(); setActiveEpisode(null); setIsPlaying(false); setCurrentTime(0); setDuration(0); setUpNext(null); setTransitionChoices([]); setShowBedtimeHandoff(false); setHandoffDismissedFor(null); setPlaybackError(false); setLightsDown(false); };
  const handleLoadedMetadata = () => { const audio = audioRef.current; if (!audio) return; const total = Number.isFinite(audio.duration) ? audio.duration : 0; setDuration(total); const requested = pendingResumeRef.current; if (requested > 0 && total > 0) { const target = Math.min(requested, Math.max(0, total - 1)); try { audio.currentTime = target; setCurrentTime(target); } catch {} } pendingResumeRef.current = 0; audio.muted = false; };
  const handleTimeUpdate = () => { const audio = audioRef.current; if (!audio || !activeEpisode) return; const current = audio.currentTime || 0; const total = Number.isFinite(audio.duration) ? audio.duration : 0; setCurrentTime(current); if (total) setDuration(total); const remaining = total - current; const second = Math.floor(current); if (second > 0 && second % 5 === 0 && second !== lastResumeSavedSecondRef.current) { lastResumeSavedSecondRef.current = second; persistResume(activeEpisode, current, total); } if (total > 75 && remaining <= 60.5 && remaining >= 59 && chimePlayedForRef.current !== activeEpisode.id && soundTheaterChime()) chimePlayedForRef.current = activeEpisode.id; if (total > 30 && remaining <= 15 && remaining > 0 && handoffDismissedFor !== activeEpisode.id && !showBedtimeHandoff) { setUpNext(findNextChapter(activeEpisode)); setTransitionChoices(getBedtimeChoices(activeEpisode)); setShowBedtimeHandoff(true); } };
  const handleEnded = () => { setIsPlaying(false); setCurrentTime(duration); stopChime(); clearResume(); if (activeEpisode && handoffDismissedFor !== activeEpisode.id) { setUpNext(findNextChapter(activeEpisode)); setTransitionChoices(getBedtimeChoices(activeEpisode)); setShowBedtimeHandoff(true); } };
  const seek = (value: number) => { if (!audioRef.current) return; audioRef.current.currentTime = value; setCurrentTime(value); };
  const skipForward = () => { if (audioRef.current) seek(Math.min((audioRef.current.currentTime || 0) + 30, duration || Infinity)); };
  const dismissBedtimeHandoff = () => { if (activeEpisode) setHandoffDismissedFor(activeEpisode.id); setShowBedtimeHandoff(false); };
  const scrollTo = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const openContact = (subject = 'Jewish Audio Theater') => { setMenuOpen(false); setContactSubject(subject); setContactCopied(false); setContactOpen(true); };
  const copyEmail = async () => { try { await navigator.clipboard.writeText(CONTACT_EMAIL); setContactCopied(true); } catch { const textarea = document.createElement('textarea'); textarea.value = CONTACT_EMAIL; textarea.style.position = 'fixed'; textarea.style.opacity = '0'; document.body.appendChild(textarea); textarea.select(); document.execCommand('copy'); textarea.remove(); setContactCopied(true); } window.setTimeout(() => setContactCopied(false), 1800); };

  if (loading && episodes.length === 0) return <main className="loading-screen"><div className="loading-mark">JAT</div><div className="loading-line" /><p>Raising the curtain</p></main>;
  if (loadError && episodes.length === 0) return <main className="error-screen"><div className="error-monogram">JAT</div><p className="eyebrow">The repertory is temporarily unavailable</p><h1>The curtain will rise again.</h1><p>We couldn't reach the Jewish Audio Theater archive. Your browser and the site are still working.</p><button className="gold-button" onClick={() => void loadCatalog(true)}>Try Again <ArrowRight size={18} /></button></main>;

  const remainingSeconds = duration > 0 ? Math.max(0, Math.ceil(duration - currentTime)) : 0;
  const finalMinuteAlert = Boolean(activeEpisode && duration > 75 && remainingSeconds <= 60 && remainingSeconds > 15 && !showBedtimeHandoff);

  return <div className={`app-shell ${lightsDown ? 'lights-down' : ''} ${activeEpisode ? 'has-player' : ''} ${finalMinuteAlert ? 'final-minute-alert' : ''}`}>
    {finalMinuteAlert && <div className="final-minute-ambient" aria-hidden="true" />}
    <audio ref={audioRef} preload="metadata" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onLoadedMetadata={handleLoadedMetadata} onDurationChange={() => setDuration(audioRef.current?.duration || 0)} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} onError={() => setPlaybackError(true)} />

    {!entered && <div className="entrance" role="dialog" aria-label="Enter Jewish Audio Theater"><div className="entrance-haze entrance-haze-one" /><div className="entrance-haze entrance-haze-two" /><div className="entrance-frame" /><div className="entrance-content"><span className="entrance-kicker">Heshy Riesel presents</span><div className="entrance-mark">JAT</div><h1>Jewish Audio Theater</h1><p>Timeless stories. Brought to life.</p><button className="entrance-button" onClick={() => setEntered(true)}>Enter the Theater <ArrowRight size={18} /></button>{resumeEpisode && resumeState && <button className="resume-curtain-card" onClick={() => startEpisodeFromGesture(resumeEpisode, resumeState.currentTime)}><span>The curtain is waiting</span><strong>Continue {resumeEpisode.title}</strong><small>Resume at {formatClock(resumeState.currentTime)} <Play size={13} fill="currentColor" /></small></button>}<span className="entrance-footnote">Stories • History • Suspense • Imagination</span></div></div>}

    <header className="site-header"><button className="brand-lockup" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Jewish Audio Theater home"><span className="brand-monogram">JAT</span><span className="brand-copy"><strong>Jewish Audio Theater</strong><small>Timeless stories brought to life</small></span></button><nav className="desktop-nav" aria-label="Primary navigation"><button onClick={() => scrollTo('repertory')}>Repertory</button><button onClick={() => scrollTo('maggid')}>The Maggid</button><button onClick={() => scrollTo('auditions')}>Auditions</button><button onClick={() => openContact()}>Contact</button></nav><button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={25} /></button></header>
    {menuOpen && <div className="mobile-menu"><button className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button><span className="mobile-menu-mark">JAT</span><button onClick={() => scrollTo('repertory')}>The Repertory</button><button onClick={() => scrollTo('maggid')}>The Maggid</button><button onClick={() => scrollTo('auditions')}>Auditions</button><button onClick={() => openContact()}>Contact Heshy</button></div>}

    <main id="stage-content">
      {featured && <section className="hero" aria-labelledby="featured-title"><div className="hero-glow" /><div className="hero-grid"><div className="hero-copy"><div className="hero-status"><span /> Now Showing</div><p className="eyebrow">A Jewish Audio Theater Production</p><h1 id="featured-title">{featured.title}</h1><p className="hero-description">{featured.description || 'Step inside a world of Jewish history, character, suspense and imagination.'}</p><div className="hero-actions"><button className="gold-button hero-play" onClick={() => startEpisodeFromGesture(featured)}><Play size={19} fill="currentColor" /> Begin Production</button><button className="text-button" onClick={() => scrollTo('repertory')}>Explore the Repertory <ArrowDown size={17} /></button></div><div className="hero-meta">{safeDate(featured.publishedAt) && <span>{safeDate(featured.publishedAt)}</span>}{featured.durationText && <span>{featured.durationText}</span>}<span>Heshy Riesel • The Maggid</span></div></div><div className="hero-art-wrap"><div className="hero-art-backdrop" /><Artwork src={featured.imageUrl} alt={`Artwork for ${featured.title}`} className="hero-art" /><div className="hero-art-seal"><span>Now</span><strong>Playing</strong></div></div></div><button className="hero-scroll" onClick={() => scrollTo('repertory')} aria-label="Scroll to repertory"><ArrowDown /></button></section>}
      <section className="manifesto" aria-label="Jewish Audio Theater introduction"><div className="manifesto-rule" /><p>Not simply told.</p><h2>Heard. Felt. Remembered.</h2><p className="manifesto-body">Jewish stories transformed into immersive audio theater through voice, character, atmosphere and suspense.</p></section>
      <section id="repertory" className="repertory section-anchor"><div className="section-heading"><div><p className="eyebrow dark">The Archive</p><h2>The Repertory</h2></div><p>Every production. One stage.</p></div><div className="repertory-toolbar"><label className="search-box"><Search size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stories, history, characters..." aria-label="Search the repertory" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}</label><span>{filteredEpisodes.length} productions</span></div>{filteredEpisodes.length ? <div className="repertory-grid">{filteredEpisodes.map((episode, index) => <article className="production-card" key={episode.id}><button className="production-art-button" onClick={() => startEpisodeFromGesture(episode)} aria-label={`Play ${episode.title}`}><Artwork src={episode.imageUrl} alt={`Artwork for ${episode.title}`} className="production-art" /><span className="production-number">{String(index + 1).padStart(2, '0')}</span><span className="production-play"><Play fill="currentColor" /></span></button><div className="production-card-copy"><p className="production-label">The Maggid Production</p><h3>{episode.title}</h3><p>{episode.description || 'A production from the Jewish Audio Theater repertory.'}</p><button onClick={() => startEpisodeFromGesture(episode)}>Listen Now <ChevronRight size={16} /></button></div></article>)}</div> : <div className="empty-search"><Search /><h3>No production matches “{query}”</h3><button onClick={() => setQuery('')}>View the full repertory</button></div>}</section>
      <section id="maggid" className="maggid section-anchor"><div className="maggid-orbit" /><div className="maggid-grid"><div className="maggid-mark" aria-hidden="true">HR</div><div className="maggid-copy"><p className="eyebrow">Behind the Curtain</p><h2>Heshy Riesel</h2><h3>The Maggid</h3><p>Storyteller, dramatist and creator of Jewish Audio Theater. Heshy Riesel brings Jewish stories and history to life through immersive audio productions made to be experienced, not merely heard.</p><button className="outline-button" onClick={() => openContact()}><Mail size={17} /> Contact the Maggid</button></div></div></section>
      <section id="auditions" className="auditions section-anchor"><div className="audition-icon"><Sparkles /></div><p className="eyebrow dark">Step Onto the Stage</p><h2>Your voice could be part of the next story.</h2><p>Jewish Audio Theater periodically casts children and adults for upcoming productions. Introduce yourself and ask about current opportunities.</p><button className="dark-button" onClick={() => openContact('Jewish Audio Theater Audition')}>Audition Inquiry <ArrowRight size={18} /></button></section>
    </main>

    <footer className="site-footer"><div className="footer-brand"><span className="footer-monogram">JAT</span><div><strong>Jewish Audio Theater</strong><p>Timeless stories brought to life.</p></div></div><div className="footer-contact"><span>Heshy Riesel • The Maggid</span><button className="footer-contact-button" onClick={() => openContact()}>{CONTACT_EMAIL}</button></div><p className="footer-legal">© {new Date().getFullYear()} Jewish Audio Theater. All rights reserved.</p></footer>

    {contactOpen && <div className="contact-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setContactOpen(false); }}><section className="contact-panel" role="dialog" aria-modal="true" aria-labelledby="contact-title"><button className="contact-close" onClick={() => setContactOpen(false)} aria-label="Close contact"><X size={20} /></button><span className="contact-kicker">Contact the Maggid</span><h2 id="contact-title">Heshy Riesel</h2><p>{CONTACT_EMAIL}</p><div className="contact-actions"><button className="contact-primary" onClick={() => void copyEmail()}><Copy size={17} /> {contactCopied ? 'Email Copied' : 'Copy Email'}</button><a className="contact-secondary" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(contactSubject)}`}><Mail size={17} /> Open Email App</a></div><a className="contact-gmail" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(contactSubject)}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open Gmail in Browser</a></section></div>}

    {activeEpisode && <>{showBedtimeHandoff && transitionChoices.length > 0 && <aside className="bedtime-handoff" aria-live="polite" aria-label="Story ending choices"><div className="bedtime-handoff-shade" /><div className="bedtime-handoff-panel"><button className="bedtime-handoff-close" onClick={dismissBedtimeHandoff} aria-label="Keep listening without choices"><X size={18} /></button><div className="bedtime-handoff-copy"><span className="bedtime-kicker">The next adventure awaits</span><h2>Where will Jewish Audio Theater take you next?</h2><p>Continue the adventure with the next chapter, or step into a whole new story.</p></div><div className="bedtime-choice-grid">{transitionChoices.map((episode) => { const isNextChapter = upNext?.id === episode.id; return <button key={episode.id} className={`bedtime-choice ${isNextChapter ? 'next-chapter' : ''}`} onClick={() => startEpisodeFromGesture(episode)}><Artwork src={episode.imageUrl} alt="" className="bedtime-choice-art" /><span>{isNextChapter ? 'Next Chapter' : 'Discover Another Story'}</span><strong>{episode.title}</strong><small>Tap to start now</small></button>; })}</div><div className="bedtime-rest-note">No choice? The curtain falls here. Nothing else will play.</div></div></aside>}
      <div className={`player-shell ${finalMinuteAlert ? 'player-final-minute' : ''}`} role="region" aria-label="Audio player">{finalMinuteAlert && <div className="final-minute-banner" role="status"><span>1 Minute Alert</span><strong>Story finishes in {remainingSeconds}s</strong></div>}{playbackError && <div className="player-error">Playback could not start. Press play to try again.</div>}<div className="player-progress-wrap"><input className="player-progress" type="range" min="0" max={duration || 0} value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} aria-label="Playback position" /></div><div className="player-inner"><div className="player-episode"><Artwork src={activeEpisode.imageUrl} alt="" className="player-art" /><div className="player-title-wrap"><span>Now Playing</span><strong>{activeEpisode.title}</strong><small>{formatClock(currentTime)} / {formatClock(duration)}</small></div></div><div className="player-controls"><button className="icon-button" onClick={skipForward} aria-label="Skip forward 30 seconds"><SkipForward size={20} /></button><button className="main-play" onClick={() => void togglePlayback()} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? <Pause size={27} fill="currentColor" /> : <Play size={27} fill="currentColor" />}</button><button className={`icon-button ${lightsDown ? 'active' : ''}`} onClick={() => setLightsDown((value) => !value)} aria-label="Toggle lights down mode"><Moon size={20} /></button></div><div className="player-options"><Volume2 size={18} className="volume-icon" /><button className="player-close" onClick={closePlayer} aria-label="Close player"><X size={22} /></button></div></div></div></>}
  </div>;
}
