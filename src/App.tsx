import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vSTEFAN_SEAMLESS";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [appMode, setAppMode] = useState<'gate' | 'theater'>('gate');
  
  // Transition logic
  const [showContinuity, setShowContinuity] = useState(false);
  const [pathwayChoices, setPathwayChoices] = useState<any[]>([]);
  const [isNextPart, setIsNextPart] = useState(false);
  
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

  // Continuity Trigger logic
  useEffect(() => {
    let timer: any;
    if (showContinuity && isNextPart && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showContinuity && isNextPart && countdown === 0) {
      autoJump();
    }
    return () => clearInterval(timer);
  }, [showContinuity, countdown, isNextPart]);

  const autoJump = () => {
    const sequel = pathwayChoices[0];
    if (sequel) { setShowContinuity(false); togglePlay(sequel); }
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
      audioRef.current.play();
      setAppMode('theater');
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

    // INTERCEPT: 10s left. Don't cut off audio!
    if (!showContinuity && (dur - cur <= 10)) {
      analyzeSeriesLinks();
    }

    // PARENT CHIME
    if (!showContinuity && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59)) {
      if (!warned) { setWarned(true); new Audio(CHIME_URL).play().catch(() => {}); }
    }
  };

  const analyzeSeriesLinks = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const cleanCurrentTitle = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    
    let pathList: any[] = [];
    let linked = false;

    // Check Index-1 (Higher upload index = Older ep in newest-first list)
    if (idx > 0) {
      const olderEntry = episodes[idx - 1]; // One Part newer
      if (olderEntry.title.toLowerCase().includes(cleanCurrentTitle)) {
        pathList.push(olderEntry);
        linked = true;
      }
    }

    const recs = episodes.filter(e => e.id !== activeEp.id && (!linked || e.id !== pathList[0].id)).sort(() => 0.5 - Math.random()).slice(0, linked ? 2 : 3);
    
    setPathwayChoices([...pathList, ...recs]);
    setIsNextPart(linked);
    setShowContinuity(true);
  };

  if (loading) return <div className="h-screen bg-theater-midnight flex items-center justify-center text-theater-gold font-ornate text-7xl"><Loader2 className="animate-spin" /></div>;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans overflow-x-hidden ${isDimmed ? 'is-dimmed' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />
      
      {/* THE BEDTIME VEIL: Pierceable by Controller only */}
      <div id="bedtime-veil"></div>

      {/* --- GATE: STAYS TOTALLY OFFLINE UNLESS ACTIVE --- */}
      {appMode === 'gate' && (
        <div className="fixed inset-0 z-[5000] bg-theater-midnight flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-1000 overflow-hidden">
           <div className="insignia-box">
              <h1 className="jat-insignia-text">JAT</h1>
           </div>
           <p className="font-serif text-3xl md:text-6xl font-black uppercase italic tracking-[0.2em] mb-12">Enter the Portal</p>
           <button 
              onClick={() => { setAppMode('stage'); window.scrollTo(0,0); }}
              className="bg-theater-gold text-black px-16 py-6 font-black uppercase tracking-[0.2em] text-sm md:text-lg hover:scale-110 transition shadow-[0_0_80px_#D4AF3744]"
           >Open the Theater</button>
           <p className="mt-20 opacity-30 text-[10px] font-black uppercase tracking-[0.6em]">TIMELESS STORIES • HESHY RIESEL</p>
        </div>
      )}

      {/* --- CONTINUITY: FIXED GRID STABILITY --- */}
      {showContinuity && (
        <div className="fixed inset-0 z-[4000] bg-black flex items-center justify-center p-4 md:p-8 animate-in slide-in-from-bottom duration-700">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-6 md:p-12 shadow-2xl border-t-[10px] border-theater-gold relative">
              <div className="text-center mb-10">
                 <h2 className="text-3xl md:text-7xl font-serif italic font-black uppercase tracking-tighter">
                   {isNextPart ? "The Story Continues" : "The Journey Concludes"}
                 </h2>
                 <p className="text-[11px] font-black uppercase tracking-[0.5em] mt-4 opacity-40">Which path from the Repertory is next?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                 {pathwayChoices.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all duration-500 ${i === 0 && isNextPart ? 'bg-white border-theater-gold ring-8 ring-theater-gold/5 scale-[1.03] shadow-xl' : 'bg-black/5 border-transparent opacity-60'}`}>
                      <div className="aspect-video md:aspect-square overflow-hidden mb-4 shadow-md border-white border-4"><img src={ep.image} className="w-full h-full object-cover group-hover:scale-105 transition" /></div>
                      <h4 className="font-serif text-lg font-black uppercase italic leading-none tracking-tight line-clamp-2">{ep.title}</h4>
                      {i === 0 && isNextPart && <p className="text-[#D4AF37] font-black text-[11px] uppercase tracking-tighter animate-pulse mt-4">Next Part in {countdown}s</p>}
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowContinuity(false)} className="mt-14 uppercase font-black text-[10px] opacity-20 hover:opacity-100 transition tracking-[1em] block w-full text-center leading-none">Stay on Stage</button>
           </div>
        </div>
      )}

      {/* --- STAGE REPERTORY --- */}
      <div id="stage-content" className="pt-24 pb-60">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-[#02040A]/80 backdrop-blur-xl border-b border-white/5 px-6 md:px-12 flex items-center">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 h-full text-[11px] font-black uppercase tracking-widest pt-2">
               <a href="#repertory" className="text-theater-gold hover:text-white transition">Repertory</a>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 text-white hover:text-theater-gold transition leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-[90vh] flex items-center px-8 text-left z-10 overflow-hidden mb-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E88_0%,_transparent_75%)] opacity-30"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7">
                <h2 className="text-5xl md:text-110px font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white leading-none">{episodes[0].title}</h2>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-base hover:scale-105 transition shadow-2xl flex items-center gap-8 transform rotate-1">
                   <Play size={32} fill="black"/> EXPERIENCE TALE
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-[0_0_100px_#000]" /></div>
            </div>
          </header>
        )}

        <section id="repertory" className="bg-[#F5F2E8] text-[#02040A] py-32 px-10 border-y-[20px] border-[#02040A] shadow-inner relative z-10">
           <div className="max-w-7xl mx-auto">
              <h3 className="text-6xl md:text-[140px] font-serif uppercase tracking-tighter mb-20 italic font-black border-b-[8px] border-black/5 pb-12 leading-none uppercase">Repertory</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-[#000] border-4 border-white transition-all group-hover:border-theater-gold">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={80} className="text-theater-gold" fill="#000" /></div>
                      </div>
                      <h4 className="text-2xl md:text-5xl font-serif font-black italic uppercase leading-none tracking-tighter text-left px-4">{ep.title}</h4>
                      <p className="mt-4 text-[10px] uppercase font-black opacity-30 px-4 leading-none tracking-widest uppercase">Maggid Production</p>
                   </div>
                ))}
              </div>
           </div>
        </section>
      </div>

      {/* --- MASTER PLAYER (Z-3000): ALWAY PIERCES THE VEIL --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold/50 px-6 md:px-12 py-10 md:py-16 z-[3000] shadow-[0_-40px_150px_#000] transition-all duration-1000 ${duration - currentTime <= 60 && !showContinuity ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {duration - currentTime <= 60 && !showContinuity && <div className="text-center text-white font-black uppercase text-[11px] tracking-[0.5em] mb-4 animate-bounce italic leading-none">Finish in {Math.floor(duration - currentTime)} seconds</div>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono text-left leading-none">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono leading-none">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex justify-between gap-10 items-center">
              <div className="flex items-center gap-8 text-left truncate flex-1 pr-6 cursor-pointer">
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border border-white/20" alt="" />
                <div className="truncate">
                  <h5 className="text-2xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-xs uppercase font-black text-white/40 tracking-[0.2em] italic mt-3 leading-none">HESHY RIESEL • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_50px_#D4AF3744]' : 'bg-white/5 text-white/20'}`}>
                   <Lamp size={32}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all transform -rotate-2">
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
