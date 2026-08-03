import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vPRO_FINAL";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'portal' | 'theater'>('portal');
  
  // Transition Engine States
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [sequelOptions, setSequelOptions] = useState<any[]>([]);
  const [isSeriesEnd, setIsSeriesEnd] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [transitionCountdown, setTransitionCountdown] = useState(15);
  const [warned, setWarned] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  // MULTI-PROXY GATEWAY FOR CORS (G-D MOVE BYPASS)
  useEffect(() => {
    async function loadTheater() {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setEpisodes(JSON.parse(cached)); setLoading(false); }

      const proxyUrls = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(RSS_URL)}`,
        `https://corsproxy.io/?${encodeURIComponent(RSS_URL)}`
      ];

      for (const url of proxyUrls) {
        try {
          const res = await fetch(url);
          const data = await res.json();
          const xmlContent = data.contents || data;
          if (typeof xmlContent !== 'string' || !xmlContent.includes('<item>')) continue;

          const xml = new DOMParser().parseFromString(xmlContent, "text/xml");
          const items = Array.from(xml.querySelectorAll("item")).map((item, i) => ({
            id: item.querySelector("guid")?.textContent || String(i),
            title: item.querySelector("title")?.textContent || "Jewish Story",
            desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 200) + "...",
            url: item.querySelector("enclosure")?.getAttribute("url") || "",
            image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
          }));

          setEpisodes(items);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
          setLoading(false);
          return; 
        } catch (e) { console.warn("Trying next proxy..."); }
      }
      setLoading(false);
    }
    loadTheater();
  }, []);

  // Continuity Countdown (15s before end)
  useEffect(() => {
    let timer: any;
    if (showTransitionOverlay && !isSeriesEnd && transitionCountdown > 0) {
      timer = setInterval(() => setTransitionCountdown(c => c - 1), 1000);
    } else if (showTransitionOverlay && !isSeriesEnd && transitionCountdown === 0) {
      playNextPart();
    }
    return () => clearInterval(timer);
  }, [showTransitionOverlay, transitionCountdown, isSeriesEnd]);

  const playNextPart = () => {
    const nextStory = sequelOptions[0];
    if (nextStory) {
      setTransitionCountdown(15);
      setShowTransitionOverlay(false);
      togglePlay(nextStory);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowTransitionOverlay(false);
    setWarned(false);
    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play();
      setViewMode('theater');
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

    // INTERCEPT: 15 Seconds left triggers next choices. Audio remains active!
    if (!showTransitionOverlay && (dur - cur <= 15) && (dur - cur > 1)) {
      identifySequelFlow();
    }

    // PARENT CHIME
    if (!showTransitionOverlay && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59)) {
      if (!warned) { setWarned(true); new Audio(CHIME_URL).play().catch(() => {}); }
    }
  };

  const identifySequelFlow = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const baseTitle = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    
    let pathList: any[] = [];
    let isContinuing = false;

    // Is there a "Part 2" (More recent upload = Lower Index)
    if (idx > 0) {
      const nextOne = episodes[idx - 1];
      if (nextOne.title.toLowerCase().includes(baseTitle)) {
        pathList.push(nextOne);
        isContinuing = true;
      }
    }

    // Fill with random recommendations from vault
    const randomRecs = episodes
      .filter(e => e.id !== activeEp.id && (!isContinuing || e.id !== pathList[0].id))
      .sort(() => 0.5 - Math.random())
      .slice(0, isContinuing ? 2 : 3);
    
    setSequelOptions([...pathList, ...randomRecs]);
    setIsSeriesEnd(!isContinuing);
    setShowTransitionOverlay(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- ENTRANCE GATE (G-D MOVE LOGO) --- */}
      {viewMode === 'portal' && (
        <div className="fixed inset-0 z-[6000] portal-gradient flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-1000">
           <div className="max-w-2xl flex flex-col items-center gap-12">
             <div className="jat-logo">JAT</div>
             <p className="font-serif text-3xl md:text-5xl font-black uppercase italic tracking-[0.2em] leading-none">Enter the Portal</p>
             <button 
                onClick={() => { setViewMode('theater'); window.scrollTo(0,0); }}
                className="bg-theater-gold text-black px-12 md:px-20 py-6 font-black uppercase text-sm md:text-lg tracking-widest hover:scale-105 transition shadow-[0_0_80px_#D4AF3744]"
             >Open Theater Gates</button>
           </div>
           <p className="fixed bottom-10 text-[9px] uppercase font-black tracking-[0.5em] text-white opacity-20">Timeless Stories Brought to Life • Heshy Riesel</p>
        </div>
      )}

      {/* --- SEAMLESS TRANSITION CARD (15S BEFORE END) --- */}
      {showTransitionOverlay && (
        <div className="fixed inset-0 z-[4000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in slide-in-from-bottom duration-700">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-8 md:p-14 shadow-2xl border-t-[10px] border-theater-gold relative">
              <div className="text-center mb-10">
                 <h2 className="text-4xl md:text-8xl font-serif italic font-black uppercase mb-4 tracking-tighter leading-none">
                   {!isSeriesEnd ? "Keep the Story Going" : "Pick a New Adventure"}
                 </h2>
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 leading-none">
                    {!isSeriesEnd ? `Auto-starting ${sequelOptions[0].title.split(/Part/i)[1]} in ${transitionCountdown}s` : "Story concluded. Choose next adventure:"}
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {sequelOptions.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all duration-500 ${i === 0 && !isSeriesEnd ? 'bg-white border-theater-gold ring-[15px] ring-theater-gold/5 scale-105 shadow-2xl' : 'bg-white/50 border-transparent opacity-80 hover:opacity-100'}`}>
                      <div className="relative aspect-square overflow-hidden mb-5">
                         <img src={ep.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="" />
                         {i === 0 && !isSeriesEnd && <div className="absolute top-0 right-0 bg-theater-burgundy text-white px-3 py-1 font-black text-[9px] uppercase tracking-widest shadow-xl">CONTINUITY PART</div>}
                      </div>
                      <h4 className="font-serif text-lg md:text-xl font-black italic uppercase leading-none text-left line-clamp-2">{ep.title}</h4>
                      {i === 0 && !isSeriesEnd && <p className="mt-4 text-[#D4AF37] font-black text-[10px] uppercase tracking-[0.2em] animate-pulse leading-none">Continuing Production Soon</p>}
                   </div>
                 ))}
              </div>
              
              <button onClick={() => setShowTransitionOverlay(false)} className="mt-14 uppercase font-black text-[10px] opacity-20 hover:opacity-100 transition tracking-[0.8em] block w-full text-center">Back to current production</button>
           </div>
        </div>
      )}

      {/* --- SITE STAGE ROOT --- */}
      <div id="stage-root">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 flex items-center bg-[#02040A]/60 backdrop-blur-xl border-b border-white/5 px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black uppercase tracking-tighter">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-12 text-[11px] font-black uppercase pt-1">
               <a href="#vault" className="text-theater-gold hover:text-white transition">Vault</a>
               <button className="flex items-center gap-2 text-white/20 border border-white/5 px-6 py-2 tracking-widest opacity-20 cursor-not-allowed uppercase font-black text-[10px]"> Entry Link Pending </button>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 text-white font-black hover:text-theater-gold transition leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold"><Menu size={32}/></button>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-32 px-8 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_75%)] opacity-30 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7">
                <h2 className="text-5xl md:text-[115px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-10 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-16 py-8 font-black uppercase text-base hover:scale-105 transition shadow-2xl flex items-center gap-6">
                   <Play size={28} fill="black" /> EXPERIENCE THEATER
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-[0_0_100px_rgba(0,0,0,1)] grayscale" alt=""/></div>
            </div>
          </header>
        )}

        <section id="vault" className="bg-[#F5F2E8] text-[#02040A] py-48 px-10 border-y-[20px] border-[#02040A]">
           <div className="max-w-7xl mx-auto text-left">
              <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter border-b-[8px] border-black/5 pb-12 mb-24 italic text-center font-black">THE VAULT</h3>
              <div className="grid md:grid-cols-3 gap-16 md:gap-y-40">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="cursor-pointer group flex flex-col text-left" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-8 shadow-2xl bg-[#000] border-2 border-transparent group-hover:border-theater-gold transition duration-1000">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={64} className="text-theater-gold" /></div>
                      </div>
                      <h4 className="text-2xl font-serif font-black italic uppercase leading-none">{ep.title}</h4>
                      <p className="mt-3 text-[11px] font-bold text-theater-burgundy uppercase tracking-widest opacity-30 leading-none italic">HESHY RIESEL • THE MAGGID</p>
                   </div>
                ))}
              </div>
           </div>
        </section>
      </div>

      {/* --- MASTER PLAYER BAR --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold/50 px-6 md:px-12 py-10 md:py-16 z-[3000] shadow-[0_-30px_150px_rgba(0,0,0,1)] transition-all duration-1000 ${duration - currentTime <= 60 && !showTransitionOverlay ? 'bg-[#7B0000]' : 'bg-[#090D17]'}`}>
          <div className="max-w-7xl mx-auto">
            {duration - currentTime <= 60 && !showTransitionOverlay && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">1 Minute Alert • Finish in {Math.floor(duration - currentTime)}s</div>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between gap-10">
              <div className="flex items-center gap-6 text-left truncate flex-1">
                <img src={activeEp.image} className="w-16 h-16 md:w-28 md:h-28 object-cover border border-white/10 shadow-2xl" alt="" />
                <div className="truncate">
                  <h5 className="text-xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-xs uppercase font-black text-white/40 tracking-widest mt-2 uppercase leading-none">HESHY RIESEL • THE MAGGID • TIMELESS STORIES</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_50px_#D4AF3744]' : 'bg-white/5 text-white/20 border-white/10'}`} title="Bedtime Lamp">
                   <Lamp size={32}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-110 active:scale-90 transition-all transform -rotate-1">
                  {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-2" fill="black" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
