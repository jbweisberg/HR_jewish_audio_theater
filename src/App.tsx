import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, CheckCircle2, Menu, Globe, Music, Share2, AlertCircle, Loader2, FastForward
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_seamless_engine_v1";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showNextUp, setShowNextUp] = useState(false); // YouTube-style Up Next
  const [transitionCount, setTransitionCount] = useState(5);
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
          title: item.querySelector("title")?.textContent || "Theater Production",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 150) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
        }));
        setEpisodes(items);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) { setLoading(false); }
    }
    loadTheater();
  }, []);

  // --- THE SEAMLESS TRANSITION ENGINE ---
  useEffect(() => {
    let timer: any;
    if (showNextUp && transitionCount > 0) {
      timer = setInterval(() => setTransitionCount(v => v - 1), 1000);
    } else if (showNextUp && transitionCount === 0) {
      playNextEpisode();
    }
    return () => clearInterval(timer);
  }, [showNextUp, transitionCount]);

  const playNextEpisode = () => {
    if (nextEp) {
      setShowNextUp(false);
      togglePlay(nextEp);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowNextUp(false); // Kill any existing transition
    setTransitionCount(5); // Reset
    setWarned(false);

    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play();
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const prepareTransition = () => {
    const currentIndex = episodes.findIndex(e => e.id === activeEp?.id);
    // Find NEWER part (one step closer to index 0)
    if (currentIndex > 0) {
      const getRoot = (t: string) => t.split(/Part|Chapter/i)[0].trim().toLowerCase();
      const currentRoot = getRoot(activeEp.title);
      const target = episodes[currentIndex - 1];

      if (target.title.toLowerCase().includes(currentRoot)) {
        setNextEp(target);
        setShowNextUp(true);
      } else {
        // Just end if no related part
        setIsPlaying(false);
        setActiveEp(null);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(current);

    // 1. G-D MOVE HIJACK: Intercept 8 seconds early to skip trailing silence
    if (dur > 20 && (dur - current < 8) && !showNextUp) {
      prepareTransition();
    }

    // 2. PARENT CHIME: Exactly at 60 Seconds left
    if (dur > 70 && (dur - current <= 60.5 && dur - current >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center"><Loader2 className="animate-spin text-theater-gold" /></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60);

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans w-full overflow-x-hidden selection:bg-theater-gold selection:text-black">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* FIXED NAV - HORIZONTALLY LEVELED */}
      <nav className="fixed top-0 w-full z-[150] bg-[#050A14]/95 backdrop-blur-lg border-b border-[#D4AF37]/10 px-6 py-6 flex items-center h-20 md:h-24">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full h-full">
          <div className="flex flex-col text-left justify-center h-full">
            <h1 className="font-serif text-2xl md:text-3xl text-theater-gold uppercase leading-none italic font-black">Jewish Audio Theater</h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-white font-black mt-1 leading-none">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-widest text-theater-gold pt-1">
            <a href="#vault" className="hover:text-white transition">Vault</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="hover:text-white transition font-black border-l border-white/20 pl-8 ml-8">Heshy Riesel Direct</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold"><Menu size={32} /></button>
        </div>
        {isMenuOpen && <div className="md:hidden fixed inset-0 top-20 bg-theater-midnight flex flex-col items-center justify-center gap-8"><a href="#vault" onClick={()=>setIsMenuOpen(false)} className="text-3xl font-serif">Vault</a><a href="mailto:Maggid@jewishaudiotheater.com" className="text-3xl font-serif">Contact</a></div>}
      </nav>

      {/* SEAMLESS TRANSITION CARD (YOUTUBE STYLE) */}
      {showNextUp && nextEp && (
        <div className="fixed inset-0 z-[300] bg-theater-midnight/98 flex items-center justify-center animate-in fade-in duration-700">
           <div className="max-w-xl w-full p-8 md:p-12 text-center bg-theater-parchment text-theater-midnight border-t-[12px] border-theater-gold shadow-2xl">
              <p className="text-[12px] uppercase font-black text-theater-burgundy mb-2 tracking-[0.4em] leading-none">Continuity Check</p>
              <h2 className="text-3xl md:text-4xl font-serif italic font-black uppercase leading-tight mb-8">Up Next in Series</h2>
              <img src={nextEp.image} className="w-48 h-48 object-cover mx-auto mb-8 border-4 border-theater-midnight/5 shadow-xl" alt="" />
              <p className="text-2xl font-serif italic mb-10 font-bold px-4 leading-tight">{nextEp.title}</p>
              
              <div className="flex items-center justify-center gap-6">
                <button onClick={playNextEpisode} className="bg-theater-midnight text-theater-gold px-12 py-4 font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-theater-burgundy transition shadow-lg">
                  <Play size={16} fill="currentColor" /> Part {episodes.length - nextEp.id} Begins in {transitionCount}s
                </button>
                <button onClick={() => setShowNextUp(false)} className="p-4 text-theater-midnight/40 hover:text-black transition uppercase text-[10px] font-bold">Stop</button>
              </div>

              <div className="w-full h-1.5 bg-black/5 rounded-full mt-10 overflow-hidden">
                <div className="h-full bg-theater-gold transition-progress"></div>
              </div>
           </div>
        </div>
      )}

      {/* HERO SECTION */}
      {episodes.length > 0 && (
        <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-30"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
            <div className="md:col-span-7">
              <h2 className="text-5xl sm:text-7xl lg:text-[115px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <p className="text-xl md:text-3xl font-light opacity-90 mb-12 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed text-white">"Timeless Stories Brought to Life"</p>
              <div className="flex items-center gap-6">
                <button onClick={() => togglePlay(episodes[0])} className="bg-theater-gold text-black px-16 py-6 md:py-8 font-black uppercase text-sm md:text-lg hover:bg-theater-parchment transition shadow-2xl flex items-center gap-4">
                  {activeEp?.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
                  Experience Theater
                </button>
              </div>
            </div>
            <div className="hidden md:block md:col-span-5">
              <div className="relative group">
                <div className="absolute -inset-2 bg-theater-gold/20 blur-xl group-hover:bg-theater-gold/30 transition duration-1000"></div>
                <img src={episodes[0].image} className="relative w-full aspect-square object-cover border-8 border-theater-gold/30 shadow-2xl grayscale group-hover:grayscale-0 transition duration-700" alt="Heshy Riesel Authority" />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* VAULT */}
      <section id="vault" className="bg-theater-parchment text-[#050A14] py-32 md:py-48 px-8 text-left border-y-[12px] border-theater-midnight shadow-inner">
        <div className="max-w-7xl mx-auto text-left">
          <h3 className="text-6xl md:text-[160px] font-serif uppercase tracking-tighter border-b-8 border-theater-midnight pb-8 mb-24 italic leading-none font-black opacity-95">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl border-4 border-white">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40 group-hover:backdrop-blur-sm">
                    <Play size={56} fill="white" className="text-white drop-shadow-2xl" />
                  </div>
                </div>
                <h4 className="text-3xl md:text-4xl font-serif uppercase leading-[1.1] italic font-black text-theater-midnight tracking-tighter">{ep.title}</h4>
                <p className="mt-4 text-[11px] font-black uppercase opacity-60 tracking-[0.3em] text-theater-burgundy">Authority Selection</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-32 md:py-60 px-6 bg-theater-midnight text-center">
        <div className="flex items-center justify-center gap-4 mb-16 text-theater-gold/30">
          <div className="h-[2px] w-20 bg-theater-gold/10"></div>
          <Headphones size={40} />
          <div className="h-[2px] w-20 bg-theater-gold/10"></div>
        </div>
        <h2 className="text-4xl md:text-9xl font-serif uppercase tracking-tighter mb-12 text-theater-gold italic font-black">Contact</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-lg md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic break-words leading-none px-4 block">Maggid@jewishaudiotheater.com</a>
        <div className="mt-20 flex justify-center gap-16 text-theater-gold/20">
          <Globe size={32} /> <Music size={32} /> <Share2 size={32} />
        </div>
        <p className="mt-24 text-[10px] uppercase tracking-[0.5em] opacity-40 font-black italic tracking-widest leading-none">© 2024 Heshy Riesel • Authority Production Archive</p>
      </footer>

      {/* MASTER SEAMLESS PLAYER BAR */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-4 border-theater-gold px-6 md:px-12 py-8 md:py-14 z-[250] shadow-[0_-40px_100px_rgba(0,0,0,1)] transition-all duration-700 ${isFinalMinute ? 'alert-red' : 'bg-[#0A0F1B]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && (
              <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.4em] mb-4 animate-bounce flex items-center justify-center gap-2">
                <AlertCircle size={24} fill="red" /> Parental Continuity: 1 Minute Remaining
              </div>
            )}
            
            <div className="flex items-center gap-8 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/40 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-left truncate flex-1 pr-10">
                <img src={activeEp.image} className="w-16 h-16 md:w-24 md:h-24 object-cover border-2 border-white/20 shadow-2xl" alt="" />
                <div className="truncate">
                  <h5 className="text-lg md:text-4xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black tracking-tighter">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-xs uppercase tracking-[0.5em] font-black text-white/50 italic mt-2 leading-none uppercase">Heshy Riesel Authority</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-24 md:h-24 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-[0_0_50px_rgba(212,175,55,0.4)] hover:scale-110 active:scale-90 transition-all duration-300">
                  {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-1" fill="black" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 hover:text-white transition-all transform hover:scale-110"><X size={40} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
