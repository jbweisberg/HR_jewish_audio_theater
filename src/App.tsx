import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_maggid_master_v3";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDimmed, setIsDimmed] = useState(false);
  
  // Transition States
  const [showOverlay, setShowOverlay] = useState(false);
  const [transitionList, setTransitionList] = useState<any[]>([]);
  const [isSequelTransition, setIsSequelTransition] = useState(false);
  const [warned, setWarned] = useState(false);
  
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

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowOverlay(false);
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

    // 15-SECOND BRIDGE: Bring up choices but keep audio playing
    if (!showOverlay && (dur - cur <= 15) && (dur - cur > 1)) {
      prepareChoices();
    }

    // 60-SECOND WARNING: Parental Alarm
    if (!showOverlay && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const prepareChoices = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const rootName = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    let choices: any[] = [];
    
    // Find Next Part (Index reduction in newest-first feed)
    const sequel = idx > 0 ? episodes[idx - 1] : null;
    const isActuallySequel = sequel && sequel.title.toLowerCase().includes(rootName);

    if (isActuallySequel) {
      choices.push(sequel); // Position 1: The Continuation
      setIsSequelTransition(true);
    } else {
      setIsSequelTransition(false);
    }

    // Fill remaining slots with random stories from Vault
    const others = episodes
      .filter(e => e.id !== activeEp.id && (isActuallySequel ? e.id !== sequel.id : true))
      .sort(() => 0.5 - Math.random())
      .slice(0, isActuallySequel ? 2 : 3);
    
    setTransitionList([...choices, ...others]);
    setShowOverlay(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={48} /></div>;

  const timeLeft = Math.max(0, Math.floor(duration - currentTime));
  const isFinalMinute = duration > 0 && timeLeft <= 60 && !showOverlay;

  return (
    <div className="min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={() => setIsPlaying(false)} preload="auto" />

      {/* --- G-D MOVE TRANSITION OVERLAY: 15S BEFORE END --- */}
      {showOverlay && (
        <div className="fixed inset-0 z-[2000] bg-theater-midnight/98 flex items-center justify-center p-4 animate-in fade-in duration-700">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-8 md:p-14 shadow-2xl border-t-[10px] border-theater-gold relative">
              <div className="text-center mb-12">
                 <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase mb-2 tracking-tighter">
                   {isSequelTransition ? "THE STORY CONTINUES" : "THE STORY CONCLUDES"}
                 </h2>
                 <p className="text-sm font-black uppercase tracking-[0.4em] opacity-40">
                   {isSequelTransition ? "Select the next part below to continue" : "Choose your next adventure from the vault"}
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {transitionList.map((ep, index) => (
                   <div 
                    key={ep.id} 
                    onClick={() => togglePlay(ep)} 
                    className={`cursor-pointer group p-5 transition-all duration-300 border-2 ${index === 0 && isSequelTransition ? 'bg-white border-theater-gold ring-8 ring-theater-gold/5 shadow-2xl' : 'bg-white/50 border-black/5 shadow-md'}`}
                   >
                      <div className="relative aspect-square mb-5 overflow-hidden">
                         <img src={ep.image} className="w-full h-full object-cover group-hover:scale-105 transition" alt="" />
                         {index === 0 && isSequelTransition && (
                           <div className="absolute top-2 left-2 bg-theater-burgundy text-white px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-xl">NEXT PART</div>
                         )}
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition">
                            <PlayCircle size={48} className="text-white" fill="black" />
                         </div>
                      </div>
                      <p className="font-serif text-lg md:text-xl font-black italic uppercase leading-none tracking-tight text-theater-midnight line-clamp-2">{ep.title}</p>
                      <p className="mt-3 text-[10px] font-bold uppercase opacity-30 text-theater-burgundy">{index === 0 && isSequelTransition ? "CONTINUE CHAPTER" : "START NEW TALE"}</p>
                   </div>
                 ))}
              </div>

              <div className="mt-14 flex items-center justify-between border-t border-black/5 pt-8">
                <p className="text-[11px] font-black uppercase opacity-20 tracking-widest italic leading-none">Audio is currently playing in the background...</p>
                <button onClick={() => setShowOverlay(false)} className="bg-theater-midnight text-theater-gold px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-theater-burgundy transition shadow-lg">Back to Stage</button>
              </div>
           </div>
        </div>
      )}

      {/* --- BACKGROUND CONTENT --- */}
      <div className={isDimmed ? 'dimmed-stage' : 'transition-all duration-1000'}>
        <nav className="fixed top-0 w-full z-[150] h-20 md:h-24 px-6 md:px-12 flex items-center border-b border-white/5 bg-theater-midnight/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left pt-1">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.2em] text-white opacity-40 mt-1 leading-none uppercase">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase pt-1 tracking-widest text-theater-gold">
              <a href="#vault">Vault</a>
              <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-10 font-black text-white hover:text-theater-gold transition leading-none">Heshy Riesel • THE MAGGID</a>
            </div>
          </div>
        </nav>

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
              <div className="hidden md:block md:col-span-5 relative"><img src={episodes[0].image} className="w-full aspect-square object-cover border-[10px] border-theater-gold/10 shadow-2xl grayscale transition duration-1000" alt="" /></div>
            </div>
          </header>
        )}

        <section id="vault" className="bg-[#F5F2E8] text-theater-midnight py-32 px-10 border-y-[15px] border-[#02040A]">
          <div className="max-w-7xl mx-auto">
             <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter border-b-8 border-black/5 pb-4 mb-24 italic font-black opacity-90 text-center uppercase">The Vault</h3>
             <div className="grid md:grid-cols-3 gap-16 md:gap-x-12">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="group cursor-pointer flex flex-col text-left" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-8 shadow-2xl border-4 border-transparent group-hover:border-theater-gold transition duration-700">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={72} fill="#D4AF37" className="text-theater-midnight" /></div>
                      </div>
                      <h4 className="text-2xl font-serif font-black italic tracking-tighter uppercase leading-none">{ep.title}</h4>
                      <p className="text-[10px] font-black uppercase text-theater-burgundy opacity-40 mt-4 leading-none">HESHY RIESEL • THE MAGGID</p>
                   </div>
                ))}
             </div>
          </div>
        </section>
      </div>

      {/* --- MASTER PLAYER BAR --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold px-6 md:px-12 py-10 md:py-16 z-[1000] shadow-[0_-30px_120px_#000] transition-all duration-700 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce flex items-center justify-center gap-2"><AlertCircle size={20}/> Parental Alert: Finishing in {timeLeft}s</div>}
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 font-mono text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            <div className="w-full flex items-center justify-between gap-10">
              <div className="flex items-center gap-6 text-left truncate flex-1">
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border border-white/20" alt="" />
                <div className="truncate">
                  <h5 className="text-2xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase font-black text-white/40 mt-3 leading-none tracking-widest">HESHY RIESEL • THE MAGGID • TIMELESS STORIES</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_40px_#D4AF3744]' : 'bg-white/5 text-white/20 hover:border-theater-gold'}`}>
                   <Lamp size={32}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 transition transform -rotate-1">
                  {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-1" fill="black" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
