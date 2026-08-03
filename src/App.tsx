import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vSTABLE_FINAL";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'portal' | 'theater'>('portal');
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [nextChoiceList, setNextChoiceList] = useState<any[]>([]);
  const [isSeriesEnd, setIsSeriesEnd] = useState(false);
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
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setEpisodes(JSON.parse(cached)); setLoading(false); }
      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`);
        const data = await res.json();
        const xml = new DOMParser().parseFromString(data.contents, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).map((item, i) => ({
          id: item.querySelector("guid")?.textContent || String(i),
          title: item.querySelector("title")?.textContent || "Production",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 200) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
        }));
        setEpisodes(items);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) { setLoading(false); }
    }
    loadCatalog();
  }, []);

  // Continuity Countdown (only triggered by auto-start sequence)
  useEffect(() => {
    let timer: any;
    if (showNextOverlay && !isSeriesEnd && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextOverlay && !isSeriesEnd && countdown === 0) {
      handleGoToNextPart();
    }
    return () => clearInterval(timer);
  }, [showNextOverlay, countdown, isSeriesEnd]);

  const handleGoToNextPart = () => {
    if (nextChoiceList[0]) {
      const sequel = nextChoiceList[0];
      setShowNextOverlay(false);
      setCountdown(10);
      togglePlay(sequel);
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

    // G-D MOVE INTERCEPT: 10 SECONDS LEFT. NO CUT OFF. Audio continues!
    if (!showNextOverlay && (dur - cur <= 10)) {
      const idx = episodes.findIndex(e => e.id === activeEp.id);
      const root = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
      
      let list: any[] = [];
      let sequel = false;

      // Identify Part 2 in newest-first RSS (Index step-down)
      if (idx > 0) {
        const newerPart = episodes[idx - 1];
        if (newerPart.title.toLowerCase().includes(root)) {
          list.push(newerPart);
          sequel = true;
        }
      }

      // Add variety recommendations
      const randoms = episodes.filter(e => e.id !== activeEp.id && (!sequel || e.id !== list[0].id))
                              .sort(() => 0.5 - Math.random()).slice(0, sequel ? 2 : 3);
      
      setNextChoiceList([...list, ...randoms]);
      setIsSeriesEnd(!sequel);
      setShowNextOverlay(true);
    }

    // 60-SECOND PARENT CHIME
    if (!showNextOverlay && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59)) {
      if (!warned) { setWarned(true); new Audio(CHIME_URL).play().catch(() => {}); }
    }
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- ENTRANCE GATE (PORTAL) --- */}
      {viewMode === 'portal' && (
        <div className="fixed inset-0 z-[6000] portal-glow flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-1000 overflow-hidden">
           <h1 className="jat-portal-insignia">JAT</h1>
           <p className="font-serif text-3xl md:text-5xl font-black uppercase italic tracking-[0.2em] mb-12">Enter the Portal</p>
           <button 
              onClick={() => { setViewMode('theater'); window.scrollTo(0,0); }}
              className="bg-theater-gold text-black px-16 py-6 md:py-8 font-black uppercase tracking-[0.2em] text-sm md:text-lg hover:bg-theater-parchment transition shadow-2xl active:scale-95"
           >Open the Theater Doors</button>
           <div className="mt-20 opacity-20 text-[10px] font-black uppercase tracking-[0.6em]">TIMELESS STORIES • HESHY RIESEL</div>
        </div>
      )}

      {/* --- CHOICE TRANSITION CARD: 10S INTERCEPT --- */}
      {showNextOverlay && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-10 animate-in slide-in-from-bottom duration-700">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-8 md:p-14 shadow-2xl border-t-[10px] border-theater-gold relative">
              <div className="text-center mb-10">
                 <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase mb-4 tracking-tighter">
                    {!isSeriesEnd ? "The Story Continues" : "Pick Your Path Next"}
                 </h2>
                 <p className="text-[10px] uppercase font-black tracking-[0.4em] opacity-40 leading-none">
                   {!isSeriesEnd ? `Auto-starting next part in ${countdown}s` : "Choose your next tale from the repertory"}
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
                 {nextChoiceList.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all duration-500 ${i === 0 && !isSeriesEnd ? 'bg-white border-theater-gold ring-8 ring-theater-gold/5 scale-105 shadow-xl' : 'bg-white/50 border-transparent opacity-80 hover:opacity-100'}`}>
                      <div className="aspect-square overflow-hidden mb-5">
                         <img src={ep.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" alt="" />
                         {i === 0 && !isSeriesEnd && <div className="absolute top-0 right-0 bg-theater-burgundy text-white px-3 py-1 font-black text-[9px] uppercase shadow-lg">CONTINUE SERIES</div>}
                      </div>
                      <h4 className="font-serif text-lg md:text-xl font-black italic uppercase leading-none tracking-tighter text-left line-clamp-2">{ep.title}</h4>
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowNextOverlay(false)} className="mt-14 uppercase font-black text-[11px] opacity-20 hover:opacity-100 transition tracking-[0.8em] block w-full text-center">Audio is playing... hide these options</button>
           </div>
        </div>
      )}

      {/* --- STAGE LAYER (The Repertory) --- */}
      <div id="main-content">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-theater-midnight/40 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1 uppercase">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase h-full pt-1">
               <a href="#repertory" className="text-theater-gold hover:text-white transition tracking-widest">Repertory</a>
               <button className="flex items-center gap-2 text-white/20 border border-white/5 px-6 py-2 tracking-widest opacity-20 cursor-not-allowed"> <Lock size={12}/> Entry Locked </button>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 text-white font-black hover:text-theater-gold uppercase tracking-[0.1em] leading-none transition">Heshy Riesel • THE MAGGID</a>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold pt-1"><Menu size={32}/></button>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-30 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7 flex flex-col justify-center">
                <h2 className="text-5xl md:text-[115px] font-serif leading-[0.82] mb-10 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-10 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-base hover:scale-110 transition shadow-[0_0_80px_rgba(212,175,55,0.4)] flex items-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32}/> : <Play size={32} fill="black"/>}
                  BEGIN PRODUCTION
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-[0_0_100px_rgba(0,0,0,1)] grayscale transition duration-1000" /></div>
            </div>
          </header>
        )}

        <section id="repertory" className="bg-[#F5F2E8] text-[#02040A] py-32 px-10 border-y-[20px] border-theater-midnight shadow-inner">
           <div className="max-w-7xl mx-auto text-left">
              <h3 className="text-6xl md:text-[160px] font-serif uppercase tracking-tighter border-b-8 border-black/5 pb-8 mb-24 italic leading-none font-black opacity-90">REPERTORY</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-black border-[1px] border-black/5 group-hover:border-theater-gold transition duration-1000">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-700" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={80} className="text-theater-gold" fill="#000" /></div>
                      </div>
                      <h4 className="text-3xl md:text-4xl font-serif font-black italic tracking-tighter uppercase leading-[0.95] text-left">{ep.title}</h4>
                      <p className="mt-4 text-[11px] font-black uppercase text-theater-burgundy opacity-40 italic tracking-widest leading-none">Heshy Riesel • THE MAGGID</p>
                   </div>
                ))}
              </div>
           </div>
        </section>
      </div>

      {/* --- MASTER PLAYER BAR --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold px-6 md:px-12 py-10 md:py-16 z-[3000] shadow-[0_-40px_100px_#000] transition-all duration-700 ${duration - currentTime <= 60 && !showNextOverlay ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {duration - currentTime <= 60 && !showNextOverlay && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">1 Minute Left • Parental Monitor Active</div>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[2px] bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex justify-between gap-10 items-center">
              <div className="flex items-center gap-6 text-left truncate flex-1 pr-6 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border border-white/10 shadow-2xl" alt="" />
                <div className="truncate">
                  <h5 className="text-xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-xs uppercase font-black text-white/30 italic mt-3 tracking-widest leading-none">HESHY RIESEL • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_50px_#D4AF3744]' : 'bg-white/5 text-white/20'}`} title="Dim Lights">
                   <Lamp size={32}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 transition-all transform active:scale-95">
                   {isPlaying ? <Pause size={48}/> : <Play size={48} fill="black" className="ml-2"/>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
