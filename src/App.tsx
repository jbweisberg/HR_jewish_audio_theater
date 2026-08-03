import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vSTEFAN_SUCCESS";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  
  // App States: Strictly either Gate or Theater
  const [currentMode, setCurrentMode] = useState<'gate' | 'theater'>('gate');
  
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [transitionOptions, setTransitionOptions] = useState<any[]>([]);
  const [isSeriesLink, setIsSeriesLink] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [warned, setWarned] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  useEffect(() => {
    async function loadCatalog() {
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
        setLoading(false);
      } catch (e) { setLoading(false); }
    }
    loadCatalog();
  }, []);

  // Handle the Part 1 -> Part 2 Sequence
  useEffect(() => {
    let timer: any;
    if (showNextOverlay && isSeriesLink && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextOverlay && isSeriesLink && countdown === 0) {
      playSeriesPart();
    }
    return () => clearInterval(timer);
  }, [showNextOverlay, countdown, isSeriesLink]);

  const playSeriesPart = () => {
    const target = transitionOptions[0];
    if (target) { setShowNextOverlay(false); togglePlay(target); }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowNextOverlay(false);
    setWarned(false);
    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play();
      setCurrentMode('theater');
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

    // G-D MOVE INTERCEPT: Audio stays on, Transition overlay appears
    if (!showNextOverlay && (dur - cur <= 10) && (dur - cur > 1)) {
      matchSeriesPart();
    }

    // Parental 60s Warning
    if (!showNextOverlay && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const matchSeriesPart = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const getAnchorName = (str: string) => str.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    const anchor = getAnchorName(activeEp.title);
    
    let pathList: any[] = [];
    let linked = false;

    // Check Index-1 (Higher upload position = newer story part)
    if (idx > 0) {
      const olderEntry = episodes[idx - 1]; 
      if (olderEntry.title.toLowerCase().includes(anchor)) {
        pathList.push(olderEntry);
        linked = true;
      }
    }

    const recs = episodes.filter(e => e.id !== activeEp.id && (!linked || e.id !== pathList[0].id)).sort(() => 0.5 - Math.random()).slice(0, linked ? 2 : 3);
    
    setTransitionOptions([...pathList, ...recs]);
    setIsSeriesLink(linked);
    setCountdown(10);
    setShowNextOverlay(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={40}/></div>;

  // --- BRANCH 1: THE PORTAL GATE ---
  if (currentMode === 'gate') {
    return (
      <div className="fixed inset-0 z-[8000] bg-theater-midnight flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-1000 overflow-hidden">
        <h1 className="jat-insignia-stage">JAT</h1>
        <p className="font-serif text-3xl md:text-6xl font-black uppercase italic tracking-[0.2em] mb-12">Enter the Portal</p>
        <button 
          onClick={() => { setCurrentMode('theater'); window.scrollTo(0,0); }}
          className="bg-theater-gold text-black px-14 py-6 md:px-24 md:py-8 font-black uppercase tracking-[0.2em] text-sm md:text-lg hover:scale-110 transition shadow-[0_0_100px_#D4AF3744] active:scale-95"
        >Open the Theater</button>
        <div className="mt-20 opacity-20 text-[9px] font-black uppercase tracking-[0.6em]">TIMELESS STORIES • HESHY RIESEL</div>
      </div>
    );
  }

  // --- BRANCH 2: THE THEATER (REPERTORY) ---
  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* CONTINUITY INTERCEPT - FULL SCREEN OVERLAY */}
      {showNextOverlay && (
        <div className="fixed inset-0 z-[5000] bg-black flex items-center justify-center p-4 md:p-10 animate-in slide-in-from-bottom duration-700">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-8 md:p-14 shadow-2xl border-t-[10px] border-theater-gold relative">
              <div className="text-center mb-12">
                 <h2 className="text-4xl md:text-8xl font-serif italic font-black uppercase tracking-tighter">
                   {isSeriesLink ? "The Story Continues" : "The Journey Concludes"}
                 </h2>
                 <p className="text-[10px] uppercase font-black tracking-[0.4em] mt-4 opacity-40">Which path from the Repertory is next?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                 {transitionOptions.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all duration-500 ${i === 0 && isSeriesLink ? 'bg-white border-theater-gold ring-8 ring-theater-gold/5 scale-105 shadow-2xl' : 'bg-black/5 border-transparent opacity-80 hover:opacity-100 grayscale hover:grayscale-0'}`}>
                      <div className="aspect-video md:aspect-square overflow-hidden mb-5 border-4 border-white"><img src={ep.image} className="w-full h-full object-cover group-hover:scale-105 transition" /></div>
                      <h4 className="font-serif text-xl font-black italic uppercase leading-none tracking-tight line-clamp-2">{ep.title}</h4>
                      {i === 0 && isSeriesLink && <p className="mt-4 text-[#D4AF37] font-black text-[11px] uppercase tracking-tighter animate-pulse">Continuing Soon in {countdown}s</p>}
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowNextOverlay(false)} className="mt-14 uppercase font-black text-[11px] opacity-20 hover:opacity-100 transition tracking-[1em] block w-full text-center">Stay on current stage</button>
           </div>
        </div>
      )}

      {/* --- STAGE LAYOUT --- */}
      <div id="stage-content">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-[#02040A]/60 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1 uppercase leading-none">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase h-full pt-1">
               <a href="#repertory" className="text-theater-gold hover:text-white transition tracking-widest pt-1 uppercase">Repertory</a>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 text-white font-black hover:text-theater-gold leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center px-8 text-left z-10 pt-24 overflow-hidden mb-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-40"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7 flex flex-col justify-center">
                <h2 className="text-4xl md:text-110px font-serif leading-[0.85] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-12 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-14 py-8 font-black uppercase text-sm md:text-base hover:scale-105 transition shadow-[0_0_80px_rgba(212,175,55,0.4)] flex items-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32}/> : <Play size={32} fill="black"/>} START STORY
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-[0_0_100px_#000] grayscale transition duration-1000" /></div>
            </div>
          </header>
        )}

        <section id="repertory" className="bg-[#F5F2E8] text-[#02040A] py-48 px-10 border-y-[20px] border-theater-midnight shadow-inner">
           <div className="max-w-7xl mx-auto text-left">
              <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter mb-24 italic font-black border-b-[6px] border-black/5 pb-12 leading-none uppercase tracking-tighter">The Repertory</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-black border-4 border-white transition-all group-hover:border-theater-gold">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-700" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={80} className="text-theater-gold" fill="#000" /></div>
                      </div>
                      <h4 className="text-2xl md:text-5xl font-serif font-black italic uppercase leading-[0.95] text-center px-4 tracking-tighter">{ep.title}</h4>
                   </div>
                ))}
              </div>
           </div>
        </section>
      </div>

      {/* --- PERSISTENT BAR --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold/40 px-6 md:px-12 py-10 md:py-16 z-[3000] shadow-[0_-30px_120px_#000] transition-all duration-700 ${duration - currentTime <= 60 && !showNextOverlay ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto text-left">
            {duration - currentTime <= 60 && !showNextOverlay && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce leading-none italic font-black">Finish in {Math.floor(duration - currentTime)} seconds</div>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono text-left leading-none">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[2px] bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono leading-none">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex justify-between gap-10 items-center">
              <div className="flex items-center gap-8 text-left truncate flex-1 pr-6 cursor-pointer" onClick={() => { setCurrentMode('theater'); window.scrollTo(0,0); }}>
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border border-white/20" alt="" />
                <div className="truncate">
                  <h5 className="text-2xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-xs uppercase font-black text-white/40 tracking-[0.2em] italic mt-3 leading-none">HESHY RIESEL • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_50px_#D4AF3744]' : 'bg-white/5 text-white/20 hover:border-theater-gold'}`}>
                   <Lamp size={32}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all transform -rotate-1">
                   {isPlaying ? <Pause size={56} /> : <Play size={56} className="ml-1" fill="black" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
