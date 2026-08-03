import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, Library, 
  CheckCircle2, Star, Menu, Globe, Music, Share2, AlertCircle, Headphones, ArrowRight, Lamp
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_davinci_v1";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [showNextUp, setShowNextUp] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [warned, setWarned] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false); // BEDTIME MODE
  
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
          title: item.querySelector("title")?.textContent || "Jewish Story",
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

  useEffect(() => {
    let timer: any;
    if (showNextUp && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextUp && countdown === 0) {
      playNext();
    }
    return () => clearInterval(timer);
  }, [showNextUp, countdown]);

  const playNext = () => {
    if (nextEp) {
      const ep = nextEp;
      setNextEp(null);
      setShowNextUp(false);
      togglePlay(ep);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowNextUp(false);
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

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur) return;
    setCurrentTime(cur);

    // SILENCE INTERCEPT: 8 SECONDS BEFORE TRUE END
    if (!showNextUp && dur > 20 && (dur - cur < 8)) {
      const idx = episodes.findIndex(e => e.id === activeEp.id);
      if (idx > 0) {
        const potential = episodes[idx - 1]; // Newer part
        const root = activeEp.title.split(/part|chapter/i)[0].trim();
        if (potential.title.includes(root)) {
          setNextEp(potential);
          setShowNextUp(true);
          setCountdown(10);
        } else { stopAtEnd(); }
      } else { stopAtEnd(); }
    }

    // PARENTAL WARNING
    if (dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const stopAtEnd = () => {
    const randoms = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setRecs(randoms);
    setNextEp(null);
    setShowNextUp(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center"><div className="w-12 h-12 border-4 border-theater-gold border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className={`min-h-screen bg-theater-midnight text-[#F5F2E8] font-sans overflow-x-hidden selection:bg-theater-gold ${isDimmed ? 'dimmed-theater' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* SEAMLESS CURTAIN OVERLAY */}
      {showNextUp && (
        <div className="fixed inset-0 z-[500] bg-theater-midnight/98 flex items-center justify-center p-6 animate-in zoom-in duration-500">
           <div className="max-w-4xl w-full p-8 md:p-14 bg-theater-parchment text-theater-midnight shadow-2xl border-t-[10px] border-theater-gold">
              {nextEp ? (
                <div className="text-center">
                   <p className="text-[10px] uppercase font-black tracking-[0.5em] mb-4 text-theater-burgundy leading-none">A New Story Awaits</p>
                   <h2 className="text-4xl md:text-6xl font-serif italic font-black leading-tight mb-8">Continue the Story</h2>
                   <div className="flex flex-col md:flex-row items-center gap-10 justify-center">
                      <img src={nextEp.image} className="w-48 h-48 object-cover border-4 border-black/5" alt="" />
                      <div className="text-left flex flex-col gap-6">
                        <p className="text-2xl font-serif font-black">{nextEp.title}</p>
                        <button onClick={playNext} className="bg-theater-midnight text-theater-gold px-12 py-5 font-black uppercase text-xs tracking-widest hover:scale-105 transition shadow-xl">Start Next Part ({countdown}s)</button>
                      </div>
                   </div>
                   <div className="w-64 h-1 bg-black/5 mx-auto mt-12 rounded-full overflow-hidden">
                      <div className="timer-bar timer-drain"></div>
                   </div>
                </div>
              ) : (
                <div className="text-center">
                  <CheckCircle2 size={48} className="mx-auto mb-6 text-theater-burgundy" />
                  <h2 className="text-4xl md:text-6xl font-serif italic font-black leading-tight mb-6">Choose a New Story</h2>
                  <p className="text-xl italic opacity-50 mb-10">You've reached the end. Which adventure is next?</p>
                  <div className="grid md:grid-cols-3 gap-8">
                     {recs.map(r => (
                       <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group text-left">
                          <img src={r.image} className="w-full aspect-square object-cover mb-4 group-hover:scale-105 transition border-2 border-transparent group-hover:border-theater-gold" />
                          <p className="font-serif text-sm font-black italic">{r.title}</p>
                       </div>
                     ))}
                  </div>
                </div>
              )}
              <button onClick={() => setShowNextUp(false)} className="mt-14 uppercase font-black text-[10px] opacity-20 hover:opacity-100 transition tracking-[0.5em]">Close Curtain</button>
           </div>
        </div>
      )}

      {/* PERSISTENT LEVELED NAV */}
      <nav className="fixed top-0 w-full z-[150] bg-theater-midnight/90 backdrop-blur-xl border-b border-white/5 h-20 md:h-24 px-6 md:px-12 flex items-center">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
          <div className="flex flex-col text-left justify-center h-full pt-1">
             <h1 className="font-serif text-2xl md:text-3xl text-theater-gold leading-none italic font-black">Jewish Audio Theater</h1>
             <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.3em] text-white opacity-40 mt-1">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[11px] font-black uppercase text-theater-gold pt-2 tracking-widest">
            <a href="#vault" className="hover:text-white transition">The Vault</a>
            <button onClick={() => setIsDimmed(!isDimmed)} className="flex items-center gap-2 text-white bg-white/5 px-4 py-2 hover:bg-theater-gold hover:text-black transition">
               <Lamp size={14}/> {isDimmed ? "Lights On" : "Bedtime Dimmer"}
            </button>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="font-black border-l border-white/10 pl-10 ml-4 hover:text-white transition">Contact Heshy</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold"><Menu size={32}/></button>
        </div>
      </nav>

      {/* SPOTLIGHT HERO - FIXED VIEWPORT FOR CHROME */}
      {episodes.length > 0 && (
        <header className="relative min-h-[95dvh] flex items-center pt-24 px-8 text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_75%)] opacity-30"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 items-center z-10">
            <div className="md:col-span-7 flex flex-col justify-center">
              <h2 className="text-5xl md:text-[105px] font-serif leading-[0.82] mb-10 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <div className="h-1 w-20 bg-theater-gold mb-8 opacity-40"></div>
              <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-base hover:bg-theater-parchment transition shadow-2xl flex items-center gap-6 shadow-[0_0_60px_rgba(212,175,55,0.3)]">
                {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} fill="black" />}
                EXPERIENCE THEATER
              </button>
            </div>
            <div className="hidden md:block md:col-span-5 relative">
              <div className="absolute -inset-4 bg-theater-gold/10 blur-3xl transition duration-1000"></div>
              <img src={episodes[0].image} className="relative w-full aspect-square object-cover border-[10px] border-theater-gold/20 shadow-2xl grayscale" alt="Heshy Riesel Authority" />
            </div>
          </div>
        </header>
      )}

      {/* THE VAULT */}
      <section id="vault" className="bg-theater-parchment text-theater-midnight py-32 md:py-48 px-8 border-y-[20px] border-theater-midnight">
        <div className="max-w-7xl mx-auto text-left">
          <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter border-b-[8px] border-theater-midnight pb-6 mb-24 italic leading-none font-black text-theater-midnight/90">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-40">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl border-[1px] border-black/5">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                    <Play size={48} className="text-theater-gold" fill="currentColor" />
                  </div>
                </div>
                <h4 className="text-3xl md:text-4xl font-serif uppercase leading-tight italic font-black text-theater-midnight tracking-tighter mb-4 leading-none">{ep.title}</h4>
                <div className="flex items-center gap-2 font-black text-[10px] uppercase opacity-30 text-theater-burgundy">
                  <span>Enter Selection</span>
                  <ArrowRight size={10} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-48 bg-theater-midnight text-center">
        <Headphones className="mx-auto text-theater-gold mb-12 opacity-30" size={64} />
        <h2 className="text-5xl md:text-8xl font-serif uppercase tracking-tighter mb-10 text-theater-gold italic">Contact the Maggid</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-2xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic block leading-none px-6">Maggid@jewishaudiotheater.com</a>
        <p className="mt-40 text-[9px] uppercase tracking-[0.5em] opacity-20 font-black italic tracking-widest leading-none leading-[3]">© 2024 Heshy Riesel • AUTHORITY PRODUCTION ARCHIVE</p>
      </footer>

      {/* MASTER PLAYER WITH 1-MINUTE ALARM BACKGROUND */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold px-6 md:px-12 py-10 md:py-16 z-[300] shadow-[0_-40px_100px_rgba(0,0,0,1)] transition-all duration-1000 ${currentTime > 0 && (duration - currentTime <= 60) ? 'bg-[#7B0000]' : 'bg-[#090D17]'}`}>
          <div className="max-w-7xl mx-auto">
            {duration - currentTime <= 60 && <p className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">Parent Alert: 1 Minute Left</p>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[2px] bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-6 text-left truncate flex-1 pr-12">
                <img src={activeEp.image} className="w-16 h-16 md:w-28 md:h-24 object-cover border border-white/20 shadow-lg" alt="" />
                <div className="truncate">
                  <h5 className="text-2xl md:text-4xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[9px] uppercase tracking-[0.4em] font-black text-white/40 mt-2 italic leading-none uppercase tracking-widest">Heshy Riesel • Timeless Story</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300">
                  {isPlaying ? <Pause size={48} /> : <Play size={48} fill="black" className="ml-1" />}
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
