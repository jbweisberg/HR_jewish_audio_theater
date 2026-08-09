import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock, Star, Mic2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_v1";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [currentMode, setCurrentMode] = useState<'gate' | 'theater'>('gate');
  
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [transitionList, setTransitionList] = useState<any[]>([]);
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
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  useEffect(() => {
    async function loadCatalog() {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setEpisodes(JSON.parse(cached)); setLoading(false); }

      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(RSS_URL)}`
      ];

      try {
        const fetchPromises = proxies.map(async (url) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error("Bad response");
          const data = await res.json();
          const xmlRaw = data.contents || data;
          if (typeof xmlRaw !== 'string' || !xmlRaw.includes('<item>')) throw new Error("Bad data");
          return xmlRaw;
        });

        const fastXmlRaw = await Promise.any(fetchPromises);
        const xml = new DOMParser().parseFromString(fastXmlRaw, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).map((item, i) => ({
          id: item.querySelector("guid")?.textContent || `jat-${i}`,
          title: item.querySelector("title")?.textContent || "Production",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
        }));

        setEpisodes(items);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  useEffect(() => {
    if (!showNextOverlay || !isSeriesLink) return;
    if (countdown > 0) {
      const timerId = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      handleAutoTransition();
    }
  }, [showNextOverlay, countdown, isSeriesLink]);

  const handleAutoTransition = () => {
    if (transitionList[0]) {
      const next = transitionList[0];
      setShowNextOverlay(false);
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
      audioRef.current.play().catch(() => setIsPlaying(false));
      setCurrentMode('theater');
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(() => {});
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur || isNaN(dur)) return;
    setCurrentTime(cur);

    if (!showNextOverlay && (dur - cur <= 15) && (dur - cur > 1)) {
      generateSequenceMap();
    }

    if (!showNextOverlay && dur > 65 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const generateSequenceMap = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    
    const cleanTitle = (title: string) => {
      return title.toLowerCase().replace(/\b(part|pt|chapter|episode)\s*\d+\b/gi, '').replace(/[^\w\s]/gi, '').trim();
    };
    
    const rootName = cleanTitle(activeEp.title);
    let pathOptions: any[] = [];
    let linkSuccess = false;

    if (idx > 0) {
      const newerPart = episodes[idx - 1];
      const newerRoot = cleanTitle(newerPart.title);
      
      if (newerRoot === rootName || (rootName.length > 3 && newerRoot.includes(rootName))) {
        pathOptions.push(newerPart);
        linkSuccess = true;
      }
    }

    const recs = episodes.filter(e => e.id !== activeEp.id && (!linkSuccess || e.id !== pathOptions[0].id))
                         .sort(() => 0.5 - Math.random()).slice(0, linkSuccess ? 2 : 3);
    
    setTransitionList([...pathOptions, ...recs]);
    setIsSeriesLink(linkSuccess);
    setShowNextOverlay(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-[#D4AF37]"><Loader2 className="animate-spin" size={48}/></div>;

  const isFinalMinute = duration > 65 && (duration - currentTime <= 60) && (duration - currentTime > 0) && !showNextOverlay;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-[#D4AF37] overflow-x-hidden ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setIsPlaying(false)} preload="auto" />

      {/* MOBILE MENU */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[9999] bg-[#02040A]/98 backdrop-blur-xl flex flex-col items-center justify-center gap-12 animate-in fade-in">
           <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-8 text-[#D4AF37] p-2"><X size={40}/></button>
           <a href="#repertory" onClick={() => setIsMenuOpen(false)} className="text-4xl font-serif italic text-[#D4AF37]">The Repertory</a>
           <a href="#casting" onClick={() => setIsMenuOpen(false)} className="text-4xl font-serif italic text-[#D4AF37]">Audition</a>
           <a href="mailto:Maggid@jewishaudiotheater.com" onClick={() => setIsMenuOpen(false)} className="text-4xl font-serif italic text-[#D4AF37]">Contact Heshy</a>
        </div>
      )}

      {/* PORTAL ENTRANCE */}
      {currentMode === 'gate' && (
        <div className="fixed inset-0 z-[8000] bg-[#02040A] flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-1000 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#2a0202_0%,_#02040A_100%)] opacity-80 pointer-events-none"></div>
          <h1 className="jat-portal-insignia select-none relative z-10">JAT</h1>
          <p className="font-serif text-3xl md:text-5xl font-black uppercase italic tracking-[0.2em] mb-12 relative z-10 text-[#F5F2E8]">Enter the Portal</p>
          <button 
            onClick={() => { setCurrentMode('theater'); window.scrollTo(0,0); }}
            className="relative z-10 bg-[#D4AF37] text-black px-16 py-8 font-black uppercase tracking-[0.2em] text-sm md:text-lg hover:bg-white transition shadow-[0_0_100px_#D4AF3744] active:scale-95"
          >Open the Theater</button>
          <div className="mt-20 opacity-30 text-[9px] font-black uppercase tracking-[0.6em] relative z-10">TIMELESS STORIES • HESHY RIESEL</div>
        </div>
      )}

      {/* CONTINUITY OVERLAY */}
      {showNextOverlay && (
        <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in slide-in-from-bottom duration-700 overflow-y-auto">
           <div className="max-w-5xl w-full bg-[#F5F2E8] text-[#02040A] p-6 md:p-14 shadow-2xl border-t-[10px] border-[#D4AF37] relative my-auto">
              <div className="text-center mb-10">
                 <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase tracking-tighter">
                   {isSeriesLink ? "The Story Continues" : "Pick Your Path Next"}
                 </h2>
                 <p className="text-[10px] uppercase font-black tracking-[0.5em] mt-4 opacity-40">
                   {isSeriesLink ? "The next chapter is loading" : "Discover a new adventure from the repertory"}
                 </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
                 {transitionList.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all duration-500 ${i === 0 && isSeriesLink ? 'bg-white border-[#D4AF37] ring-8 ring-[#D4AF37]/10 scale-100 md:scale-105 shadow-2xl' : 'bg-black/5 border-transparent opacity-80 hover:opacity-100'}`}>
                      <div className="relative aspect-square overflow-hidden mb-5 border-4 border-white shadow-sm">
                         <img src={ep.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt=""/>
                         {i === 0 && isSeriesLink && <div className="absolute top-0 right-0 bg-[#4A0404] text-white px-3 py-1 font-black text-[9px] uppercase shadow-xl animate-pulse">UP NEXT</div>}
                      </div>
                      <h4 className="font-serif text-lg md:text-xl font-black italic uppercase leading-none tracking-tight line-clamp-2">{ep.title}</h4>
                      {i === 0 && isSeriesLink && <p className="mt-4 text-[#D4AF37] font-black text-[11px] uppercase animate-pulse tracking-widest">Auto-starting in {countdown}s</p>}
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowNextOverlay(false)} className="mt-14 uppercase font-black text-[11px] opacity-20 hover:opacity-100 transition tracking-[1em] block w-full text-center py-4">Audio is playing in background... dismiss choice</button>
           </div>
        </div>
      )}

      {/* STAGE ROOT */}
      <div id="stage-root">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-[#02040A]/60 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-[#D4AF37] leading-none italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1 uppercase">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase h-full pt-1">
               <a href="#repertory" className="text-[#D4AF37] hover:text-white transition tracking-widest uppercase">The Repertory</a>
               <button className="flex items-center gap-2 text-white/20 border border-white/10 px-6 py-2 tracking-widest opacity-20 cursor-not-allowed"> <Lock size={12}/> Entry Locked </button>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 text-white font-black hover:text-[#D4AF37] uppercase tracking-[0.1em] transition">Heshy Riesel • THE MAGGID</a>
            </div>
            <button onClick={() => setIsMenuOpen(true)} className="md:hidden text-[#D4AF37] pt-1 p-2"><Menu size={32}/></button>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-6 md:px-8 text-left z-10 overflow-hidden mb-20 md:mb-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-40 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7 flex flex-col justify-center">
                <h2 className="text-5xl sm:text-7xl lg:text-[110px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-[#D4AF37] mb-10 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-[#D4AF37]/50 pl-8 leading-relaxed text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-full sm:w-fit bg-[#D4AF37] text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-base hover:scale-105 transition shadow-2xl flex items-center justify-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32}/> : <Play size={32} fill="black"/>} BEGIN PRODUCTION
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-[#D4AF37]/10 shadow-[0_0_100px_#000] grayscale transition duration-1000" alt="" /></div>
            </div>
          </header>
        )}

        <section id="repertory" className="bg-[#F5F2E8] text-[#02040A] py-32 px-10 border-y-[20px] border-[#02040A] shadow-inner relative z-10">
           <div className="max-w-7xl mx-auto text-left">
              <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter mb-20 italic font-black border-b-[8px] border-black/5 pb-12 leading-none text-center">REPERTORY</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40 text-left">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="cursor-pointer group flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-[#000] border-4 border-white transition-all group-hover:border-[#D4AF37]">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={80} className="text-[#D4AF37]" fill="#000" /></div>
                      </div>
                      <h4 className="text-2xl md:text-4xl font-serif font-black italic uppercase leading-none tracking-tighter">{ep.title}</h4>
                      <p className="mt-4 text-[11px] font-black uppercase text-[#4A0E0E] opacity-40 italic tracking-widest leading-none">THE MAGGID PRODUCTION</p>
                   </div>
                ))}
              </div>
           </div>
        </section>

        <section id="casting" className="py-24 md:py-40 px-6 md:px-12 bg-[#02040A] border-y border-[#D4AF37]/10 relative overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10 grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="h-16 w-16 bg-[#D4AF37] text-black flex items-center justify-center mb-10 shadow-xl rounded-full">
                <Mic2 size={32} />
              </div>
              <h2 className="text-5xl md:text-8xl font-serif uppercase tracking-tighter leading-none mb-8 italic text-[#D4AF37]">Your Voice <br/>On the Stage</h2>
              <p className="text-xl md:text-2xl font-light opacity-70 leading-relaxed italic mb-10 text-[#F5F2E8]">
                We are seeking children and parents to play roles in our upcoming theatrical productions. 
              </p>
              <div className="flex items-center gap-6 text-[#D4AF37] font-black uppercase tracking-widest text-xs">
                <span className="flex items-center gap-2 text-white bg-[#4A0E0E] px-4 py-2"><Star size={16} fill="#D4AF37"/> Open Auditions</span>
              </div>
            </div>
            <div className="bg-[#F5F2E8] p-10 md:p-14 text-[#02040A] shadow-[0_0_80px_rgba(212,175,55,0.15)] border-t-8 border-[#D4AF37]">
              <h4 className="font-serif text-3xl md:text-4xl uppercase tracking-tighter mb-8 border-b-2 border-[#02040A]/10 pb-6 italic">Submission Portal</h4>
              <form action="https://formspree.io/f/YOUR_ID" method="POST" className="space-y-6">
                <input type="text" name="name" placeholder="Full Name" className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-xs font-black tracking-widest" required />
                <input type="text" name="age" placeholder="Age of Participant" className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-xs font-black tracking-widest" required />
                <input type="email" name="email" placeholder="Email Address" className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-xs font-black tracking-widest" required />
                <button type="submit" className="w-full bg-[#02040A] text-[#D4AF37] py-6 font-black uppercase tracking-[0.3em] text-xs hover:bg-[#4A0E0E] transition shadow-xl mt-4">Submit Audition</button>
              </form>
            </div>
          </div>
        </section>

        <footer id="contact" className="py-32 md:py-48 px-6 bg-[#02040A] text-center">
          <Headphones className="mx-auto text-[#D4AF37] mb-12 opacity-30" size={48} />
          <h2 className="text-4xl md:text-8xl font-serif uppercase tracking-tighter mb-10 text-[#D4AF37] italic font-black">Contact the Maggid</h2>
          <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic break-words leading-none">Maggid@jewishaudiotheater.com</a>
          <div className="mt-20 flex justify-center gap-12 text-[#D4AF37]/20">
            <Globe size={28} /> <Music size={28} /> <Share2 size={28} />
          </div>
          <p className="mt-24 text-[9px] uppercase tracking-[0.6em] opacity-30 font-black italic tracking-widest leading-none">© 2024 Heshy Riesel • AUTHORITY PRODUCTION ARCHIVE</p>
        </footer>
      </div>

      {/* MASTER PLAYER BAR */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-[#D4AF37]/50 px-4 md:px-12 py-8 md:py-16 z-[3000] shadow-[0_-30px_150px_#000] transition-colors duration-1000 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#090D17]'}`}>
          <div className="max-w-7xl mx-auto text-left">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[10px] md:text-[12px] tracking-[0.5em] mb-4 animate-bounce">1 Minute Alert • Finish in {Math.floor(duration - currentTime)}s</div>}
            
            <div className="flex items-center gap-6 md:gap-10 mb-6 md:mb-8">
              <span className="text-[10px] md:text-[12px] font-black text-[#D4AF37] w-12 md:w-14 font-mono text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[3px] bg-white/10 appearance-none accent-[#D4AF37] cursor-pointer" />
              <span className="text-[10px] md:text-[12px] font-black text-white/50 w-12 md:w-14 font-mono text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex justify-between gap-6 md:gap-10 items-center">
              <div className="flex items-center gap-4 md:gap-8 text-left truncate flex-1 cursor-pointer" onClick={() => { setCurrentMode('theater'); window.scrollTo(0,0); }}>
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border border-white/20 shadow-xl" alt="" />
                <div className="truncate pr-4">
                  <h5 className="text-lg md:text-5xl font-serif text-[#D4AF37] uppercase italic truncate leading-none mb-1 md:mb-2 font-black tracking-tighter">{activeEp.title}</h5>
                  <p className="text-[9px] md:text-xs uppercase font-black text-white/40 tracking-[0.2em] italic mt-2 md:mt-3 leading-none">HESHY RIESEL • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-6 md:gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`hidden sm:block p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-[#D4AF37] text-black shadow-[0_0_50px_#D4AF3744]' : 'bg-white/5 text-white/20 border-white/5'}`}>
                   <Lamp size={24} className="md:w-[32px] md:h-[32px]" />
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-[#D4AF37] rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all transform -rotate-1">
                   {isPlaying ? <Pause size={40} className="md:w-[56px] md:h-[56px]" /> : <Play size={40} className="ml-1 md:w-[56px] md:h-[56px]" fill="black" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 p-2 hover:text-white transition-all transform hover:rotate-90 hover:scale-110"><X size={28} className="md:w-[40px] md:h-[40px]" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
