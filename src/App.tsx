import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vFinal_03";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCurtain, setShowCurtain] = useState(false);
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

  useEffect(() => {
    let timer: any;
    if (showCurtain && nextEp && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showCurtain && countdown === 0 && nextEp) {
      triggerNextStory();
    }
    return () => clearInterval(timer);
  }, [showCurtain, countdown, nextEp]);

  const triggerNextStory = () => {
    if (nextEp) {
      const target = nextEp;
      setNextEp(null);
      setShowCurtain(false);
      togglePlay(target);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowCurtain(false);
    setWarned(false);
    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play().catch(e => console.log(e));
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

    // SEAMLESS INTERCEPT: 10 Seconds Remaining
    if (!showCurtain && (dur - cur < 10)) {
      const idx = episodes.findIndex(e => e.id === activeEp.id);
      const root = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();

      if (idx > 0) {
        const newer = episodes[idx - 1]; // Search chronological newer part
        if (newer.title.toLowerCase().includes(root)) {
          setNextEp(newer);
        } else { getVaultRecs(); }
      } else { getVaultRecs(); }
      
      setCountdown(10);
      setShowCurtain(true);
      if(audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
    }

    // PARENT CHIME
    if (!showCurtain && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const getVaultRecs = () => {
    const s = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random());
    setRecs(s.slice(0, 3));
    setNextEp(null);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={48} /></div>;

  const timeLeft = Math.max(0, Math.floor(duration - currentTime));
  const isFinalMinute = duration > 0 && timeLeft <= 60 && !showCurtain;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden ${isDimmed ? 'is-dimmed' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- OPAQUE CURTAIN CALL (Above everything) --- */}
      {showCurtain && (
        <div className="fixed inset-0 z-[2000] bg-theater-midnight flex items-center justify-center p-4 animate-in fade-in duration-700">
           <div className="max-w-4xl w-full p-8 md:p-14 bg-theater-parchment text-theater-midnight shadow-2xl border-t-[10px] border-theater-gold overflow-y-auto max-h-screen">
              {nextEp ? (
                <div className="text-center">
                   <h2 className="text-4xl md:text-6xl font-serif italic font-black uppercase mb-10 tracking-tighter">THE STORY CONTINUES</h2>
                   <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                      <img src={nextEp.image} className="w-56 h-56 object-cover border shadow-xl" alt="" />
                      <div className="text-left flex flex-col gap-6">
                        <p className="text-3xl font-serif font-black italic leading-tight">{nextEp.title}</p>
                        <button onClick={triggerNextStory} className="bg-theater-midnight text-theater-gold px-12 py-5 font-black uppercase text-xs tracking-widest hover:scale-105 transition shadow-2xl flex items-center gap-2">
                           <FastForward size={16} fill="currentColor"/> Begin Next Part ({countdown}s)
                        </button>
                      </div>
                   </div>
                   <div className="w-64 h-1 bg-black/10 mx-auto mt-12 rounded-full overflow-hidden">
                      <div className="timer-bar-anim"></div>
                   </div>
                </div>
              ) : (
                <div className="text-center">
                   <h2 className="text-4xl md:text-6xl font-serif italic font-black uppercase mb-10 tracking-tighter">CHOOSE A NEW STORY</h2>
                   <p className="text-lg italic opacity-50 mb-10">This series is concluded. Discover a new adventure:</p>
                   <div className="grid md:grid-cols-3 gap-8">
                      {recs.map(r => (
                        <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group text-left">
                           <div className="relative aspect-square overflow-hidden mb-4 border border-black/5 shadow-md">
                             <img src={r.image} className="w-full h-full object-cover group-hover:scale-105 transition" alt="" />
                           </div>
                           <p className="font-serif text-sm font-black italic uppercase leading-none opacity-80 leading-tight">{r.title}</p>
                        </div>
                      ))}
                   </div>
                </div>
              )}
              <button onClick={() => setShowCurtain(false)} className="mt-14 uppercase font-black text-[10px] opacity-20 hover:opacity-100 transition tracking-[0.5em] text-black">Close Curtain</button>
           </div>
        </div>
      )}

      {/* --- STAGE LAYER (The rest of the site) --- */}
      <div id="stage-content" className="transition-all duration-1000">
        <nav className="fixed top-0 w-full z-[150] h-20 md:h-24 px-6 md:px-12 flex items-center border-b border-white/5 bg-theater-midnight/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left justify-center h-full">
               <h1 className="font-serif text-2xl md:text-3xl text-theater-gold leading-none italic font-black">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.3em] text-white opacity-40 mt-1 uppercase">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-widest h-full pt-1">
              <a href="#vault" className="text-theater-gold hover:text-white transition">Vault</a>
              <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 font-black text-white hover:text-theater-gold transition tracking-widest leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-30 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 items-center z-10">
              <div className="md:col-span-7 flex flex-col justify-center">
                <h2 className="text-5xl md:text-[110px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-10 opacity-30"></div>
                <p className="text-xl md:text-2xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-base hover:bg-theater-parchment transition shadow-2xl flex items-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} fill="black" />}
                  EXPERIENCE THEATER
                </button>
              </div>
              <div className="hidden md:block md:col-span-5 relative group"><img src={episodes[0].image} className="w-full aspect-square object-cover border-[10px] border-theater-gold/10 shadow-2xl grayscale transition duration-1000" /></div>
            </div>
          </header>
        )}

        {/* Vault Grid */}
        <section id="vault" className="bg-[#F5F2E8] text-theater-midnight py-32 px-10 border-y-[15px] border-[#02040A]">
          <div className="max-w-7xl mx-auto">
             <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter border-b-8 border-black/5 pb-6 mb-24 italic leading-none font-black opacity-90 text-center uppercase">The Vault</h3>
             <div className="grid md:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="cursor-pointer group flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-8 shadow-2xl border-4 border-transparent group-hover:border-theater-gold transition duration-700">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/50"><PlayCircle size={72} fill="#D4AF37" className="text-theater-midnight" /></div>
                      </div>
                      <h4 className="text-3xl font-serif font-black uppercase italic tracking-tighter leading-none mb-3">{ep.title}</h4>
                      <p className="text-[10px] font-black uppercase opacity-40 text-theater-burgundy">HESHY RIESEL • THE MAGGID</p>
                   </div>
                ))}
             </div>
          </div>
        </section>
      </div>

      {/* --- MASTER PLAYER: EXCLUDED FROM BLUR/DIMMER --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold px-6 md:px-12 py-10 md:py-14 z-[1000] shadow-[0_-30px_120px_#000] transition-all duration-1000 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">Parent Alert: Finishing in {timeLeft}s</div>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between gap-10">
              <div className="flex items-center gap-6 text-left truncate flex-1 pr-6">
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border border-white/20 shadow-xl" alt="" />
                <div className="truncate">
                  <h5 className="text-2xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase font-black text-white/40 mt-3 tracking-widest leading-none">HESHY RIESEL • THE MAGGID</p>
                </div>
              </div>
              
              <div className="flex items-center gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black' : 'bg-white/5 text-white/30 hover:border-theater-gold'}`}>
                   <Lamp size={28}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300">
                  {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-1" fill="black" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 p-2 hover:text-white transition-all"><X size={32}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
