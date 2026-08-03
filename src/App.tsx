import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, Library, CheckCircle2, Star, Menu, Globe, Music, Share2, AlertCircle, PlayCircle, Loader2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_stable_maggid_v1";

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
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 200) + "...",
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

  // Continuity Countdown (10s between Parts)
  useEffect(() => {
    let timer: any;
    if (storyComplete && nextEp && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (storyComplete && nextEp && countdown === 0) {
      handleAutoPlay();
    }
    return () => clearInterval(timer);
  }, [storyComplete, countdown, nextEp]);

  const handleAutoPlay = () => {
    const target = nextEp;
    setNextEp(null);
    setStoryComplete(false);
    togglePlay(target);
  };

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
      audioRef.current.play().catch(e => console.log("User must interact first"));
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleEndedEarly = () => {
    setIsPlaying(false);
    if (!activeEp) return;
    const currentIndex = episodes.findIndex(e => e.id === activeEp.id);
    
    // Look for next chronological part (Higher on Podbean list = Newer part)
    const currentRoot = activeEp.title.split(/Part|Chapter/i)[0].trim().toLowerCase();
    if (currentIndex > 0) {
      const candidate = episodes[currentIndex - 1];
      if (candidate.title.toLowerCase().includes(currentRoot)) {
        setNextEp(candidate);
        setStoryComplete(true);
        return;
      }
    }
    
    // If not a series part, show standard curtains with recommendations
    const randomRecs = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setRecs(randomRecs);
    setNextEp(null);
    setStoryComplete(true);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur) return;
    setCurrentTime(cur);

    // DYNAMIC PARENTAL CHIME: 60 Seconds remaining
    if (dur > 65 && (dur - cur <= 60.5 && dur - cur >= 59) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }

    // SILENCE SKIP: Cut 3 seconds before end to skip Podbean dead-air
    if (dur > 10 && (dur - cur < 3)) {
      handleEndedEarly();
    }
  };

  if (loading && episodes.length === 0) return (
    <div className="h-screen bg-[#050A14] flex items-center justify-center">
      <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
    </div>
  );

  const timeLeft = Math.max(0, Math.floor(duration - currentTime));
  const isFinalMinute = duration > 0 && timeLeft <= 60;

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans selection:bg-[#4A0E0E]">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* STABLE OVERLAY (Replaced Jumbled Curtain) */}
      {storyComplete && (
        <div className="fixed inset-0 z-[500] bg-[#050A14]/98 flex items-center justify-center p-6 animate-in fade-in duration-700">
          <div className="max-w-4xl w-full bg-[#F5F2E8] p-8 md:p-14 text-center border-t-8 border-[#D4AF37] shadow-2xl">
            <CheckCircle2 size={48} className="text-[#4A0E0E] mx-auto mb-4" />
            <h2 className="text-[#050A14] font-serif text-3xl md:text-5xl uppercase mb-6 font-black italic">The Story Concludes</h2>
            
            {nextEp ? (
              <div className="animate-pulse">
                <p className="text-[12px] uppercase font-black text-[#4A0E0E] mb-2 tracking-[0.4em]">Continuity Alert</p>
                <p className="text-[#050A14] font-serif text-2xl italic mb-6">Starting next chapter in {countdown}s...</p>
                <button onClick={handleAutoPlay} className="bg-[#050A14] text-[#D4AF37] px-10 py-4 font-black uppercase text-xs">Play {nextEp.title}</button>
              </div>
            ) : (
              <div>
                <p className="text-[#050A14] font-serif text-xl italic mb-10 opacity-70 px-4">The tale has ended. Choose a new adventure below:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {recs.map(r => (
                    <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group text-left">
                       <img src={r.image} className="w-full aspect-square object-cover mb-4 group-hover:scale-105 transition shadow-lg border border-black/5" />
                       <p className="text-[#050A14] font-serif text-sm font-black italic uppercase leading-none">{r.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setStoryComplete(false)} className="mt-14 text-[10px] uppercase font-black opacity-20 tracking-[0.3em] hover:opacity-100 transition">Return to Vault</button>
          </div>
        </div>
      )}

      {/* HEADER: LEVELED */}
      <nav className="fixed top-0 w-full z-[150] h-20 md:h-24 px-6 md:px-12 flex items-center border-b border-[#D4AF37]/10 bg-[#050A14]/90 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
          <div className="flex flex-col text-left justify-center">
             <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black">Jewish Audio Theater</h1>
             <p className="text-[8px] md:text-[10px] uppercase font-black tracking-[0.4em] text-white opacity-40 mt-1 uppercase">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-widest pt-1">
            <a href="#vault" className="text-theater-gold hover:text-white transition">The Vault</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 text-theater-gold hover:text-white transition">Heshy Riesel • THE MAGGID</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold pt-1"><Menu size={32}/></button>
        </div>
      </nav>

      {/* HERO SECTION */}
      {episodes.length > 0 && (
        <header id="stage" className="relative min-h-screen flex items-center pt-24 px-8 text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_75%)] opacity-40"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-20 relative z-10">
            <div className="md:col-span-7 flex flex-col justify-center">
              <h2 className="text-5xl md:text-[105px] font-serif leading-[0.85] mb-8 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <p className="text-xl md:text-2xl font-light opacity-80 mb-12 max-w-xl italic border-l-2 border-[#D4AF37]/20 pl-6 text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-[#D4AF37] text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-xs md:text-sm hover:bg-[#F5F2E8] transition shadow-2xl flex items-center gap-4">
                {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                {activeEp && activeEp.id === episodes[0].id && isPlaying ? "Pause Production" : "EXPERIENCE THEATER"}
              </button>
            </div>
            <div className="hidden md:block md:col-span-5 self-center">
              <img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-[#D4AF37]/10 shadow-2xl grayscale" alt="Production Cover" />
            </div>
          </div>
        </header>
      )}

      {/* VAULT SECTION */}
      <section id="vault" className="bg-[#F5F2E8] text-[#050A14] py-32 px-6 md:px-12 border-y-[12px] border-theater-midnight">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter border-b-4 border-black/5 pb-8 mb-24 italic leading-none font-black opacity-90 text-left">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col text-left" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl border border-black/5">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 bg-black/40">
                    <div className="w-16 h-16 bg-[#D4AF37] rounded-full flex items-center justify-center text-black shadow-xl"><Play size={32} /></div>
                  </div>
                </div>
                <h4 className="text-3xl md:text-4xl font-serif uppercase leading-tight italic font-black">{ep.title}</h4>
                <p className="mt-4 text-[9px] uppercase font-black opacity-50 tracking-[0.2em] text-[#4A0E0E]">Heshy Riesel • THE MAGGID</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-24 md:py-48 px-8 bg-[#050A14] text-center border-t border-[#D4AF37]/10">
        <h2 className="text-4xl md:text-7xl font-serif uppercase tracking-tighter mb-8 text-theater-gold italic">Contact Heshy Riesel</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-4xl font-black uppercase tracking-tighter hover:text-white transition italic break-words">Maggid@jewishaudiotheater.com</a>
        <div className="mt-16 flex justify-center gap-10 text-[#D4AF37]/30">
          <Globe size={24} /> <Music size={24} /> <Share2 size={24} />
        </div>
        <p className="mt-16 text-[8px] md:text-[10px] uppercase tracking-[0.4em] opacity-20 font-bold uppercase">© 2024 Heshy Riesel • THE MAGGID • Official Archive</p>
      </footer>

      {/* MASTER TRACKER BAR - DYNAMIC DURATION LOGIC */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-[#D4AF37] px-6 md:px-12 py-10 md:py-16 z-[200] shadow-[0_-30px_80px_#000] transition-all duration-700 ${isFinalMinute ? 'final-minute-pulse' : 'bg-[#090D17]'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-12">
            
            {isFinalMinute && (
              <div className="w-full flex items-center justify-center gap-2 text-white font-black uppercase text-[12px] tracking-[0.5em] mb-2 animate-bounce">
                <AlertCircle size={20} /> Finishing In: {timeLeft}s • Parental Monitor Active
              </div>
            )}

            <div className="w-full flex items-center gap-8">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input 
                type="range" min="0" max={duration || 0} value={currentTime} 
                onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} 
                className="flex-1 h-2 bg-white/10 appearance-none accent-[#D4AF37] cursor-pointer" 
              />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-6 text-left truncate flex-1 pr-10">
                <img src={activeEp.image} className="w-16 h-16 md:w-28 md:h-20 object-cover border border-[#D4AF37]/20 shadow-lg" alt="" />
                <div className="truncate">
                  <h5 className="text-lg md:text-3xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[9px] uppercase tracking-[0.4em] font-black opacity-30 mt-1 italic uppercase">Heshy Riesel • THE MAGGID</p>
                </div>
              </div>
              <button onClick={() => togglePlay()} className="w-14 h-14 md:w-24 md:h-24 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl transition hover:scale-110 active:scale-95">
                {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
