import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, ChevronRight, X, Mail, Bell, Library, 
  Mic2, CheckCircle2, Star, Menu, Globe, Music, Share2, AlertCircle, PlayCircle, Loader2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
// NEW CACHE KEY FORCES A TOTAL DATA RELOAD
const CACHE_KEY = "jat_full_rebuild_v10";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [storyComplete, setStoryComplete] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [warned, setWarned] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  useEffect(() => {
    async function loadTheater() {
      // CLEAR OLD DATA
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setEpisodes(JSON.parse(cached));
        setLoading(false);
      }

      try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`);
        const data = await res.json();
        const xml = new DOMParser().parseFromString(data.contents, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).map((item, i) => ({
          id: item.querySelector("guid")?.textContent || String(i),
          title: item.querySelector("title")?.textContent || "Timeless Story",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
          date: new Date(item.querySelector("pubDate")?.textContent || "").toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        }));
        
        setEpisodes(items);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) {
        setLoading(false);
      }
    }
    loadTheater();
  }, []);

  // Countdown Logic for Part 1 -> Part 2
  useEffect(() => {
    let timer: any;
    if (storyComplete && nextEp && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (storyComplete && nextEp && countdown === 0) {
      togglePlay(nextEp);
    }
    return () => clearInterval(timer);
  }, [storyComplete, countdown, nextEp]);

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setStoryComplete(false);
    setCountdown(10);
    setWarned(false);
    
    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play().catch(e => console.log("Play blocked"));
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (!activeEp) return;
    const currentIndex = episodes.findIndex(e => e.id === activeEp.id);
    
    // SERIES FLOW: Find Part 2 (Index - 1)
    if (currentIndex > 0) {
      const currentTitleRoot = activeEp.title.split('Part')[0].trim();
      const possibleNext = episodes[currentIndex - 1];
      
      if (possibleNext.title.includes(currentTitleRoot)) {
        setNextEp(possibleNext);
        setStoryComplete(true);
      } else {
        showRecs();
      }
    } else {
      showRecs();
    }
  };

  const showRecs = () => {
    const randomRecs = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setRecs(randomRecs);
    setNextEp(null);
    setStoryComplete(true);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(current);

    // PARENT CHIME: 60 Seconds Left
    if (dur > 65 && (dur - current <= 60.5 && dur - current >= 59.5) && !warned) {
      setWarned(true);
      const chime = new Audio(CHIME_URL);
      chime.volume = 0.5;
      chime.play().catch(e => console.log("Click page to enable chime"));
    }
  };

  if (loading && episodes.length === 0) return (
    <div className="h-screen bg-[#050A14] flex items-center justify-center text-[#D4AF37]">
      <Loader2 className="w-10 h-10 animate-spin" />
    </div>
  );

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60);

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans w-full overflow-x-hidden">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={handleEnded} preload="auto" />

      {/* CURTAIN CALL */}
      {storyComplete && (
        <div className="fixed inset-0 z-[200] bg-[#050A14]/98 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-700">
          <div className="max-w-4xl w-full bg-[#F5F2E8] p-8 md:p-12 text-center border-t-8 border-[#D4AF37] shadow-2xl">
            <CheckCircle2 size={48} className="text-[#4A0E0E] mx-auto mb-4" />
            <h2 className="text-[#050A14] font-serif text-3xl md:text-5xl uppercase mb-2 italic font-black">The Curtain Falls</h2>
            
            {nextEp ? (
              <div className="mt-8">
                <p className="text-[12px] uppercase font-black text-[#4A0E0E] mb-2 tracking-widest leading-none">Next Part starting in {countdown} seconds...</p>
                <p className="text-[#050A14] font-serif text-2xl md:text-4xl italic mb-10 font-black leading-tight">{nextEp.title}</p>
                <div className="w-64 h-2 bg-[#050A14]/10 mx-auto rounded-full overflow-hidden">
                   <div className="h-full bg-[#D4AF37] countdown-bar"></div>
                </div>
              </div>
            ) : (
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                {recs.map(r => (
                  <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group bg-white p-4 border border-black/5 text-left">
                    <img src={r.image} className="w-full aspect-square object-cover mb-4 group-hover:scale-105 transition" alt="" />
                    <p className="text-[#050A14] font-serif text-sm italic font-black leading-tight">{r.title}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setStoryComplete(false)} className="mt-12 text-[10px] font-black uppercase text-[#050A14]/40 hover:text-[#4A0E0E]">Return to Theater</button>
          </div>
        </div>
      )}

      {/* NAV - BRANDED & LEVELED */}
      <nav className="fixed top-0 w-full z-50 bg-[#050A14]/95 backdrop-blur-lg border-b border-[#D4AF37]/10 px-6 py-5 md:py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-full">
          <div className="flex flex-col text-left justify-center">
            <h1 className="font-serif text-xl md:text-3xl text-[#D4AF37] uppercase leading-none italic">Jewish Audio Theater</h1>
            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.4em] text-[#F5F2E8]/40 font-black mt-1 leading-none">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex items-center gap-10 text-[10px] font-black uppercase tracking-widest h-full">
            <a href="#vault" className="hover:text-[#D4AF37] transition pt-1">Vault</a>
            <a href="#casting" className="hover:text-[#D4AF37] transition pt-1 font-bold">Audition</a>
            <a href="#signup" className="bg-[#D4AF37] text-black px-6 py-2 transition hover:bg-white shadow-lg font-black tracking-tighter"><Bell size={12} className="inline mr-2" /> Alerts</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-[#D4AF37]"><Menu size={28} /></button>
        </div>
      </nav>

      {/* HERO SECTION */}
      {episodes.length > 0 && (
        <header className="relative min-h-screen flex items-center pt-24 px-6 md:px-12 overflow-hidden text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_70%)] opacity-40"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-20 relative z-10">
            <div className="md:col-span-7 flex flex-col justify-center">
              <h2 className="text-4xl sm:text-6xl md:text-8xl lg:text-[100px] font-serif leading-[0.9] mb-8 uppercase tracking-tighter italic font-black">{episodes[0].title}</h2>
              <p className="text-lg md:text-2xl font-light opacity-80 mb-10 max-w-xl italic border-l-2 border-[#D4AF37]/30 pl-6 text-white">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-[#D4AF37] text-black px-12 py-6 font-black uppercase text-sm hover:bg-[#F5F2E8] transition shadow-2xl flex items-center gap-4">
                {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                Enter Theater
              </button>
            </div>
            <div className="hidden md:block md:col-span-5 self-center">
              <img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-[#D4AF37]/10 shadow-2xl grayscale hover:grayscale-0 transition duration-1000" alt="" />
            </div>
          </div>
        </header>
      )}

      {/* VAULT */}
      <section id="vault" className="bg-[#F5F2E8] text-[#050A14] py-24 md:py-40 px-6 md:px-12 text-left">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-5xl md:text-9xl font-serif uppercase tracking-tighter border-b-4 border-[#050A14] pb-6 md:pb-12 mb-12 italic leading-none">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-y-32">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-6 md:mb-10 shadow-xl">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 bg-black/40">
                    <Play size={32} className="text-[#D4AF37]" />
                  </div>
                </div>
                <h4 className="text-2xl md:text-4xl font-serif uppercase leading-tight group-hover:text-[#4A0E0E] transition italic tracking-tighter font-black text-[#050A14]">{ep.title}</h4>
                <p className="mt-4 text-[9px] font-black uppercase text-[#4A0E0E] tracking-widest italic opacity-50">By Heshy Riesel</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <footer id="contact" className="py-24 md:py-40 px-6 bg-[#050A14] text-center border-t border-[#D4AF37]/10">
        <h2 className="text-3xl md:text-7xl font-serif uppercase tracking-tighter mb-8 text-[#D4AF37] italic">Contact</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-lg md:text-4xl font-black uppercase tracking-tighter hover:text-white transition break-words italic leading-none">Maggid@jewishaudiotheater.com</a>
        <div className="mt-16 flex justify-center gap-10 text-[#D4AF37]/30">
          <Globe size={24} /> <Music size={24} /> <Share2 size={24} />
        </div>
        <p className="mt-16 text-[8px] md:text-[10px] uppercase tracking-[0.4em] opacity-20 font-bold italic leading-none tracking-widest">© 2024 Heshy Riesel • Timeless Stories</p>
      </footer>

      {/* PLAYER BAR */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-[#D4AF37] px-4 md:px-8 py-6 md:py-10 z-[100] shadow-2xl transition-all duration-1000 ${isFinalMinute ? 'final-minute-warning' : 'bg-[#0A0F1B]'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-12">
            
            {isFinalMinute && (
              <div className="w-full flex items-center justify-center gap-2 text-[#D4AF37] font-black uppercase text-[10px] tracking-[0.3em] mb-1">
                <AlertCircle size={14} className="animate-bounce" /> 1 Minute Remaining
              </div>
            )}

            <div className="w-full flex items-center gap-4">
              <span className="text-[10px] font-black text-[#D4AF37] w-12 text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-1 bg-[#F5F2E8]/10 appearance-none cursor-pointer accent-[#D4AF37]" />
              <span className="text-[10px] font-black text-[#F5F2E8]/40 w-12 text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4 text-left truncate">
                <img src={activeEp.image} className="w-12 h-12 md:w-20 md:h-20 object-cover border border-[#D4AF37]/20 shadow-lg" alt="" />
                <div className="truncate">
                  <h5 className="text-sm md:text-2xl font-serif text-[#D4AF37] uppercase italic truncate tracking-tighter leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[9px] uppercase tracking-[0.4em] font-black opacity-30 italic leading-none tracking-widest">Heshy Riesel • Timeless Stories</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => togglePlay()} className="w-12 h-12 md:w-20 md:h-20 bg-[#D4AF37] rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-110 active:scale-95 transition">
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); audioRef.current?.pause(); }} className="text-white/20 p-2 hover:text-white"><X size={24} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
