import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vSPEED_FIX";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  
  const [mode, setMode] = useState<'gate' | 'theater'>('gate');
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [nextChoiceList, setNextChoiceList] = useState<any[]>([]);
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

  // HIGH-SPEED MULTI-GATEWAY RACER
  useEffect(() => {
    async function loadCatalog() {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setEpisodes(JSON.parse(cached)); setLoading(false); }

      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(RSS_URL)}`
      ];

      try {
        // RACE: Fires all requests at once. Whichever connects first wins. (G-d move speed)
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
          id: item.querySelector("guid")?.textContent || String(i),
          title: item.querySelector("title")?.textContent || "Production",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
        }));

        setEpisodes(items);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) {
        console.warn("Feed failed to load");
        setLoading(false);
      }
    }
    loadCatalog();
  }, []);

  // Continuity Countdown
  useEffect(() => {
    let timer: any;
    if (showNextOverlay && isSeriesLink && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextOverlay && isSeriesLink && countdown === 0) {
      handleContinuityAutoPlay();
    }
    return () => clearInterval(timer);
  }, [showNextOverlay, countdown, isSeriesLink]);

  const handleContinuityAutoPlay = () => {
    if (nextChoiceList[0]) {
      const next = nextChoiceList[0];
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
      setMode('theater');
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur || dur < 1) return; // Prevent NaN errors and red flash
    
    setCurrentTime(cur);

    // SEAMLESS INTERCEPT: Show overlay 15 seconds before the end
    if (!showNextOverlay && (dur - cur <= 15) && (dur - cur > 1)) {
      calculateSeriesRecon();
    }

    // PARENT CHIME: At 60 seconds (Only triggers if duration is > 65s)
    if (!showNextOverlay && dur > 65 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const calculateSeriesRecon = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    
    // Core Title Extractor: Very forgiving. Splits at "Part", "Chapter", "-", ":"
    const baseTitle = activeEp.title.split(/part|chapter|pt|:|-/i)[0].trim().toLowerCase();
    
    let pathOptions: any[] = [];
    let linked = false;

    // Is there a "Part 2"? (Higher upload index = Newer story part = Lower array index)
    if (idx > 0) {
      const newerPart = episodes[idx - 1]; 
      if (newerPart.title.toLowerCase().includes(baseTitle)) {
        pathOptions.push(newerPart);
        linked = true;
      }
    }

    // Fill the rest with random vault choices
    const vault = episodes.filter(e => e.id !== activeEp.id && (!linked || e.id !== pathOptions[0].id)).sort(() => 0.5 - Math.random()).slice(0, linked ? 2 : 3);
    
    setNextChoiceList([...pathOptions, ...vault]);
    setIsSeriesLink(linked);
    setCountdown(10);
    setShowNextOverlay(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-[#D4AF37]"><Loader2 className="animate-spin" size={40}/></div>;

  // STRICT RED FLASH FIX: Must be greater than 65s total duration
  const isFinalMinute = duration > 65 && (duration - currentTime <= 60) && !showNextOverlay;

  // --- BRANCH 1: THE PORTAL GATE ---
  if (mode === 'gate') {
    return (
      <div className="fixed inset-0 z-[8000] bg-theater-midnight flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-1000 overflow-hidden portal-bg">
        <h1 className="jat-portal-insignia">JAT</h1>
        <p className="font-serif text-3xl md:text-6xl font-black uppercase italic tracking-[0.2em] mb-12 text-[#F5F2E8]">Enter the Portal</p>
        <button 
          onClick={() => { setMode('theater'); window.scrollTo(0,0); }}
          className="bg-[#D4AF37] text-black px-16 py-7 md:px-24 md:py-8 font-black uppercase tracking-[0.2em] text-sm md:text-lg hover:bg-white transition shadow-[0_0_100px_#D4AF3744] active:scale-95"
        >Open the Theater</button>
        <div className="mt-20 opacity-30 text-[9px] font-black uppercase tracking-[0.6em] text-white">TIMELESS STORIES • HESHY RIESEL</div>
      </div>
    );
  }

  // --- BRANCH 2: THE THEATER ---
  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-[#D4AF37] overflow-x-hidden ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* MOBILE-SAFE MENU OVERLAY */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[9000] bg-[#02040A]/98 backdrop-blur-xl flex flex-col items-center justify-center gap-12 animate-in fade-in">
           <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-8 text-[#D4AF37]"><X size={40}/></button>
           <a href="#repertory" onClick={() => setIsMenuOpen(false)} className="text-4xl font-serif italic text-[#D4AF37]">The Repertory</a>
           <a href="#casting" onClick={() => setIsMenuOpen(false)} className="text-4xl font-serif italic text-[#D4AF37]">Audition</a>
           <a href="mailto:Maggid@jewishaudiotheater.com" className="text-4xl font-serif italic text-[#D4AF37]">Contact Heshy</a>
        </div>
      )}

      {/* CONTINUITY INTERCEPT OVERLAY (MOBILE SCROLL FIX) */}
      {showNextOverlay && (
        <div className="fixed inset-0 z-[5000] bg-[#02040A]/98 flex items-start md:items-center justify-center p-4 md:p-8 animate-in slide-in-from-bottom duration-700 overflow-y-auto">
           <div className="max-w-5xl w-full bg-[#F5F2E8] text-[#02040A] p-6 md:p-14 shadow-[0_0_100px_#000] border-t-[10px] border-[#D4AF37] relative my-auto">
              <div className="text-center mb-10">
                 <h2 className="text-3xl md:text-7xl font-serif italic font-black uppercase tracking-tighter leading-tight">
                   {isSeriesLink ? "The Story Continues" : "Pick Your Path Next"}
                 </h2>
                 <p className="text-[10px] uppercase font-black tracking-[0.5em] mt-4 opacity-40">Choose from the repertory vault</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
                 {nextChoiceList.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all duration-500 ${i === 0 && isSeriesLink ? 'bg-white border-[#D4AF37] ring-8 ring-[#D4AF37]/5 scale-100 md:scale-105 shadow-xl' : 'bg-black/5 border-transparent opacity-80 hover:opacity-100'}`}>
                      <div className="aspect-square overflow-hidden mb-5 border-4 border-white shadow-sm"><img src={ep.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" /></div>
                      <h4 className="font-serif text-lg md:text-xl font-black italic uppercase leading-none tracking-tight">{ep.title}</h4>
                      {i === 0 && isSeriesLink && <p className="mt-4 text-[#D4AF37] font-black text-[11px] uppercase animate-pulse">Auto-start next chapter in {countdown}s</p>}
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowNextOverlay(false)} className="mt-14 uppercase font-black text-[11px] opacity-20 hover:opacity-100 transition tracking-[1em] block w-full text-center py-4">Stay on current stage</button>
           </div>
        </div>
      )}

      {/* --- STAGE CONTENT --- */}
      <div id="stage-content">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-[#02040A]/80 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-[#D4AF37] leading-none italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1 uppercase">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 h-full pt-1 text-[11px] font-black uppercase tracking-widest">
               <a href="#repertory" className="text-[#D4AF37] hover:text-white transition tracking-widest pt-1 uppercase">The Repertory</a>
               <a href="#casting" className="text-[#D4AF37] hover:text-white transition tracking-widest pt-1 uppercase">Audition</a>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 text-white font-black hover:text-[#D4AF37] transition leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
            <button onClick={() => setIsMenuOpen(true)} className="md:hidden text-[#D4AF37] pt-1"><Menu size={32}/></button>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-6 md:px-8 text-left z-10 overflow-hidden mb-20 md:mb-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-40 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7 flex flex-col justify-center">
                <h2 className="text-5xl sm:text-7xl lg:text-[110px] font-serif leading-[0.82] mb-10 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-[#D4AF37] mb-10 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-[#D4AF37]/50 pl-8 leading-relaxed text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-full sm:w-fit bg-[#D4AF37] text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-base hover:scale-105 transition shadow-2xl flex items-center justify-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32}/> : <Play size={32} fill="black"/>} BEGIN PRODUCTION
                </button>
              </div>
              <div className="hidden md:block md:col-span-5 relative"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-[#D4AF37]/10 shadow-[0_0_100px_#000] grayscale transition duration-1000" /></div>
            </div>
          </header>
        )}

        {/* VAULT */}
        <section id="repertory" className="bg-[#F5F2E8] text-[#02040A] py-24 md:py-48 px-6 md:px-10 border-y-[15px] md:border-y-[20px] border-[#02040A] shadow-inner relative z-10">
           <div className="max-w-7xl mx-auto">
              <h3 className="text-5xl md:text-[150px] font-serif uppercase tracking-tighter mb-16 md:mb-24 italic font-black border-b-[8px] border-black/5 pb-8 md:pb-12 leading-none text-center">Repertory</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16 md:gap-y-32">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="cursor-pointer group flex flex-col text-left" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-6 md:mb-10 shadow-2xl bg-black border-4 border-white transition-all group-hover:border-[#D4AF37]">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={64} md:size={80} className="text-[#D4AF37]" fill="#000" /></div>
                      </div>
                      <h4 className="text-2xl md:text-4xl font-serif font-black italic uppercase leading-none tracking-tighter">{ep.title}</h4>
                      <p className="mt-4 text-[9px] md:text-[11px] font-black uppercase text-[#4A0E0E] opacity-40 tracking-widest leading-none">THE MAGGID PRODUCTION</p>
                   </div>
                ))}
              </div>
           </div>
        </section>

        {/* CASTING SECTION */}
        <section id="casting" className="py-24 md:py-40 px-6 md:px-12 bg-[#02040A] border-b border-[#D4AF37]/10 text-left">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <div>
              <h2 className="text-5xl md:text-8xl font-serif uppercase tracking-tighter mb-8 italic text-[#D4AF37] leading-none">Stage Call</h2>
              <p className="text-lg md:text-2xl font-light opacity-70 mb-10 italic leading-relaxed text-[#F5F2E8]">Children and parents: Submit your voice audition for our upcoming productions.</p>
              <div className="bg-[#4A0E0E] text-[#D4AF37] px-6 py-3 font-black uppercase text-[10px] tracking-widest inline-block italic shadow-lg">Casting: To be announced</div>
            </div>
            <div className="bg-[#F5F2E8] p-8 md:p-16 text-[#02040A] shadow-2xl border-t-4 border-[#D4AF37]">
              <form action="https://formspree.io/f/YOUR_ID" method="POST" className="space-y-6">
                <input type="text" name="name" placeholder="Full Name" required className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-[10px] font-black tracking-widest" />
                <input type="text" name="age" placeholder="Age" required className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-[10px] font-black tracking-widest" />
                <input type="email" name="email" placeholder="Email Address" required className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-[10px] font-black tracking-widest" />
                <button type="submit" className="w-full bg-[#02040A] text-[#D4AF37] py-6 font-black uppercase tracking-widest text-[10px] hover:bg-[#4A0E0E] transition mt-4 shadow-xl">Submit Audition</button>
              </form>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer id="contact" className="py-32 md:py-48 px-6 bg-[#02040A] text-center border-t border-white/5">
          <Headphones className="mx-auto text-[#D4AF37] mb-12 opacity-30" size={48} />
          <h2 className="text-4xl md:text-8xl font-serif uppercase tracking-tighter mb-10 text-[#D4AF37] italic font-black">Contact</h2>
          <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic break-words leading-none">Maggid@jewishaudiotheater.com</a>
          <div className="mt-20 flex justify-center gap-12 text-[#D4AF37]/20">
            <Globe size={28} /> <Music size={28} /> <Share2 size={28} />
          </div>
          <p className="mt-24 text-[9px] uppercase tracking-[0.6em] opacity-30 font-black italic">© 2024 Heshy Riesel • AUTHORITY PRODUCTION ARCHIVE</p>
        </footer>
      </div>

      {/* --- MASTER PLAYER BAR --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-[#D4AF37]/50 px-4 md:px-12 py-6 md:py-16 z-[3000] shadow-[0_-30px_150px_#000] transition-colors duration-1000 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#090D17]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[10px] md:text-[12px] tracking-[0.5em] mb-4 animate-bounce">1 Minute Alert • Finish in {Math.floor(duration - currentTime)}s</div>}
            
            <div className="flex items-center gap-6 md:gap-10 mb-6 md:mb-8">
              <span className="text-[10px] md:text-[12px] font-black text-[#D4AF37] w-12 md:w-14 font-mono text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[3px] bg-white/10 appearance-none accent-[#D4AF37] cursor-pointer" />
              <span className="text-[10px] md:text-[12px] font-black text-white/50 w-12 md:w-14 font-mono text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex justify-between gap-6 md:gap-10 items-center">
              <div className="flex items-center gap-4 md:gap-8 text-left truncate flex-1 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border-2 border-white/20 shadow-xl" alt="" />
                <div className="truncate pr-4">
                  <h5 className="text-lg md:text-5xl font-serif text-[#D4AF37] uppercase italic truncate leading-none mb-1 md:mb-2 font-black tracking-tighter">{activeEp.title}</h5>
                  <p className="text-[9px] md:text-[11px] uppercase font-black text-white/40 tracking-[0.2em] italic mt-2 md:mt-3 leading-none">HESHY RIESEL • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-6 md:gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`hidden sm:block p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-[#D4AF37] text-black shadow-[0_0_50px_#D4AF3744]' : 'bg-white/5 text-white/20 border-white/5'}`}>
                   <Lamp size={24}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-[#D4AF37] rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all transform -rotate-2">
                   {isPlaying ? <Pause size={40} className="md:w-[56px] md:h-[56px]" /> : <Play size={40} className="ml-1 md:w-[56px] md:h-[56px]" fill="black" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 p-2 hover:text-white transition-all transform hover:rotate-90"><X size={28} className="md:w-[40px] md:h-[40px]" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
