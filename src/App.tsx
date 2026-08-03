import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, RotateCcw, Volume2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_curtain_v1";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCurtains, setShowCurtains] = useState(false);
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
          title: item.querySelector("title")?.textContent || "Story",
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

  // CONTINUITY LOGIC
  useEffect(() => {
    let timer: any;
    if (showCurtains && nextEp && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showCurtains && countdown === 0 && nextEp) {
      beginNextProduction();
    }
    return () => clearInterval(timer);
  }, [showCurtains, countdown, nextEp]);

  const beginNextProduction = () => {
    if (nextEp) {
      const story = nextEp;
      setNextEp(null);
      setShowCurtains(false);
      togglePlay(story);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowCurtains(false);
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

    // CURTAIN DROP INTERCEPT: 8 SECONDS REMAINING
    if (!showCurtains && (dur - cur < 8)) {
      const idx = episodes.findIndex(e => e.id === activeEp.id);
      if (idx > 0) {
        const newerPart = episodes[idx - 1];
        const currentTitle = activeEp.title.split(/part|chapter/i)[0].trim();
        if (newerPart.title.includes(currentTitle)) {
          setNextEp(newerPart);
        } else { pickRandoms(); }
      } else { pickRandoms(); }
      setShowCurtains(true);
      setCountdown(10);
    }

    // 1-MINUTE WARNING (Does not trigger if Curtains are closing)
    if (!showCurtains && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const pickRandoms = () => {
    const s = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random());
    setRecs(s.slice(0, 3));
    setNextEp(null);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center"><div className="w-12 h-12 border-2 border-theater-gold border-t-transparent rounded-full animate-spin"></div></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60) && !showCurtains;

  return (
    <div className="min-h-screen bg-theater-midnight text-[#F5F2E8] font-sans overflow-x-hidden selection:bg-theater-gold">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- THE GRAND VELVET CURTAIN (Overlays everything else) --- */}
      {showCurtains && (
        <div className="fixed inset-0 z-[600] flex overflow-hidden">
          {/* Left Panel */}
          <div className="w-1/2 h-full curtain-panel animate-in slide-in-from-left duration-1000 border-r border-theater-gold/20 flex flex-col justify-center items-end pr-8">
            <h1 className="font-ornate text-[140px] insignia-gold leading-none transform -rotate-12 translate-y-20">JAT</h1>
          </div>
          {/* Right Panel */}
          <div className="w-1/2 h-full curtain-panel animate-in slide-in-from-right duration-1000 border-l border-theater-gold/20 flex flex-col justify-center items-start pl-8">
             <h1 className="font-ornate text-[140px] insignia-gold leading-none transform rotate-12 -translate-y-20 scale-x-[-1] opacity-20">JAT</h1>
          </div>

          {/* CURTAIN MENU (Appears once panels meet) */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-[1500ms]">
            <CheckCircle2 size={40} className="text-theater-gold mb-8 opacity-40" />
            <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase mb-4 tracking-tighter">The Production Ends</h2>
            
            <div className="max-w-2xl w-full">
              {nextEp ? (
                <div className="bg-theater-midnight/40 backdrop-blur-md p-10 border border-theater-gold/30">
                   <p className="text-xs uppercase font-black tracking-[0.4em] mb-4 opacity-50">Continuity Flow</p>
                   <h3 className="text-2xl md:text-4xl font-serif italic mb-8 px-4 leading-tight">{nextEp.title}</h3>
                   <div className="flex flex-col items-center gap-6">
                     <button onClick={beginNextProduction} className="bg-theater-gold text-theater-midnight px-10 py-4 font-black uppercase text-xs tracking-widest hover:bg-theater-parchment transition shadow-2xl">Start Next Part ({countdown}s)</button>
                     <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="timer-fill"></div>
                     </div>
                   </div>
                </div>
              ) : (
                <div>
                   <p className="text-xl font-light italic mb-10 opacity-70">Which adventure will you join next?</p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {recs.map(r => (
                        <div key={r.id} onClick={() => togglePlay(r)} className="group cursor-pointer">
                           <img src={r.image} className="w-full aspect-square object-cover mb-4 border border-white/10 group-hover:scale-105 transition" />
                           <p className="text-sm font-black italic uppercase leading-none opacity-80">{r.title}</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}
            </div>
            <button onClick={() => setShowCurtains(false)} className="mt-12 text-[10px] uppercase font-black tracking-[0.6em] opacity-40 hover:opacity-100 transition">Return to Library</button>
          </div>
        </div>
      )}

      {/* --- THE STAGE (Wrapped in Dimmer logic) --- */}
      <div className={isDimmed ? 'stage-dimmed' : 'transition-all duration-1000'}>
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 px-6 md:px-12 flex items-center border-b border-white/5 bg-theater-midnight/60">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left pt-1">
               <h1 className="font-serif text-2xl md:text-3xl text-theater-gold leading-none italic font-black uppercase tracking-tighter">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] text-white/40 mt-1">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] pt-2">
              <a href="#vault">Vault</a>
              <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 font-black hover:text-white transition">Heshy Riesel</a>
            </div>
          </div>
        </nav>

        {/* Hero Stage */}
        <header className="relative min-h-screen flex items-center pt-24 px-8 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_75%)] opacity-40"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center text-left">
            <div className="md:col-span-7">
              <h2 className="text-5xl md:text-8xl lg:text-[110px] font-serif leading-[0.82] mb-10 uppercase tracking-tighter italic font-black text-white">{episodes[0]?.title}</h2>
              <p className="text-xl md:text-2xl font-light opacity-90 mb-14 italic border-l-2 border-[#D4AF37]/50 pl-6 leading-relaxed">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-xs md:text-sm hover:bg-[#F5F2E8] transition shadow-2xl flex items-center gap-4">
                {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={24} /> : <Play size={24} fill="black" />}
                EXPERIENCE THEATER
              </button>
            </div>
            <div className="hidden md:block md:col-span-5 relative"><img src={episodes[0]?.image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-2xl grayscale" /></div>
          </div>
        </header>

        {/* Archive Stage */}
        <section id="vault" className="bg-[#F5F2E8] text-theater-midnight py-32 px-12 border-y-[15px] border-theater-midnight">
          <div className="max-w-7xl mx-auto">
             <h3 className="text-5xl md:text-[150px] font-serif uppercase tracking-tighter mb-20 italic font-black text-center border-b-2 border-black/5 pb-8">The Vault</h3>
             <div className="grid md:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-32">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="cursor-pointer group flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-8 shadow-2xl"><img src={ep.image} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition duration-700 opacity-85 group-hover:opacity-100" /><div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition"><Play size={64} className="text-theater-gold" /></div></div>
                      <h4 className="text-3xl font-serif font-black italic tracking-tighter uppercase leading-none leading-[0.9]">{ep.title}</h4>
                      <p className="mt-4 text-[9px] uppercase font-black opacity-30 text-theater-burgundy">Heshy Riesel Selection</p>
                   </div>
                ))}
             </div>
          </div>
        </section>
      </div>

      {/* --- THE MASTER PLAYER & LANTERNS (Visible always, ignored by dimmer) --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold/30 px-6 md:px-12 py-10 md:py-16 z-[500] shadow-[0_-30px_100px_rgba(0,0,0,0.8)] transition-all duration-700 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.4em] mb-4 animate-bounce flex items-center justify-center gap-2"><AlertCircle size={18}/> Parental Notice: 1 Minute Remaining</div>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 font-mono text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between gap-10">
              <div className="flex items-center gap-6 text-left truncate flex-1">
                <img src={activeEp.image} className="w-16 h-16 md:w-28 md:h-28 object-cover border-2 border-white/20 shadow-2xl" alt="" />
                <div className="truncate">
                  <h5 className="text-lg md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black tracking-tighter">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase font-black text-white/30 italic mt-3 tracking-widest">Heshy Riesel • Timeless Stories</p>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 rounded-full transition-all border ${isDimmed ? 'bg-theater-gold text-black border-theater-gold' : 'bg-transparent text-white/20 border-white/10'}`}>
                  <Lamp size={32}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300">
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
