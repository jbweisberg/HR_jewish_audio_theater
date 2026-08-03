import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, CheckCircle2, Menu, Globe, Music, Share2, AlertCircle, Loader2, Headphones
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_seamless_v50";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showNextUp, setShowNextUp] = useState(false);
  const [transitionCount, setTransitionCount] = useState(10);
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
          title: item.querySelector("title")?.textContent || "Production",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
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

  // Continuity Countdown Engine
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
    setShowNextUp(false);
    setTransitionCount(10);
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
    if (showNextUp) return;
    const currentIndex = episodes.findIndex(e => e.id === activeEp?.id);
    
    // G-D MOVE LOGIC: Moves toward Newer part in Feed (Lower Index)
    if (currentIndex > 0) {
      const currentBaseName = activeEp.title.split(/Part|Chapter/i)[0].trim().toLowerCase();
      const candidate = episodes[currentIndex - 1];

      if (candidate.title.toLowerCase().includes(currentBaseName)) {
        setNextEp(candidate);
        setShowNextUp(true);
      } else {
        // Not a series part? Wait for full ending instead of early transition
        console.log("No part found in series sequence.");
      }
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur) return;

    setCurrentTime(current);

    // 1. SEAMLESS INTERCEPT: Fire 8 seconds early to skip recording silence
    if (dur > 20 && (dur - current < 8) && !showNextUp) {
      prepareTransition();
    }

    // 2. PARENTAL WARNING: At 60 seconds
    if (dur > 65 && (dur - current <= 60.5 && dur - current >= 58.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  if (loading && episodes.length === 0) return (
    <div className="h-screen bg-[#050A14] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
    </div>
  );

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60);

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans w-full overflow-x-hidden selection:bg-theater-burgundy">
      <audio 
        ref={audioRef} 
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} 
        preload="auto" 
      />

      {/* FIXED NAV - RE-LEVELED */}
      <nav className="fixed top-0 w-full z-[150] bg-[#050A14]/95 backdrop-blur-lg border-b border-[#D4AF37]/10 px-6 py-6 h-20 md:h-24">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-full">
          <div className="flex flex-col text-left justify-center">
            <h1 className="font-serif text-2xl md:text-3xl text-[#D4AF37] uppercase leading-none italic font-black">Jewish Audio Theater</h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-[#F5F2E8]/40 font-black mt-1 leading-none">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <a href="#vault" className="hover:text-white transition">Vault</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="hover:text-white transition font-black border-l border-white/10 pl-8 ml-8">Heshy Riesel Direct</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-[#D4AF37]"><Menu size={32} /></button>
        </div>
        {isMenuOpen && (
          <div className="md:hidden fixed inset-0 top-20 bg-theater-midnight flex flex-col items-center justify-center gap-8 animate-in slide-in-from-top duration-300">
             <a href="#vault" onClick={() => setIsMenuOpen(false)} className="text-3xl font-serif italic text-[#D4AF37]">Vault</a>
             <a href="mailto:Maggid@jewishaudiotheater.com" className="text-3xl font-serif text-[#D4AF37]">Contact</a>
             <button onClick={() => setIsMenuOpen(false)} className="p-4"><X size={40} /></button>
          </div>
        )}
      </nav>

      {/* SEAMLESS COUNTDOWN OVERLAY */}
      {showNextUp && nextEp && (
        <div className="fixed inset-0 z-[300] bg-[#050A14]/98 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#F5F2E8] p-8 md:p-14 text-center border-t-8 border-[#D4AF37] shadow-2xl">
            <fastForward className="text-[#4A0E0E] mx-auto mb-6" />
            <p className="text-[12px] uppercase font-black text-[#4A0E0E] mb-2 tracking-[0.4em]">Up Next In Series</p>
            <h2 className="text-[#050A14] font-serif text-3xl md:text-5xl uppercase mb-8 italic font-black leading-tight tracking-tighter">{nextEp.title}</h2>
            <div className="flex items-center justify-center gap-8 mb-12">
               <button onClick={playNextEpisode} className="bg-[#050A14] text-[#D4AF37] px-10 py-4 font-black uppercase text-xs">Play {transitionCount}s</button>
               <button onClick={() => setShowNextUp(false)} className="text-[10px] font-black uppercase text-black/20">Cancel</button>
            </div>
            <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
               <div className="h-full bg-theater-gold transition-all duration-1000" style={{ width: `${(transitionCount/10)*100}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE */}
      {episodes.length > 0 && (
        <header id="stage" className="relative min-h-screen flex items-center pt-24 px-8 text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_75%)] opacity-30"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
            <div className="md:col-span-7">
              <h2 className="text-5xl sm:text-7xl lg:text-[110px] font-serif leading-[0.82] mb-10 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <p className="text-xl md:text-3xl font-light opacity-90 mb-12 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed text-white">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-sm md:text-base hover:bg-theater-parchment transition shadow-2xl flex items-center gap-4">
                {activeEp?.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
                Experience Production
              </button>
            </div>
            <div className="hidden md:block md:col-span-5 self-center relative group">
              <div className="absolute -inset-4 bg-theater-gold/20 blur-2xl group-hover:bg-theater-gold/30 transition duration-1000"></div>
              <img src={episodes[0].image} className="relative w-full aspect-square object-cover border-8 border-theater-gold/20 shadow-2xl grayscale" alt="" />
            </div>
          </div>
        </header>
      )}

      {/* THE VAULT */}
      <section id="vault" className="bg-[#F5F2E8] text-[#050A14] py-32 md:py-48 px-6 md:px-12 text-left">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-6xl md:text-[160px] font-serif uppercase tracking-tighter border-b-8 border-theater-midnight/10 pb-8 mb-24 italic leading-none font-black opacity-95">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-32">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 bg-black/40">
                    <Play size={48} className="text-theater-gold" />
                  </div>
                </div>
                <h4 className="text-3xl md:text-4xl font-serif uppercase leading-tight italic font-black text-theater-midnight tracking-tighter leading-none mb-4">{ep.title}</h4>
                <div className="h-1 w-20 bg-theater-burgundy opacity-10"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-32 md:py-48 px-6 bg-theater-midnight text-center">
        <Headphones className="mx-auto text-theater-gold mb-16 opacity-30" size={64} />
        <h2 className="text-4xl md:text-8xl font-serif uppercase tracking-tighter mb-12 text-theater-gold italic font-black">Contact</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic break-words px-4 leading-none inline-block">Maggid@jewishaudiotheater.com</a>
        <div className="mt-20 flex justify-center gap-12 text-theater-gold/20">
          <Globe size={28} /> <Music size={28} /> <Share2 size={28} />
        </div>
        <p className="mt-20 text-[10px] uppercase tracking-[0.5em] opacity-30 font-black italic tracking-[0.2em]">© 2024 Heshy Riesel • Authority Production Archive</p>
      </footer>

      {/* PLAYER BAR */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-[#D4AF37] px-6 md:px-12 py-8 md:py-14 z-[250] shadow-2xl transition-all duration-1000 ${isFinalMinute ? 'bg-[#8B0000]' : 'bg-[#0A0F1B]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.3em] mb-4 animate-bounce">Parental Warning: One Minute Remaining</div>}
            
            <div className="flex items-center gap-8 mb-8">
              <span className="text-[12px] font-black text-[#D4AF37] w-14 text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-1.5 bg-white/10 appearance-none cursor-pointer accent-[#D4AF37]" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4 text-left truncate flex-1 pr-10">
                <img src={activeEp.image} className="w-16 h-16 md:w-24 md:h-24 object-cover border-2 border-white/20" alt="" />
                <div className="truncate">
                  <h5 className="text-base md:text-3xl font-serif text-[#D4AF37] uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[9px] uppercase tracking-[0.4em] font-black opacity-30 italic leading-none">Heshy Riesel • Timeless Stories</p>
                </div>
              </div>
              <div className="flex items-center gap-6 md:gap-10">
                <button onClick={() => togglePlay()} className="w-14 h-14 md:w-24 md:h-24 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl transition-all hover:scale-105 active:scale-95">
                  {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
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
