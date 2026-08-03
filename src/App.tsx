import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, Library, 
  Mic2, CheckCircle2, Menu, Globe, Music, Share2, AlertCircle, Headphones, Lamp, Loader2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_gd_vFinal";

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
          title: item.querySelector("title")?.textContent || "Jewish Story",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 150) + "...",
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
      handleAutoPlay();
    }
    return () => clearInterval(timer);
  }, [showCurtain, countdown, nextEp]);

  const handleAutoPlay = () => {
    const target = nextEp;
    setNextEp(null);
    setShowCurtain(false);
    togglePlay(target);
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

    // SILENCE INTERCEPT: Skipps 6 seconds of recording dead-air
    if (!showCurtain && (dur - cur < 6)) {
      triggerSequence();
    }

    // PARENT CHIME
    if (!showCurtain && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59)) {
      if (!warned) {
        setWarned(true);
        new Audio(CHIME_URL).play().catch(() => {});
      }
    }
  };

  const triggerSequence = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const rootName = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();

    // Check Part 1 -> Part 2 Direction (Older Index to Newer Index)
    if (idx > 0) {
      const candidate = episodes[idx - 1];
      if (candidate.title.toLowerCase().includes(rootName)) {
        setNextEp(candidate);
        setShowCurtain(true);
        setCountdown(10);
        return;
      }
    }

    const randoms = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setRecs(randoms);
    setNextEp(null);
    setShowCurtain(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center"><Loader2 className="animate-spin text-theater-gold" size={40} /></div>;

  const timeLeft = Math.max(0, Math.floor(duration - currentTime));
  const isFinalMinute = duration > 0 && timeLeft <= 60 && !showCurtain;

  return (
    <div className="min-h-screen bg-theater-midnight text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- OPAQUE CURTAIN CALL (Z-INDEX 1000) --- */}
      {showCurtain && (
        <div className="fixed inset-0 z-[1000] bg-theater-midnight flex items-center justify-center p-4">
           <div className="max-w-4xl w-full bg-theater-parchment p-8 md:p-14 text-center shadow-[0_0_100px_#000] border-t-8 border-theater-gold">
              {nextEp ? (
                <div className="text-theater-midnight">
                   <p className="text-[10px] font-black uppercase text-theater-burgundy tracking-[0.5em] mb-4">The Tale Continues</p>
                   <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase mb-8 leading-none">THE STORY CONTINUES</h2>
                   <div className="flex flex-col md:flex-row items-center justify-center gap-10">
                      <img src={nextEp.image} className="w-48 h-48 object-cover border border-black/10 shadow-lg" alt="" />
                      <div className="text-left">
                        <p className="text-2xl font-serif font-black italic mb-4 leading-tight">{nextEp.title}</p>
                        <button onClick={handleAutoPlay} className="bg-theater-midnight text-theater-gold px-12 py-5 font-black uppercase text-xs hover:scale-105 transition shadow-xl">Begin Next Part ({countdown}s)</button>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="text-theater-midnight">
                  <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase mb-10 leading-none">Pick a New Adventure</h2>
                  <div className="grid md:grid-cols-3 gap-6">
                     {recs.map(r => (
                       <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group">
                          <img src={r.image} className="w-full aspect-square object-cover mb-4 border border-black/5 group-hover:scale-105 transition shadow-md" />
                          <p className="font-serif text-sm font-black italic leading-tight uppercase leading-none opacity-80">{r.title}</p>
                       </div>
                     ))}
                  </div>
                </div>
              )}
              <button onClick={() => setShowCurtain(false)} className="mt-14 uppercase font-black text-[10px] opacity-20 tracking-[0.5em] text-black">Close Curtain</button>
           </div>
        </div>
      )}

      {/* STAGE AREA (Filter: Blur and Darkness when Dimmed) */}
      <div className={isDimmed ? 'night-dim' : 'transition-all duration-1000'}>
        <nav className="fixed top-0 w-full z-[150] h-20 bg-theater-midnight/90 backdrop-blur-xl border-b border-white/5 flex items-center px-8 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-2xl md:text-3xl text-theater-gold leading-none italic font-black">Jewish Audio Theater</h1>
               <p className="text-[8px] md:text-[10px] uppercase font-black text-white opacity-40 mt-1 uppercase tracking-widest leading-none">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase pt-1 tracking-widest text-theater-gold">
              <a href="#vault">Vault</a>
              <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 font-black text-white uppercase opacity-70">Heshy Riesel • THE MAGGID</a>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        {episodes.length > 0 && (
          <header className="relative min-h-[90vh] md:min-h-screen flex items-center pt-24 px-8 text-left">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-30"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
              <div className="md:col-span-7">
                <h2 className="text-4xl md:text-7xl lg:text-[110px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white leading-none">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-12 opacity-30"></div>
                <p className="text-xl md:text-2xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-6 leading-relaxed">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-xs md:text-sm hover:bg-white transition shadow-2xl flex items-center gap-4">
                   <Play size={24} fill="black" /> START STORY
                </button>
              </div>
              <div className="hidden md:block md:col-span-5 relative"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-2xl grayscale" /></div>
            </div>
          </header>
        )}

        <section id="vault" className="bg-[#F5F2E8] text-theater-midnight py-32 px-10 border-y-[20px] border-theater-midnight">
          <div className="max-w-7xl mx-auto">
             <h3 className="text-5xl md:text-[160px] font-serif uppercase tracking-tighter border-b-8 border-black/10 pb-4 mb-24 italic leading-none text-center font-black">THE VAULT</h3>
             <div className="grid md:grid-cols-3 gap-16 md:gap-x-12">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="cursor-pointer group flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-8 shadow-2xl bg-black border-2 border-transparent group-hover:border-theater-gold transition duration-700">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition duration-500"><PlayCircle size={72} fill="#D4AF37" className="text-theater-midnight shadow-2xl"/></div>
                      </div>
                      <h4 className="text-2xl font-serif font-black uppercase italic leading-none leading-[0.8] mb-3 tracking-tighter">{ep.title}</h4>
                      <p className="text-[10px] font-black uppercase opacity-40 text-theater-burgundy">HESHY RIESEL • THE MAGGID</p>
                   </div>
                ))}
             </div>
          </div>
        </section>
      </div>

      {/* --- MASTER PLAYER BAR: IGNORES THE NIGHT DIMMER --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold px-6 md:px-12 py-10 md:py-16 z-[5000] shadow-[0_-30px_150px_#000] transition-all duration-700 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.6em] mb-4 animate-bounce">Parent Alert: {timeLeft}s to Finish</div>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/20 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 font-mono text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between gap-8 md:gap-20">
              <div className="flex items-center gap-6 text-left truncate flex-1 pr-6">
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border-2 border-white/20 shadow-2xl" />
                <div className="truncate">
                  <h5 className="text-xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase font-black text-white/40 mt-3 tracking-[0.2em] font-serif leading-none uppercase">HESHY RIESEL • THE MAGGID • TIMELESS STORIES</p>
                </div>
              </div>
              <div className="flex items-center gap-6 md:gap-12">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold' : 'bg-white/5 text-white/30 border-white/10'}`} title="Theater Dimmer">
                   <Lamp size={28}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300">
                  {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-1" fill="black" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 p-2 transition-all hover:text-white"><X size={32}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
