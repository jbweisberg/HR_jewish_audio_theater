import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, FastForward, PlayCircle, Loader2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_final_v100";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [warned, setWarned] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  
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

  // Continuity Timer Logic
  useEffect(() => {
    let timer: any;
    if (showOverlay && nextEp && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showOverlay && nextEp && countdown === 0) {
      triggerTransition();
    }
    return () => clearInterval(timer);
  }, [showOverlay, countdown, nextEp]);

  const triggerTransition = () => {
    if (nextEp) {
      const target = nextEp;
      setNextEp(null);
      setShowOverlay(false);
      togglePlay(target);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowOverlay(false);
    setWarned(false);
    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur) return;
    setCurrentTime(cur);

    // G-D MOVE INTERCEPT: 10 Seconds remaining skips the recorded trailing silence
    if (!showOverlay && (dur - cur < 10)) {
      const idx = episodes.findIndex(e => e.id === activeEp.id);
      const rootName = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();

      // Look back for Newer Part (RSS has newer episodes at lower indices)
      if (idx > 0) {
        const potential = episodes[idx - 1];
        if (potential.title.toLowerCase().includes(rootName)) {
          setNextEp(potential);
        } else { findRecommendations(); }
      } else { findRecommendations(); }
      
      setCountdown(10);
      setShowOverlay(true);
      if(audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
    }

    // PARENT CHIME
    if (!showOverlay && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const findRecommendations = () => {
    const s = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random());
    setRecs(s.slice(0, 3));
    setNextEp(null);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={48} /></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60) && !showOverlay;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans overflow-x-hidden selection:bg-theater-gold`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />
      
      {/* THE DIMMER OVERLAY (Applies strictly to Background) */}
      <div className={`fixed inset-0 z-[100] bg-black pointer-events-none transition-opacity duration-1000 ${isDimmed ? 'opacity-85' : 'opacity-0'}`}></div>

      {/* --- SEAMLESS CONTINUITY OVERLAY --- */}
      {showOverlay && (
        <div className="fixed inset-0 z-[1000] bg-theater-midnight/98 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-700">
           <div className="max-w-4xl w-full bg-theater-parchment text-theater-midnight p-8 md:p-14 shadow-2xl border-t-[10px] border-theater-gold relative">
              {nextEp ? (
                <div className="text-center">
                   <p className="text-xs uppercase font-black text-theater-burgundy tracking-[0.4em] mb-4">Continuity Engine</p>
                   <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase mb-10 tracking-tighter leading-none">The Story Continues</h2>
                   <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-10 text-left">
                      <img src={nextEp.image} className="w-56 h-56 object-cover border-4 border-black/5 shadow-2xl" alt="" />
                      <div>
                         <p className="text-3xl font-serif font-black italic mb-6 leading-tight">{nextEp.title}</p>
                         <button onClick={triggerTransition} className="bg-theater-midnight text-theater-gold px-12 py-5 font-black uppercase text-xs tracking-widest hover:scale-105 transition shadow-2xl">Start Next Part ({countdown}s)</button>
                      </div>
                   </div>
                   <div className="w-64 h-1 bg-black/5 rounded-full overflow-hidden mx-auto"><div className="timer-drain"></div></div>
                </div>
              ) : (
                <div className="text-center">
                   <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase mb-10 tracking-tighter">Choose a New Adventure</h2>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                      {recs.map(r => (
                        <div key={r.id} onClick={() => togglePlay(r)} className="group cursor-pointer">
                           <img src={r.image} className="w-full aspect-square object-cover mb-4 border border-black/5 group-hover:scale-105 transition" alt="" />
                           <p className="text-sm font-black italic uppercase leading-none opacity-80">{r.title}</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}
              <button onClick={() => setShowOverlay(false)} className="mt-12 text-[10px] uppercase font-black opacity-30 tracking-[0.6em] hover:opacity-100 transition block mx-auto">Return to Archive</button>
           </div>
        </div>
      )}

      {/* STAGE CONTENT */}
      <div className={`transition-all duration-1000 ${isDimmed ? 'filter blur-md brightness-50' : ''}`}>
        <nav className="fixed top-0 w-full z-[150] h-20 md:h-24 px-6 md:px-12 flex items-center border-b border-white/5 bg-theater-midnight/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left pt-1">
               <h1 className="font-serif text-2xl md:text-3xl text-theater-gold leading-none italic font-black">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] text-white opacity-40 mt-1 leading-none">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-widest pt-2">
              <a href="#vault" className="text-theater-gold hover:text-white transition">Vault</a>
              <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 text-white hover:text-theater-gold transition font-bold uppercase tracking-[0.1em]">Heshy Riesel • THE MAGGID</a>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_75%)] opacity-30 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 items-center z-10">
              <div className="md:col-span-7 flex flex-col justify-center">
                <h2 className="text-5xl md:text-9xl lg:text-[115px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-xs md:text-sm hover:bg-[#F5F2E8] transition shadow-2xl flex items-center gap-6 shadow-[0_0_80px_rgba(212,175,55,0.3)]">
                  <Play size={24} fill="black" /> START STORY
                </button>
              </div>
              <div className="hidden md:block md:col-span-5 relative">
                <img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] grayscale" />
              </div>
            </div>
          </header>
        )}

        {/* THE VAULT */}
        <section id="vault" className="bg-[#F5F2E8] text-theater-midnight py-32 px-6 md:px-12 border-y-[15px] border-[#02040A]">
          <div className="max-w-7xl mx-auto text-left">
             <h3 className="text-6xl md:text-[160px] font-serif uppercase tracking-tighter border-b-8 border-black/5 pb-8 mb-24 italic leading-none font-black opacity-90">The Vault</h3>
             <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-32">
                {episodes.length > 1 && episodes.slice(1).map((ep) => (
                  <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                    <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl border border-black/5">
                      <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 bg-black/40"><PlayCircle size={64} className="text-theater-gold" /></div>
                    </div>
                    <h4 className="text-3xl md:text-4xl font-serif uppercase italic font-black text-[#02040A] tracking-tighter leading-none">{ep.title}</h4>
                    <p className="mt-4 text-[10px] uppercase font-black text-theater-burgundy opacity-40 italic font-black">Heshy Riesel • THE MAGGID</p>
                  </div>
                ))}
             </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="py-48 bg-theater-midnight text-center z-10 relative">
        <Headphones className="mx-auto text-theater-gold mb-12 opacity-30" size={64} />
        <h2 className="text-3xl md:text-8xl font-serif uppercase tracking-tighter mb-10 text-theater-gold italic">Contact the Maggid</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic block leading-none px-6 break-words">Maggid@jewishaudiotheater.com</a>
        <div className="mt-16 flex justify-center gap-10 text-theater-gold/20">
          <Globe size={32} /> <Music size={32} /> <Share2 size={32} />
        </div>
      </footer>

      {/* --- MASTER PLAYER: EXCLUDED FROM BLUR/DIMMER --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold/50 px-6 md:px-12 py-10 md:py-16 z-[2000] shadow-[0_-30px_100px_#000] transition-all duration-700 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce flex items-center justify-center gap-2"><AlertCircle size={20}/> 1 Minute Remaining • Parental Check</div>}
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            <div className="w-full flex items-center justify-between gap-10">
              <div className="flex items-center gap-6 text-left truncate flex-1">
                <img src={activeEp.image} className="w-16 h-16 md:w-28 md:h-28 object-cover border-2 border-white/20" alt="" />
                <div className="truncate">
                  <h5 className="text-xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-sm uppercase font-black text-white/30 italic mt-3 tracking-widest leading-none">Heshy Riesel • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_30px_#D4AF37]' : 'bg-white/5 text-white/20 border-white/10'}`}>
                   <Lamp size={32}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300 transform -rotate-1">
                  {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-1" fill="black" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
