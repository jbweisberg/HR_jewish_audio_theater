import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, CheckCircle2, Menu, Globe, Music, Share2, AlertCircle, Loader2, Headphones, FastForward, PlayCircle
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_authority_seamless_vFINAL";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showContinuity, setShowContinuity] = useState(false); // Seamless Transition UI
  const [countdown, setCountdown] = useState(10);
  const [warned, setWarned] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  useEffect(() => {
    async function loadTheater() {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setEpisodes(JSON.parse(cached)); setLoading(false); }
      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`);
        const data = await res.json();
        const xml = new DOMParser().parseFromString(data.contents, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).map((item, i) => ({
          id: item.querySelector("guid")?.textContent || String(i),
          title: item.querySelector("title")?.textContent || "Jewish Audio Theater Production",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
          date: item.querySelector("pubDate")?.textContent ? new Date(item.querySelector("pubDate")!.textContent!).toLocaleDateString() : ""
        }));
        setEpisodes(items);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) { setLoading(false); }
    }
    loadTheater();
  }, []);

  // Continuity Timer Logic (10s Transition)
  useEffect(() => {
    let timer: any;
    if (showContinuity && nextEp && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showContinuity && countdown === 0 && nextEp) {
      triggerAutoPlay();
    }
    return () => clearInterval(timer);
  }, [showContinuity, countdown]);

  const triggerAutoPlay = () => {
    if (nextEp) {
      const target = nextEp;
      setNextEp(null);
      setShowContinuity(false);
      togglePlay(target);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowContinuity(false);
    setWarned(false);
    setCountdown(10);

    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  // INTERCEPT ENGINE: This finds the series Part 2 before Part 1 ends
  const findSeriesLink = () => {
    const currentIndex = episodes.findIndex(e => e.id === activeEp?.id);
    if (currentIndex <= 0) return null; // No newer part available

    const getBase = (str: string) => str.split(/Part|Chapter|Pt|\d|:|-/i)[0].trim().toLowerCase();
    const currentBase = getBase(activeEp.title);
    
    // Look at Index - 1 (Newer part)
    const newerPart = episodes[currentIndex - 1];
    if (newerPart.title.toLowerCase().includes(currentBase)) {
      return newerPart;
    }
    return null;
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur) return;

    setCurrentTime(current);

    // 1. SEAMLESS TRANSITION TRIGGER: Exactly 10 seconds before end (Skips dead-air)
    if (!showContinuity && dur > 30 && (dur - current < 10)) {
      const candidate = findSeriesLink();
      if (candidate) {
        setNextEp(candidate);
        setShowContinuity(true);
      }
    }

    // 2. PARENTAL WARNING & CHIME: Triggered at 60s remaining
    if (dur > 70 && (dur - current <= 60.5 && dur - current >= 58.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={40} /></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60);

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans w-full overflow-x-hidden selection:bg-theater-gold selection:text-black">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* CONTINUITY OVERLAY: CINEMATIC YOUTUBE-STYLE */}
      {showContinuity && nextEp && (
        <div className="fixed inset-0 z-[300] bg-[#050A14]/98 flex items-center justify-center p-6 animate-in fade-in duration-1000">
           <div className="max-w-lg w-full bg-theater-parchment p-10 md:p-14 text-center border-t-[12px] border-theater-gold shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setShowContinuity(false)} className="text-theater-midnight/20 hover:text-black"><X /></button>
              </div>
              <FastForward className="text-[#4A0E0E] mx-auto mb-6 animate-bounce" size={40} />
              <p className="text-[10px] uppercase font-black text-theater-burgundy tracking-[0.4em] mb-4">Series Continuity Active</p>
              <h2 className="text-[#050A14] font-serif text-3xl md:text-5xl uppercase mb-8 italic font-black leading-tight">{nextEp.title}</h2>
              <div className="flex flex-col items-center gap-6">
                <button onClick={triggerAutoPlay} className="bg-theater-midnight text-theater-gold px-12 py-4 font-black uppercase text-xs tracking-widest hover:scale-105 transition active:scale-95 shadow-xl flex items-center gap-2">
                   Part {episodes.length - (episodes.findIndex(e => e.id === nextEp.id))} Starting in {countdown}s
                </button>
                <div className="w-full h-1.5 bg-black/5 rounded-full overflow-hidden max-w-xs">
                  <div className="h-full bg-theater-gold continuity-bar-fill"></div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* NAV: FIXED & HORIZONTALLY BALANCED */}
      <nav className="fixed top-0 w-full z-[150] bg-[#050A14]/95 backdrop-blur-lg border-b border-[#D4AF37]/10 px-6 h-20 md:h-24">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-full">
          <div className="flex flex-col text-left justify-center">
            <h1 className="font-serif text-2xl md:text-3xl text-theater-gold uppercase leading-none italic font-black">Jewish Audio Theater</h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-white/50 font-black mt-1 leading-none uppercase">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[11px] font-black uppercase tracking-widest text-[#D4AF37]">
            <a href="#vault" className="hover:text-white transition">Vault</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="hover:text-white transition border-l border-white/20 pl-8 ml-8">Heshy Riesel Direct</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-[#D4AF37]"><Menu size={32} /></button>
        </div>
        {isMenuOpen && <div className="md:hidden fixed inset-0 top-20 bg-theater-midnight p-12 flex flex-col items-center gap-10 z-[200]"><a href="#vault" onClick={()=>setIsMenuOpen(false)} className="text-3xl font-serif">Vault</a><a href="mailto:Maggid@jewishaudiotheater.com" className="text-3xl font-serif">Contact</a></div>}
      </nav>

      {/* HERO SECTION */}
      {episodes.length > 0 && (
        <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E88_0%,_transparent_75%)] opacity-30"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
            <div className="md:col-span-7">
              <h2 className="text-5xl sm:text-7xl lg:text-[115px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <p className="text-xl md:text-3xl font-light opacity-90 mb-10 italic border-l-2 border-[#D4AF37]/50 pl-8 text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-[#D4AF37] text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-sm md:text-lg hover:bg-theater-parchment transition shadow-2xl flex items-center gap-4">
                {activeEp?.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
                Experience Theater
              </button>
            </div>
            <div className="hidden md:block md:col-span-5 relative group">
              <div className="absolute -inset-4 bg-theater-gold/10 blur-3xl transition duration-1000"></div>
              <img src={episodes[0].image} className="relative w-full aspect-square object-cover border-8 border-theater-gold/20 shadow-2xl grayscale group-hover:grayscale-0 transition duration-700" alt="Heshy Riesel" />
            </div>
          </div>
        </header>
      )}

      {/* VAULT SECTION */}
      <section id="vault" className="bg-[#F5F2E8] text-theater-midnight py-32 md:py-48 px-8 text-left">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-6xl md:text-[140px] font-serif uppercase tracking-tighter border-b-8 border-theater-midnight pb-6 mb-24 italic leading-none font-black">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 bg-black/40 group-hover:backdrop-blur-sm">
                    <PlayCircle size={64} className="text-white drop-shadow-2xl" />
                  </div>
                </div>
                <h4 className="text-3xl md:text-4xl font-serif uppercase leading-tight italic font-black text-theater-midnight tracking-tighter">{ep.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-48 px-6 bg-theater-midnight text-center border-t border-white/5">
        <Headphones className="mx-auto text-[#D4AF37] mb-12 opacity-30" size={64} />
        <h2 className="text-4xl md:text-8xl font-serif uppercase tracking-tighter mb-10 text-theater-gold italic">Contact the Maggid</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic px-6 block">Maggid@jewishaudiotheater.com</a>
        <div className="mt-20 flex justify-center gap-12 text-[#D4AF37]/30">
          <Globe size={32} /> <Music size={32} /> <Share2 size={32} />
        </div>
        <p className="mt-20 text-[9px] uppercase tracking-[0.5em] opacity-30 italic font-black">© 2024 Heshy Riesel • Authority Production Archive</p>
      </footer>

      {/* MASTER SEAMLESS PLAYER BAR */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-[#D4AF37] px-6 md:px-12 py-8 md:py-14 z-[250] shadow-[0_-20px_100px_rgba(0,0,0,1)] transition-all duration-700 ${isFinalMinute ? 'final-minute-warning' : 'bg-[#0A0F1B]'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
            
            {isFinalMinute && (
              <div className="w-full flex items-center justify-center gap-2 text-white font-black uppercase text-[12px] tracking-[0.4em] mb-1 animate-bounce">
                <AlertCircle size={20} /> Parental Warning: One Minute Remaining
              </div>
            )}

            <div className="w-full flex items-center gap-8">
              <span className="text-[11px] font-black text-[#D4AF37] w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none cursor-pointer accent-[#D4AF37]" />
              <span className="text-[11px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4 text-left truncate flex-1 pr-8">
                <img src={activeEp.image} className="w-16 h-16 md:w-20 md:h-20 object-cover border-2 border-white/20" alt="" />
                <div className="truncate">
                  <h5 className="text-base md:text-3xl font-serif text-[#D4AF37] uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase tracking-[0.4em] font-black opacity-30 italic leading-none">Heshy Riesel • Timeless Stories</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <button onClick={() => togglePlay()} className="w-14 h-14 md:w-24 md:h-24 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300">
                  {isPlaying ? <Pause size={40} /> : <Play size={40} className="ml-1" fill="black" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 p-2 hover:text-white transition-all"><X size={32} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
