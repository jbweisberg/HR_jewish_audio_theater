import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vPRO_v1";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'portal' | 'theater'>('portal');
  const [showNextScreen, setShowNextScreen] = useState(false);
  const [nextChoices, setNextChoices] = useState<any[]>([]);
  const [isSeriesTransition, setIsSeriesTransition] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState(15);
  const [warned, setWarned] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  // MULTI-PROXY GATEWAY ENGINE (G-D MOVE CORS BYPASS)
  useEffect(() => {
    async function loadTheater() {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setEpisodes(JSON.parse(cached)); setLoading(false); }

      const proxies = [
        (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
      ];

      for (let getProxyUrl of proxies) {
        try {
          const res = await fetch(getProxyUrl(RSS_URL));
          const data = await res.json();
          // Normalize based on different proxy response formats
          const xmlContent = data.contents || data; 
          if (!xmlContent || typeof xmlContent !== 'string') continue;

          const xml = new DOMParser().parseFromString(xmlContent, "text/xml");
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
          return; // Success, exit loop
        } catch (e) { console.warn("Proxy Gateway Failed, Rotating..."); }
      }
      setLoading(false); // End load regardless
    }
    loadTheater();
  }, []);

  // Continuity Auto-play Logic
  useEffect(() => {
    let timer: any;
    if (showNextScreen && isSeriesTransition && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextScreen && isSeriesTransition && countdown === 0) {
      togglePlay(nextChoices[0]);
    }
    return () => clearInterval(timer);
  }, [showNextScreen, countdown, isSeriesTransition, nextChoices]);

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowNextScreen(false);
    setWarned(false);
    setCountdown(15);
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

    // SEAMLESS TRANSITION ENGINE (15s before end)
    if (!showNextScreen && (dur - cur <= 15) && (dur - cur > 1)) {
      calculateSeriesContinuity();
    }

    // 1-MINUTE PARENTAL CHIME
    if (!showNextScreen && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const calculateSeriesContinuity = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const rootName = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    
    let candidates: any[] = [];
    let isContinuation = false;

    // Look for Newer Index (Chronological Next Part)
    if (idx > 0) {
      const sequel = episodes[idx - 1];
      if (sequel.title.toLowerCase().includes(rootName)) {
        candidates.push(sequel);
        isContinuation = true;
      }
    }

    const randomRecs = episodes.filter(e => e.id !== activeEp.id && (!isContinuation || e.id !== candidates[0].id))
                              .sort(() => 0.5 - Math.random()).slice(0, isContinuation ? 2 : 3);
    
    setTransitionList([...candidates, ...randomRecs]);
    setIsSeriesTransition(isContinuation);
    setShowNextScreen(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- THE PORTAL GATE --- */}
      {viewMode === 'portal' && (
        <div className="fixed inset-0 z-[6000] portal-bg flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
           <div className="max-w-4xl p-16 md:p-24 border-2 border-theater-gold/30 relative overflow-hidden">
             <h1 className="font-ornate jat-insignia text-[120px] md:text-[200px] leading-none mb-6">JAT</h1>
             <p className="font-serif text-3xl md:text-5xl font-black uppercase italic tracking-[0.2em] mb-12">Enter the Portal</p>
             <button 
                onClick={() => { setViewMode('theater'); window.scrollTo(0,0); }}
                className="bg-theater-gold text-black px-16 py-6 font-black uppercase text-sm md:text-base tracking-[0.2em] hover:bg-theater-parchment transition-all shadow-[0_0_80px_rgba(212,175,55,0.4)]"
             >Open the Theatre Doors</button>
           </div>
           <p className="mt-12 text-[10px] uppercase font-black tracking-[0.8em] opacity-30 italic">TIMELESS STORIES • HESHY RIESEL</p>
        </div>
      )}

      {/* --- CHOOSE NEXT OVERLAY (SOLID - NO BLEED THROUGH) --- */}
      {showNextScreen && (
        <div className="fixed inset-0 z-[5000] bg-black flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-500">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-8 md:p-14 shadow-2xl border-t-[10px] border-theater-gold relative">
              <div className="text-center mb-12">
                 <h2 className="text-4xl md:text-8xl font-serif italic font-black uppercase mb-2 tracking-tighter">
                   {isSeriesTransition ? "The Story Continues" : "Choose Your Path"}
                 </h2>
                 <p className="text-[10px] uppercase font-black tracking-[0.4em] opacity-30 mt-4 leading-none">THE MAGGID'S VAULT</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {transitionList.map((ep, i) => (
                   <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group bg-white p-5 border-2 transition-all duration-500 ${i === 0 && isSeriesTransition ? 'border-theater-gold ring-8 ring-theater-gold/5 scale-105' : 'border-transparent grayscale hover:grayscale-0 opacity-80 hover:opacity-100'}`}>
                      <div className="relative aspect-square overflow-hidden mb-5">
                         <img src={ep.image} className="w-full h-full object-cover group-hover:scale-105 transition" />
                         {i === 0 && isSeriesTransition && <div className="absolute top-2 left-2 bg-theater-burgundy text-white px-3 py-1 font-black text-[9px] uppercase shadow-xl animate-pulse">UP NEXT</div>}
                      </div>
                      <h4 className="font-serif text-xl font-black italic uppercase leading-none tracking-tight">{ep.title}</h4>
                      {i === 0 && isSeriesTransition && <p className="mt-4 text-theater-gold font-black text-[11px] uppercase tracking-tighter">Next Part starts in {countdown}s</p>}
                   </div>
                 ))}
              </div>
              <button onClick={() => setShowNextScreen(false)} className="mt-12 text-[10px] font-black uppercase opacity-20 hover:opacity-100 transition tracking-[0.8em] block w-full text-center">Back to current production</button>
           </div>
        </div>
      )}

      {/* --- THE STAGE ROOT (The Web content) --- */}
      <div id="stage-root">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 px-6 md:px-12 flex items-center bg-theater-midnight/40 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-2xl md:text-3xl text-theater-gold leading-none italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-widest pt-1">
               <a href="#vault" className="text-theater-gold hover:text-white transition">The Vault</a>
               <button className="flex items-center gap-2 text-white/20 border border-white/5 px-6 py-2 tracking-widest opacity-30 cursor-not-allowed"> <Lock size={12}/> Entry Locked </button>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 text-white font-black hover:text-theater-gold transition leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_75%)] opacity-30 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7">
                <h2 className="text-6xl md:text-[115px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-10 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-14 py-8 font-black uppercase text-sm md:text-base tracking-[0.1em] hover:scale-110 transition shadow-2xl flex items-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32}/> : <Play size={32} fill="black"/>} START STORY
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-2xl grayscale" /></div>
            </div>
          </header>
        )}

        <section id="vault" className="bg-[#F5F2E8] text-[#02040A] py-32 px-6 md:px-12 border-y-[20px] border-[#02040A] shadow-inner">
           <div className="max-w-7xl mx-auto text-left">
              <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter mb-20 italic font-black border-b-[8px] border-black/5 pb-12 leading-none uppercase">The Vault</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="cursor-pointer group flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-black border-4 border-white group-hover:border-theater-gold transition duration-700">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition duration-1000" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={72} fill="#D4AF37" className="text-theater-gold" /></div>
                      </div>
                      <h4 className="text-3xl font-serif font-black italic tracking-tighter uppercase leading-none px-4">{ep.title}</h4>
                      <p className="text-[10px] font-black uppercase text-theater-burgundy mt-4 px-4 opacity-40 italic tracking-widest leading-none">A Heshy Riesel Selection</p>
                   </div>
                ))}
              </div>
           </div>
        </section>
      </div>

      {/* --- PERSISTENT CONTROLLER - EXEMPT FROM STAGE FILTERS --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold/50 px-6 md:px-12 py-10 md:py-16 z-[3000] shadow-[0_-30px_100px_#000] transition-all duration-700 ${duration - currentTime <= 60 && !showNextScreen ? 'bg-theater-burgundy' : 'bg-[#090D17]'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10 md:gap-14">
            
            {/* Real-time parent alert in controller */}
            {duration - currentTime <= 60 && !showNextScreen && <div className="w-full text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">1 Minute Alert • Finish in {Math.floor(duration - currentTime)}s</div>}

            <div className="w-full flex-1 flex flex-col gap-6">
              <div className="flex items-center gap-10">
                <span className="text-[11px] font-black text-theater-gold font-mono w-14 text-left">{formatTime(currentTime)}</span>
                <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
                <span className="text-[11px] font-black text-white/50 font-mono w-14 text-right">-{formatTime(duration - currentTime)}</span>
              </div>
              <div className="flex justify-between items-center gap-6">
                <div className="truncate text-left flex-1">
                  <h5 className="text-xl md:text-5xl font-serif text-theater-gold uppercase italic truncate font-black leading-none mb-1">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em]">Now on the stage • Timeless Stories</p>
                </div>
                <div className="flex items-center gap-6">
                  <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black' : 'bg-white/5 text-white/30'}`} title="Dim Theatre Lights">
                     <Lamp size={32}/>
                  </button>
                  <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 transition transform active:scale-95">
                     {isPlaying ? <Pause size={56}/> : <Play size={56} className="ml-2" fill="black" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
