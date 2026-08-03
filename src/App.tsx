import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_vMASTER_STEFAN_FIX";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [mode, setMode] = useState<'gate' | 'theater'>('gate');
  
  const [showContinuity, setShowContinuity] = useState(false);
  const [continuityChoices, setContinuityChoices] = useState<any[]>([]);
  const [isSeriesOngoing, setIsSeriesOngoing] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
    if (showContinuity && isSeriesOngoing && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showContinuity && isSeriesOngoing && countdown === 0) {
      handleContinuityJump();
    }
    return () => clearInterval(timer);
  }, [showContinuity, countdown, isSeriesOngoing]);

  const handleContinuityJump = () => {
    const sequel = continuityChoices[0];
    if (sequel) {
      setShowContinuity(false);
      togglePlay(sequel);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowContinuity(false);
    setWarned(false);
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
    if (!dur) return;
    setCurrentTime(cur);

    // G-D MOVE INTERCEPT: 10 Seconds Left. Audio stays on!
    if (!showContinuity && (dur - cur <= 10)) {
      calculateSeriesRecon();
    }

    // 1-MINUTE WARNING
    if (!showContinuity && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const calculateSeriesRecon = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const cleanTitle = activeEp.title.toLowerCase();
    
    // Extract unique words (stefan, sofer, butcher)
    const keywords = cleanTitle.replace(/part|episode|chapter|pt|:|1|2|3|4/g, '').trim().split(' ');
    const coreName = keywords[keywords.length - 1]; // Use last distinctive word

    let list: any[] = [];
    let linked = false;

    // RSS Feed Search: Move toward index 0 (Newer) to find Part 2
    if (idx > 0) {
      const olderEntry = episodes[idx - 1];
      if (olderEntry.title.toLowerCase().includes(coreName)) {
        list.push(olderEntry);
        linked = true;
      }
    }

    // Fill with recommendations from repertory
    const recs = episodes.filter(e => e.id !== activeEp.id && (!linked || e.id !== list[0].id))
                        .sort(() => 0.5 - Math.random()).slice(0, linked ? 2 : 3);
    
    setContinuityChoices([...list, ...recs]);
    setIsSeriesOngoing(linked);
    setCountdown(10);
    setShowContinuity(true);
  };

  if (loading) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- MANDATORY THEATER PORTAL (G-D MOVE) --- */}
      {mode === 'gate' && (
        <div className="fixed inset-0 z-[8000] portal-bg flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-1000 overflow-hidden">
           <h1 className="jat-insignia leading-none">JAT</h1>
           <p className="font-serif text-3xl md:text-5xl font-black uppercase italic tracking-[0.2em] mb-12 leading-none">Enter the Portal</p>
           <button 
              onClick={() => { setMode('theater'); window.scrollTo(0,0); }}
              className="bg-theater-gold text-black px-14 py-6 font-black uppercase text-sm md:text-base tracking-[0.2em] hover:scale-110 transition shadow-[0_0_80px_#D4AF3766]"
           >Open the Theater</button>
           <p className="mt-16 text-[10px] uppercase font-black tracking-[0.8em] opacity-30">TIMELESS STORIES • HESHY RIESEL</p>
        </div>
      )}

      {/* --- CONTINUITY OVERLAY: SOLID & NON-JUMBLED --- */}
      {showContinuity && (
        <div className="fixed inset-0 z-[5000] bg-black/98 flex items-center justify-center p-4 md:p-8 animate-in slide-in-from-bottom duration-500">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-6 md:p-12 shadow-2xl border-t-[12px] border-theater-gold overflow-y-auto max-h-[90vh]">
              <div className="text-center mb-10">
                 <h2 className="text-3xl md:text-7xl font-serif italic font-black uppercase mb-4 tracking-tighter">
                   {isSeriesOngoing ? "The Story Continues" : "Pick Your Path"}
                 </h2>
                 <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-40">Choose your next step in the theater</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                 {continuityChoices.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-4 border-2 transition-all duration-300 ${i === 0 && isSeriesOngoing ? 'bg-white border-theater-gold ring-8 ring-theater-gold/5 scale-[1.02]' : 'bg-black/5 border-transparent opacity-80'}`}>
                      <div className="aspect-video md:aspect-square overflow-hidden mb-4"><img src={ep.image} className="w-full h-full object-cover" /></div>
                      <h4 className="font-serif text-lg font-black uppercase italic leading-none truncate mb-2">{ep.title}</h4>
                      {i === 0 && isSeriesOngoing && <p className="text-[#D4AF37] font-black text-[9px] uppercase tracking-widest animate-pulse">Chapter {episodes.length - (episodes.findIndex(e=>e.id===ep.id))} Starts in {countdown}s</p>}
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowContinuity(false)} className="mt-12 uppercase font-black text-[11px] opacity-20 hover:opacity-100 transition tracking-[1em] block w-full text-center">Audio continues... Stay on Stage</button>
           </div>
        </div>
      )}

      {/* --- REPERTORY VIEW --- */}
      <div id="stage-content">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-theater-midnight/60 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1 uppercase">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 h-full pt-1 text-[11px] font-black uppercase tracking-widest">
               <a href="#repertory" className="text-theater-gold hover:text-white transition">Repertory</a>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 text-white hover:text-theater-gold transition leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold"><Menu/></button>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-30"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7">
                <h2 className="text-5xl md:text-[110px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-10 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-base hover:scale-110 transition shadow-[0_0_80px_rgba(212,175,55,0.4)] flex items-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32}/> : <Play size={32} fill="black"/>} START STORY
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-[0_0_100px_rgba(0,0,0,1)] grayscale transition duration-1000" /></div>
            </div>
          </header>
        )}

        <section id="repertory" className="bg-[#F5F2E8] text-[#02040A] py-32 px-10 border-y-[20px] border-[#02040A] shadow-inner relative z-10">
           <div className="max-w-7xl mx-auto text-left">
              <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter mb-20 italic font-black border-b-[8px] border-black/5 pb-12 leading-none uppercase">REPERTORY</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-40">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-black border-4 border-white transition duration-700">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={80} className="text-theater-gold" fill="#000" /></div>
                      </div>
                      <h4 className="text-2xl md:text-5xl font-serif font-black italic uppercase leading-none tracking-tighter px-4 text-center">{ep.title}</h4>
                   </div>
                ))}
              </div>
           </div>
        </section>
      </div>

      {/* --- MASTER PLAYER BAR --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold/50 px-6 md:px-12 py-10 md:py-16 z-[3000] shadow-[0_-30px_150px_rgba(0,0,0,1)] transition-all duration-700 ${duration - currentTime <= 60 && !showNextChoices ? 'bg-theater-burgundy' : 'bg-[#090D17]'}`}>
          <div className="max-w-7xl mx-auto">
            {duration - currentTime <= 60 && !showNextOverlay && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">1 Minute Alarm • Finishing In {Math.floor(duration - currentTime)}s</div>}
            <div className="flex items-center gap-8 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[2px] bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 font-mono text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            <div className="w-full flex justify-between items-center gap-10">
              <div className="flex items-center gap-8 text-left truncate flex-1 cursor-pointer">
                <img src={activeEp.image} className="w-14 h-14 md:w-32 md:h-28 object-cover border border-white/20 shadow-xl" alt="" />
                <div className="truncate pr-10">
                  <h5 className="text-2xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-2 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-xs uppercase font-black text-white/40 tracking-[0.2em] italic mt-3 leading-none uppercase">Heshy Riesel • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold' : 'bg-white/5 text-white/20 hover:border-theater-gold'}`}>
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
