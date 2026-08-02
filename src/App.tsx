import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, CheckCircle2, Menu, Globe, Music, Share2, AlertCircle, PlayCircle, Loader2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_vFinal";

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
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setEpisodes(JSON.parse(cached)); setLoading(false); }
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
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) { setLoading(false); }
    }
    loadTheater();
  }, []);

  // Continuity Countdown Engine
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
      audioRef.current.play();
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  // REFINED ENDING LOGIC (FUZZY SEARCH FOR SERIES)
  const handleEndedEarly = () => {
    setIsPlaying(false);
    if (!activeEp) return;
    const currentIndex = episodes.findIndex(e => e.id === activeEp.id);
    
    // FUZZY MATCH: Remove "Part X", "Episode X", etc.
    const getCleanName = (str: string) => str.replace(/part|episode|chapter|pt|\d+|:|--|-/gi, "").trim().toLowerCase();
    const currentSearchTerm = getCleanName(activeEp.title);

    // Look for a newer part (Index above current)
    if (currentIndex > 0) {
      const target = episodes[currentIndex - 1];
      const targetClean = getCleanName(target.title);
      
      // If titles contain the same unique character names (e.g. Stefan)
      if (targetClean.includes(currentSearchTerm) || currentSearchTerm.includes(targetClean)) {
        setNextEp(target);
        setStoryComplete(true);
        return;
      }
    }

    // Default: Pick something else from the Vault
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

    // SILENCE TRIM: End the show 3 seconds before the file actually ends
    if (dur > 10 && (dur - current < 3)) {
      handleEndedEarly();
    }

    // PARENT CHIME: 60 Seconds Left
    if (dur > 65 && (dur - current <= 60.5 && dur - current >= 58.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#050A14] flex items-center justify-center"><Loader2 className="animate-spin text-[#D4AF37]" /></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60);

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans w-full overflow-x-hidden">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* CURTAIN CALL */}
      {storyComplete && (
        <div className="fixed inset-0 z-[200] bg-[#050A14]/98 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-700">
          <div className="max-w-4xl w-full bg-[#F5F2E8] p-8 md:p-12 text-center border-t-8 border-[#D4AF37] shadow-2xl">
            <CheckCircle2 size={48} className="text-theater-burgundy mx-auto mb-4" />
            <h2 className="text-[#050A14] font-serif text-3xl md:text-5xl uppercase mb-2 italic font-black">The Curtain Falls</h2>
            
            {nextEp ? (
              <div className="mt-8">
                <p className="text-[12px] uppercase font-black text-[#4A0E0E] mb-2 tracking-[0.4em]">Next part starts in {countdown}s...</p>
                <p className="text-[#050A14] font-serif text-2xl md:text-4xl italic mb-10 font-black leading-none">{nextEp.title}</p>
                <div className="w-64 h-2 bg-[#050A14]/10 mx-auto rounded-full overflow-hidden">
                   <div className="h-full bg-theater-gold countdown-timer-bar"></div>
                </div>
              </div>
            ) : (
              <div className="mt-12">
                <p className="text-[#050A14] font-serif text-xl italic mb-10">Discover another adventure from the Vault:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {recs.map(r => (
                    <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group text-left bg-white p-4">
                      <img src={r.image} className="w-full aspect-square object-cover mb-4 group-hover:scale-105 transition" />
                      <p className="text-[#050A14] font-serif text-sm italic font-black uppercase leading-tight">{r.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setStoryComplete(false)} className="mt-12 text-[10px] font-black uppercase text-[#050A14]/30 hover:text-black">Return to Lobby</button>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-[#050A14]/95 border-b border-[#D4AF37]/10 px-6 py-6 h-14 md:h-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-full">
          <div className="flex flex-col text-left">
            <h1 className="font-serif text-xl md:text-3xl text-[#D4AF37] uppercase leading-none italic font-black">Jewish Audio Theater</h1>
            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.3em] text-[#F5F2E8]/40 font-black mt-1 leading-none">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex gap-10 items-center h-full pt-1 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <a href="#vault" className="hover:text-white transition">Vault</a>
            <a href="#casting" className="hover:text-white transition">Audition</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="hover:text-white transition font-bold">Contact</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-[#D4AF37]"><Menu size={32} /></button>
        </div>
        {isMenuOpen && <div className="md:hidden fixed inset-x-0 top-14 bg-[#050A14] p-10 flex flex-col items-center gap-6"><a href="#vault" onClick={() => setIsMenuOpen(false)}>Vault</a><a href="mailto:Maggid@jewishaudiotheater.com">Contact</a></div>}
      </nav>

      {/* STAGE */}
      {episodes.length > 0 && (
        <header className="relative min-h-screen flex items-center pt-24 px-8 text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_70%)] opacity-30"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 relative z-10 items-center">
            <div className="md:col-span-7">
              <h2 className="text-5xl sm:text-7xl lg:text-[110px] font-serif leading-[0.85] mb-10 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <p className="text-xl md:text-2xl font-light opacity-90 mb-12 italic border-l-2 border-[#D4AF37]/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-[#D4AF37] text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-sm hover:bg-[#F5F2E8] transition shadow-2xl flex items-center gap-4">
                {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                {activeEp && activeEp.id === episodes[0].id && isPlaying ? "Pause Story" : "Enter Theater"}
              </button>
            </div>
            <div className="hidden md:block md:col-span-5">
              <img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-[#D4AF37]/10 shadow-2xl grayscale" />
            </div>
          </div>
        </header>
      )}

      {/* VAULT */}
      <section id="vault" className="bg-[#F5F2E8] text-[#050A14] py-32 px-8 text-left">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-6xl md:text-9xl font-serif uppercase tracking-tighter border-b-4 border-black/10 pb-6 mb-20 italic leading-none">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-32">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl border border-black/10">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                    <Play size={48} className="text-[#D4AF37]" />
                  </div>
                </div>
                <h4 className="text-3xl font-serif uppercase leading-tight italic font-black text-theater-midnight tracking-tighter">{ep.title}</h4>
                <p className="mt-2 text-[9px] font-black uppercase text-theater-burgundy opacity-40">Heshy Riesel Authority</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <footer className="py-24 md:py-48 px-6 bg-[#050A14] text-center">
        <h2 className="text-4xl md:text-7xl font-serif uppercase tracking-tighter mb-10 text-[#D4AF37] italic">Contact</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition break-words">Maggid@jewishaudiotheater.com</a>
        <div className="mt-16 flex justify-center gap-12 text-[#D4AF37]/20">
          <Globe size={32} /> <Music size={32} /> <Share2 size={32} />
        </div>
        <p className="mt-20 text-[9px] uppercase tracking-[0.5em] opacity-30 italic leading-none font-bold">© 2024 Heshy Riesel • Timeless Stories Brought to Life</p>
      </footer>

      {/* PLAYER BAR */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-[#D4AF37] px-6 md:px-12 py-6 md:py-10 z-[100] shadow-[0_-20px_60px_rgba(0,0,0,0.9)] transition-all duration-700 ${isFinalMinute ? 'alert-red-visual' : 'bg-[#0A0F1B]'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
            {isFinalMinute && <div className="w-full text-center text-white font-black uppercase text-[12px] tracking-[0.3em] animate-bounce flex items-center justify-center gap-2"><AlertCircle size={20}/> 1 Minute Remaining</div>}
            
            <div className="w-full flex items-center gap-6">
              <span className="text-[11px] font-black text-theater-gold w-14 text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-1 bg-[#F5F2E8]/20 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[11px] font-black text-white/50 w-14 text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4 text-left truncate">
                <img src={activeEp.image} className="w-16 h-16 md:w-20 object-cover border border-[#D4AF37]/30 shadow-lg" alt="" />
                <div className="truncate">
                  <h5 className="text-sm md:text-2xl font-serif text-[#D4AF37] uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[9px] uppercase tracking-[0.4em] font-black opacity-30 italic">Heshy Riesel • Timeless Stories</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <button onClick={() => togglePlay()} className="w-14 h-14 md:w-20 bg-[#D4AF37] rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all">
                  {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 p-2 hover:text-white transition-all"><X size={28} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
