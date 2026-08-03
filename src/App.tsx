import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vFIXED_TRANSITION_v2";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  
  // App Modes: gate -> stage
  const [appMode, setAppMode] = useState<'gate' | 'stage'>('gate');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [transitionChoices, setTransitionChoices] = useState<any[]>([]);
  const [isSeriesLinked, setIsSeriesLinked] = useState(false);
  
  const [countdown, setCountdown] = useState(10);
  const [warned, setWarned] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  useEffect(() => {
    async function loadTheater() {
      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`);
        const data = await res.json();
        const xml = new DOMParser().parseFromString(data.contents, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).map((item, i) => ({
          id: item.querySelector("guid")?.textContent || String(i),
          title: item.querySelector("title")?.textContent || "Jewish Audio Theater Story",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 200) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
        }));
        setEpisodes(items);
        setLoading(false);
      } catch (e) { setLoading(false); }
    }
    loadTheater();
  }, []);

  // Continuity Countdown (Part 1 -> Part 2)
  useEffect(() => {
    let timer: any;
    if (showNextOverlay && isSeriesLinked && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextOverlay && isSeriesLinked && countdown === 0) {
      handleContinuityAutoPlay();
    }
    return () => clearInterval(timer);
  }, [showNextOverlay, countdown, isSeriesLinked]);

  const handleContinuityAutoPlay = () => {
    if (transitionChoices[0]) {
      const next = transitionChoices[0];
      setShowNextOverlay(false);
      setCountdown(10);
      togglePlay(next);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowNextOverlay(false);
    setWarned(false);
    setCountdown(10);
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

    // SEAMLESS OVERLAY INTERCEPT: Triggered 12s before end to clear dead-air
    if (!showNextOverlay && (dur - cur <= 12) && (dur - cur > 1)) {
      triggerTransitionMenu();
    }

    // PARENT CHIME: 60s trigger
    if (!showNextOverlay && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const triggerTransitionMenu = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    // Find Core Title for Sequential Logic (Matches "Stefan" or "Mystery")
    const cleanTitle = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    
    let pathOptions: any[] = [];
    let linked = false;

    // Is there a "Part 2" at Index-1 (Higher upload index = Older ep in feed logic)
    if (idx > 0) {
      const newerPart = episodes[idx - 1];
      if (newerPart.title.toLowerCase().includes(cleanTitle)) {
        pathOptions.push(newerPart);
        linked = true;
      }
    }

    // Fallback: Just random selections
    const vault = episodes.filter(e => e.id !== activeEp.id && (!linked || e.id !== pathOptions[0].id)).sort(() => 0.5 - Math.random()).slice(0, linked ? 2 : 3);
    
    setTransitionChoices([...pathOptions, ...vault]);
    setIsSeriesLinked(linked);
    setShowNextOverlay(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-[#D4AF37]"><Loader2 className="animate-spin" size={40}/></div>;

  // --- VIEW BRANCH 1: THE MAGICAL PORTAL (Pure Entry Mode) ---
  if (appMode === 'gate') {
    return (
      <div className="fixed inset-0 z-[8000] bg-theater-midnight flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-1000 overflow-hidden portal-bg">
        <h1 className="portal-insignia">JAT</h1>
        <p className="font-serif text-3xl md:text-6xl font-black uppercase italic tracking-[0.2em] mb-12">Enter the Portal</p>
        <button 
          onClick={() => { setAppMode('stage'); window.scrollTo(0,0); }}
          className="bg-theater-gold text-black px-16 py-7 font-black uppercase tracking-[0.2em] text-sm md:text-lg hover:scale-110 transition shadow-[0_0_80px_#D4AF3766] active:scale-95"
        >Open the Theater</button>
        <div className="mt-16 opacity-30 text-[9px] font-black uppercase tracking-[0.6em]">TIMELESS STORIES • HESHY RIESEL</div>
      </div>
    );
  }

  // --- VIEW BRANCH 2: THE THEATER FLOOR ---
  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* CONTINUITY INTERCEPT OVERLAY (Opaque to prevent Screenshot Jumble) */}
      {showNextOverlay && (
        <div className="fixed inset-0 z-[5000] bg-[#02040A] flex items-center justify-center p-4 md:p-8 animate-in slide-in-from-bottom duration-700">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-6 md:p-14 shadow-[0_0_100px_#000] border-t-[10px] border-theater-gold relative">
              <div className="text-center mb-10">
                 <h2 className="text-3xl md:text-7xl font-serif italic font-black uppercase tracking-tighter">
                   {isSeriesLinked ? "The Story Continues" : "Pick Your Path Next"}
                 </h2>
                 <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40">Choose from the repertory vault</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-10">
                 {transitionChoices.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all duration-500 ${i === 0 && isSeriesLinked ? 'bg-white border-theater-gold ring-8 ring-theater-gold/5 scale-[1.03] shadow-xl' : 'bg-black/5 border-transparent opacity-60'}`}>
                      <div className="aspect-square overflow-hidden mb-5"><img src={ep.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" /></div>
                      <h4 className="font-serif text-lg md:text-2xl font-black italic uppercase leading-none tracking-tight line-clamp-2">{ep.title}</h4>
                      {i === 0 && isSeriesLinked && <p className="mt-4 text-[#D4AF37] font-black text-[10px] uppercase animate-pulse">Auto-start next chapter in {countdown}s</p>}
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowNextOverlay(false)} className="mt-14 uppercase font-black text-[10px] opacity-20 hover:opacity-100 transition tracking-[0.8em] block w-full text-center">Back to current production</button>
           </div>
        </div>
      )}

      {/* --- REPERTORY LAYERS --- */}
      <div id="stage-content">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-[#02040A]/60 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1 uppercase">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase h-full pt-1">
               <a href="#repertory" className="text-theater-gold hover:text-white transition tracking-widest pt-1">The Repertory</a>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 text-white font-black hover:text-theater-gold transition leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-30 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 items-center z-10">
              <div className="md:col-span-7 flex flex-col justify-center">
                <h2 className="text-4xl md:text-110px font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-10 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-base hover:scale-110 transition shadow-2xl flex items-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32}/> : <Play size={32} fill="black"/>} BEGIN PRODUCTION
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-[0_0_100px_#000] grayscale transition duration-1000" /></div>
            </div>
          </header>
        )}

        <section id="repertory" className="bg-[#F5F2E8] text-[#02040A] py-32 px-10 border-y-[20px] border-theater-midnight shadow-inner">
           <div className="max-w-7xl mx-auto">
              <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter mb-20 italic font-black border-b-[8px] border-black/5 pb-12 leading-none uppercase text-left">Repertory</h3>
              <div className="grid md:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40 text-left">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-[#000] border-4 border-white transition-all group-hover:border-theater-gold">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-700" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={80} className="text-theater-gold" fill="#000" /></div>
                      </div>
                      <h4 className="text-2xl md:text-5xl font-serif font-black italic uppercase leading-none tracking-tighter">{ep.title}</h4>
                   </div>
                ))}
              </div>
           </div>
        </section>
      </div>

      {/* --- PERSISTENT CONTROLLERBAR (Independent of Stages) --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold/40 px-6 md:px-12 py-10 md:py-16 z-[4000] shadow-[0_-30px_150px_rgba(0,0,0,0.95)] transition-all duration-700 ${duration - currentTime <= 60 && !showNextOverlay ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto text-left">
            {duration - currentTime <= 60 && !showNextOverlay && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce leading-none">Finish in {Math.floor(duration - currentTime)}s</div>}
            <div className="flex items-center gap-8 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            <div className="w-full flex justify-between gap-10 items-center">
              <div className="flex items-center gap-8 text-left truncate flex-1 cursor-pointer">
                <img src={activeEp.image} className="w-14 h-14 md:w-32 md:h-28 object-cover border border-white/20" alt="" />
                <div className="truncate">
                  <h5 className="text-2xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-2 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-xs uppercase font-black text-white/40 tracking-[0.2em] leading-none">HESHY RIESEL • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black' : 'bg-white/5 text-white/30'}`} title="Dim Screen">
                   <Lamp size={32}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all transform -rotate-1">
                   {isPlaying ? <Pause size={56} /> : <Play size={56} className="ml-2" fill="black" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
