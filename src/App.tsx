import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, Library, 
  Mic2, CheckCircle2, Star, Menu, Globe, Music, Share2, AlertCircle, PlayCircle, Loader2, ArrowRight
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_production_vFinal_Clean";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [showCountdown, setShowCountdown] = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);
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

  // MASTER COUNTDOWN LOGIC
  useEffect(() => {
    let timer: any;
    if (showCountdown && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showCountdown && countdown === 0) {
      handleGoToNext();
    }
    return () => clearInterval(timer);
  }, [showCountdown, countdown]);

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowCountdown(false);
    setShowCurtain(false);
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

  const handleGoToNext = () => {
    if (nextEp) {
      const story = nextEp;
      setNextEp(null);
      setShowCountdown(false);
      togglePlay(story);
    }
  };

  const checkSeriesLink = () => {
    const currentIndex = episodes.findIndex(e => e.id === activeEp?.id);
    if (currentIndex <= 0) return null; // We are already at the newest ep

    const currentTitle = activeEp.title.toLowerCase();
    const olderPart = episodes[currentIndex - 1]; // Step closer to Index 0 (Part 2)

    // Clean match: Extract "Stefan" or whatever the main subject is
    const rootName = currentTitle.split(/part|chapter|pt|--|-/)[0].trim();
    if (olderPart.title.toLowerCase().includes(rootName)) {
      return olderPart;
    }
    return null;
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur) return;

    setCurrentTime(cur);

    // 1. SEAMLESS INTERCEPT: 10 SECONDS BEFORE END (Skips podbean trailing silence)
    if (!showCountdown && !showCurtain && (dur - cur < 10)) {
      const partnerEp = checkSeriesLink();
      if (partnerEp) {
        setNextEp(partnerEp);
        setShowCountdown(true);
        setCountdown(10);
      } else {
        // If not a series, show full recommendation curtain
        const randoms = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random()).slice(0, 3);
        setRecs(randoms);
        setShowCurtain(true);
      }
      // Halt current audio shortly so it doesn't play the last 2 secs of silence
      setTimeout(() => { if(audioRef.current) audioRef.current.pause(); setIsPlaying(false); }, 7000);
    }

    // 2. PARENT ALERT: At Exactly 60s
    if (dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#050A14] flex items-center justify-center"><Loader2 className="animate-spin text-[#D4AF37]" size={40}/></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60);

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans overflow-x-hidden selection:bg-theater-gold selection:text-black">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* FIXED NAV - RE-ALIGNED FOR LAPTOP */}
      <nav className="fixed top-0 w-full z-[150] bg-[#050A14]/95 backdrop-blur-lg border-b border-[#D4AF37]/10 px-6 h-20 flex items-center justify-center">
        <div className="max-w-7xl w-full flex justify-between items-center h-full">
          <div className="flex flex-col text-left justify-center pt-1">
            <h1 className="font-serif text-2xl md:text-3xl text-theater-gold uppercase leading-none italic font-black">Jewish Audio Theater</h1>
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-white/40 font-black mt-1">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-widest text-theater-gold pt-2">
            <a href="#vault" className="hover:text-white transition">Vault</a>
            <a href="#casting" className="hover:text-white transition">Audition</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="hover:text-white transition font-black border-l border-white/10 pl-8 ml-8">Contact Heshy Riesel</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold pt-1"><Menu size={32}/></button>
        </div>
      </nav>

      {/* FULL-PAGE CURTAIN FALL (If No Part 2 Found) */}
      {showCurtain && (
        <div className="fixed inset-0 z-[400] bg-theater-midnight flex items-center justify-center p-4 animate-in fade-in duration-700">
           <div className="max-w-4xl w-full bg-theater-parchment p-8 md:p-14 text-center shadow-2xl border-t-[12px] border-theater-gold overflow-y-auto max-h-screen">
             <CheckCircle2 size={48} className="text-theater-burgundy mx-auto mb-4" />
             <h2 className="text-[#050A14] font-serif text-3xl md:text-5xl uppercase mb-2 font-black">The Curtain Falls</h2>
             <p className="text-theater-midnight/50 italic mb-10 italic">This production has ended. Select your next tale:</p>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {recs.map(r => (
                 <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group text-left bg-white p-4 shadow-sm border border-black/5">
                   <div className="aspect-square mb-4 overflow-hidden"><img src={r.image} className="w-full h-full object-cover group-hover:scale-105 transition" /></div>
                   <p className="text-theater-midnight font-serif text-sm font-black italic">{r.title}</p>
                 </div>
               ))}
             </div>
             <button onClick={() => setShowCurtain(false)} className="mt-12 text-[10px] uppercase font-black opacity-30 tracking-[0.3em]">Back to Archive</button>
           </div>
        </div>
      )}

      {/* SERIES COUNTDOWN UI (IF NEXT EP FOUND) */}
      {showCountdown && nextEp && (
        <div className="fixed inset-0 z-[500] bg-[#050A14]/98 flex items-center justify-center animate-in zoom-in duration-500 p-4">
           <div className="max-w-xl w-full p-10 md:p-16 text-center bg-theater-parchment text-theater-midnight border-t-[15px] border-theater-gold shadow-[0_0_100px_rgba(0,0,0,1)]">
              <FastForward className="text-[#4A0E0E] mx-auto mb-8 animate-bounce" size={48} />
              <p className="text-[12px] uppercase font-black text-[#4A0E0E] mb-2 tracking-[0.5em] leading-none italic">Part {episodes.length - (episodes.findIndex(e=>e.id===nextEp.id))} In Series</p>
              <h2 className="text-4xl md:text-6xl font-serif italic font-black uppercase leading-tight tracking-tighter mb-10">{nextEp.title}</h2>
              <div className="flex flex-col items-center gap-6">
                <button onClick={handleGoToNext} className="bg-theater-midnight text-theater-gold px-12 py-5 font-black uppercase text-sm tracking-widest hover:scale-110 transition shadow-2xl">Play Episode Now</button>
                <p className="text-[10px] font-black uppercase opacity-20">Automatically starts in {countdown}s</p>
                <div className="w-64 h-1.5 bg-black/5 rounded-full overflow-hidden">
                   <div className="timer-bar"></div>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* HERO SECTION */}
      {episodes.length > 0 && (
        <header className="relative min-h-screen flex items-center pt-24 px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_75%)] opacity-40"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-16 relative z-10 items-center">
            <div className="md:col-span-7">
              <h2 className="text-5xl sm:text-7xl lg:text-[115px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <p className="text-2xl font-light opacity-90 mb-12 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-base hover:bg-white transition shadow-[0_0_60px_rgba(212,175,55,0.4)] flex items-center gap-6 transform hover:-rotate-1">
                {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} fill="currentColor" />}
                ENTER THEATER
              </button>
            </div>
            <div className="hidden md:block md:col-span-5 relative group">
              <div className="absolute -inset-4 bg-theater-gold/10 blur-3xl group-hover:bg-theater-gold/20 transition duration-1000"></div>
              <img src={episodes[0].image} className="relative w-full aspect-square object-cover border-[10px] border-theater-gold/20 shadow-2xl grayscale hover:grayscale-0 transition duration-700" alt="Heshy Riesel Timeless Story" />
            </div>
          </div>
        </header>
      )}

      {/* VAULT SECTION */}
      <section id="vault" className="bg-theater-parchment text-[#050A14] py-32 md:py-48 px-6 md:px-12 text-left border-y-[15px] border-theater-midnight shadow-inner">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-6xl md:text-[140px] font-serif uppercase tracking-tighter border-b-[6px] border-theater-midnight pb-6 mb-24 italic leading-none font-black text-theater-midnight/90">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-y-40">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl border-[1px] border-black/5">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/40 group-hover:backdrop-blur-sm">
                    <PlayCircle size={64} className="text-white drop-shadow-2xl" />
                  </div>
                </div>
                <h4 className="text-3xl md:text-4xl font-serif uppercase leading-tight italic font-black text-theater-midnight tracking-tighter mb-4">{ep.title}</h4>
                <p className="text-[10px] font-black uppercase text-theater-burgundy opacity-50 tracking-[0.3em] font-serif">Open Production Archive</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-32 md:py-60 px-6 bg-theater-midnight text-center border-t border-white/5">
        <Mic2 className="mx-auto text-theater-gold mb-16 opacity-30" size={64} />
        <h2 className="text-4xl md:text-9xl font-serif uppercase tracking-tighter mb-12 text-theater-gold italic font-black">Contact</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic leading-none inline-block">Maggid@jewishaudiotheater.com</a>
        <div className="mt-16 flex justify-center gap-16 text-theater-gold/20">
          <Globe size={32} /> <Music size={32} /> <Share2 size={32} />
        </div>
        <p className="mt-32 text-[10px] uppercase tracking-[0.6em] opacity-40 font-black italic tracking-widest leading-none">© 2024 Heshy Riesel • AUTHORITY PRODUCTION ARCHIVE</p>
      </footer>

      {/* PLAYER BAR: G-D MOVE VISUALS */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-[1px] border-theater-gold px-6 md:px-12 py-10 md:py-16 z-[250] shadow-[0_-30px_100px_rgba(0,0,0,1)] transition-all duration-700 ${isFinalMinute ? 'red-alert-active' : 'bg-[#090D17]'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-14">
            
            {isFinalMinute && (
              <div className="w-full flex items-center justify-center gap-2 text-white font-black uppercase text-[11px] tracking-[0.4em] mb-1 animate-bounce">
                <AlertCircle size={20} className="fill-red-600"/> Parental Monitor: Final Minute Active
              </div>
            )}

            <div className="w-full flex items-center gap-10">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[2px] bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-6 text-left truncate flex-1 pr-12">
                <img src={activeEp.image} className="w-16 h-16 md:w-28 md:h-24 object-cover border border-white/20 shadow-2xl" alt="" />
                <div className="truncate">
                  <h5 className="text-xl md:text-4xl font-serif text-[#D4AF37] uppercase italic truncate leading-none mb-1 font-black tracking-tighter">{activeEp.title}</h5>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-black text-white/40 mt-2 italic leading-none uppercase">Heshy Riesel • Timeless Story</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300 transform -rotate-1">
                  {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-2" fill="black" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 p-2 hover:text-white transition-all transform hover:scale-110 hover:rotate-90"><X size={48} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
