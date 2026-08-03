import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, Library, 
  CheckCircle2, Star, Menu, Globe, Music, Share2, AlertCircle, Headphones, ArrowRight, Lamp, FastForward
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_curtain_V3_FINAL";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [showCurtains, setShowCurtains] = useState(false);
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

  // Series Autoplay Timer Logic
  useEffect(() => {
    let timer: any;
    if (showCurtains && nextEp && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showCurtains && countdown === 0 && nextEp) {
      triggerNextChapter();
    }
    return () => clearInterval(timer);
  }, [showCurtains, countdown, nextEp]);

  const triggerNextChapter = () => {
    if (nextEp) {
      const story = nextEp;
      setNextEp(null);
      setShowCurtains(false);
      togglePlay(story);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowCurtains(false);
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

    // G-D MOVE INTERCEPT: 8 Seconds left skip silcence
    if (!showCurtains && (dur - cur < 8)) {
      const currentIndex = episodes.findIndex(e => e.id === activeEp.id);
      const cleanCurrentTitle = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();

      // Look back for "Stefan Part 2" (Newest episodes have lowest Index)
      if (currentIndex > 0) {
        const nextPartCandidate = episodes[currentIndex - 1];
        if (nextPartCandidate.title.toLowerCase().includes(cleanCurrentTitle)) {
          setNextEp(nextPartCandidate);
        } else { getNewStoryRecs(); }
      } else { getNewStoryRecs(); }
      
      setCountdown(10);
      setShowCurtains(true);
      if(audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
    }

    // 1 MINUTE WARNING
    if (!showCurtains && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const getNewStoryRecs = () => {
    const randoms = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setRecs(randoms);
    setNextEp(null);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center"><Loader2 className="animate-spin text-theater-gold" size={40} /></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60) && !showCurtains;

  return (
    <div className="min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* THE MASTER VELVET CURTAINS - NO BLEED THROUGH */}
      {showCurtains && (
        <div className="fixed inset-0 z-[600] flex overflow-hidden">
          {/* Panels slide shut to form 100% opaque wall */}
          <div className="w-1/2 h-full velvet-solid animate-in slide-in-from-left duration-700 flex flex-col items-end justify-center pr-12">
             <div className="jat-insignia text-[200px] leading-none opacity-40">J</div>
          </div>
          <div className="w-1/2 h-full velvet-solid animate-in slide-in-from-right duration-700 flex flex-col items-start justify-center pl-4 translate-y-20 md:translate-y-40">
             <div className="jat-insignia text-[180px] leading-none">AT</div>
          </div>

          {/* TRANSITION OVERLAY */}
          <div className="absolute inset-0 z-50 flex items-center justify-center animate-in fade-in duration-1000 p-6">
            <div className="max-w-4xl w-full p-8 md:p-14 bg-theater-parchment text-theater-midnight shadow-2xl border-t-[10px] border-theater-gold">
               {nextEp ? (
                 <div className="text-center">
                    <p className="text-xs uppercase font-black tracking-[0.4em] mb-4 text-theater-burgundy">The Tale Continues...</p>
                    <h2 className="text-3xl md:text-5xl font-serif italic font-black uppercase mb-10 leading-tight">{nextEp.title}</h2>
                    <div className="flex flex-col items-center gap-6">
                       <button onClick={triggerNextChapter} className="bg-theater-midnight text-theater-gold px-12 py-5 font-black uppercase text-sm tracking-widest hover:scale-105 transition shadow-2xl flex items-center gap-2">
                          <Play size={18} fill="currentColor"/> Next Part Starting in {countdown}s
                       </button>
                       <div className="w-64 h-1.5 bg-black/5 rounded-full overflow-hidden">
                          <div className="timer-drain"></div>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="text-center">
                    <CheckCircle2 size={40} className="mx-auto mb-6 text-theater-burgundy opacity-40" />
                    <h2 className="text-3xl md:text-6xl font-serif italic font-black mb-10">Choose a New Adventure</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                       {recs.map(r => (
                         <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group text-left">
                            <div className="relative aspect-square overflow-hidden mb-4 shadow-lg border border-black/10">
                              <img src={r.image} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            </div>
                            <p className="font-serif text-sm font-black italic uppercase leading-none opacity-80">{r.title}</p>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
               <button onClick={() => setShowCurtains(false)} className="mt-12 text-[10px] uppercase font-black tracking-[0.6em] opacity-40 hover:opacity-100 transition">Return to Library</button>
            </div>
          </div>
        </div>
      )}

      {/* BACKGROUND CONTENT: BLURS WHEN DIMMED */}
      <div className={isDimmed ? 'stage-hidden' : 'transition-all duration-1000'}>
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-theater-midnight/60 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-2xl md:text-3xl text-theater-gold leading-none italic font-black uppercase tracking-tighter">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.3em] text-white opacity-40 mt-1">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-widest pt-2">
              <a href="#vault" className="text-theater-gold hover:text-white">The Vault</a>
              <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 text-theater-gold hover:text-white">Heshy Riesel</a>
            </div>
          </div>
        </nav>

        <header className="relative min-h-[100dvh] flex items-center pt-24 px-8 overflow-hidden text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-30"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 items-center z-10">
            <div className="md:col-span-7">
              <h2 className="text-5xl md:text-9xl lg:text-[110px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0]?.title}</h2>
              <p className="text-xl md:text-3xl font-light opacity-80 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-sm hover:bg-[#F5F2E8] transition shadow-2xl flex items-center gap-6">
                <Play size={24} fill="black" /> EXPERIENCE THEATER
              </button>
            </div>
            <div className="hidden md:block md:col-span-5"><img src={episodes[0]?.image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-2xl grayscale" /></div>
          </div>
        </header>

        <section id="vault" className="bg-[#F5F2E8] text-[#02040A] py-32 px-6 md:px-12 border-y-[15px] border-[#02040A]">
          <div className="max-w-7xl mx-auto text-left">
            <h3 className="text-6xl md:text-[160px] font-serif uppercase tracking-tighter border-b-8 border-theater-midnight pb-8 mb-24 italic leading-none font-black opacity-95">The Vault</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-y-40">
              {episodes.length > 1 && episodes.slice(1).map((ep) => (
                <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                  <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl">
                    <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><Play size={64} fill="#D4AF37" className="text-theater-gold" /></div>
                  </div>
                  <h4 className="text-3xl md:text-4xl font-serif uppercase leading-[1] italic font-black text-[#02040A] tracking-tighter">{ep.title}</h4>
                  <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase text-theater-burgundy opacity-30"><span>Join Adventure</span><ArrowRight size={10}/></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* --- MASTER THEATER LANTERNS (Visible always, ignored by blur) --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold/40 px-6 md:px-12 py-10 md:py-14 z-[500] shadow-[0_-30px_100px_rgba(0,0,0,1)] transition-all duration-1000 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">1 Minute Left • Parental Monitor Active</div>}
            
            <div className="flex items-center gap-8 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between gap-6 md:gap-10">
              <div className="flex items-center gap-4 text-left truncate flex-1 pr-6">
                <img src={activeEp.image} className="w-14 h-14 md:w-24 md:h-24 object-cover border-2 border-white/20" alt="" />
                <div className="truncate">
                  <h5 className="text-lg md:text-3xl lg:text-4xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black tracking-tighter">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase font-black text-white/30 italic mt-2 leading-none uppercase">Heshy Riesel • Timeless Stories</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`hidden sm:flex items-center justify-center p-5 rounded-full transition-all border ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_20px_rgba(212,175,55,0.4)]' : 'bg-transparent text-white/20 border-white/10'}`} title="Theater Dimmer">
                   <Lamp size={24}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-24 md:h-24 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300">
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
