import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_v60";

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

  // Countdown Process
  useEffect(() => {
    let timer: any;
    if (showCurtains && nextEp && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showCurtains && countdown === 0 && nextEp) {
      goToNext();
    }
    return () => clearInterval(timer);
  }, [showCurtains, countdown, nextEp]);

  const goToNext = () => {
    const story = nextEp;
    setNextEp(null);
    setShowCurtains(false);
    togglePlay(story);
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
      audioRef.current.play().catch(() => {});
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(() => {});
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur) return;
    setCurrentTime(cur);

    // SILENCE INTERCEPT: 8 seconds left skips recorded silence
    if (!showCurtains && (dur - cur < 8)) {
      findContinuity();
    }

    // PARENTAL WARNING
    if (!showCurtains && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const findContinuity = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const rootName = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    
    // Part 1 is newer part in index list? Step up.
    if (idx > 0) {
      const older = episodes[idx - 1]; // This is effectively "newer" Part 2
      if (older.title.toLowerCase().includes(rootName)) {
        setNextEp(older);
      } else { getNewSeries(); }
    } else { getNewSeries(); }

    setCountdown(10);
    setShowCurtains(true);
    if(audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
  };

  const getNewSeries = () => {
    const s = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0.5 - Math.random()).slice(0, 3);
    setRecs(s);
    setNextEp(null);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center"><Loader2 className="animate-spin text-theater-gold" size={40} /></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60) && !showCurtains;

  return (
    <div className={`min-h-screen bg-theater-midnight text-[#F5F2E8] font-sans overflow-x-hidden ${isDimmed ? 'is-dimmed' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />
      
      {/* THE DIMMER LANTERN */}
      <div id="bedtime-overlay"></div>

      {/* --- THE GRAND VELVET CURTAIN (Z-INDEX OVERRIDE) --- */}
      {showCurtains && (
        <div className="fixed inset-0 z-[1000] flex overflow-hidden">
          <div className="w-1/2 h-full curtain-v animate-in slide-in-from-left duration-700 border-r border-theater-gold/10 flex items-center justify-end pr-8">
            <span className="jat-insignia font-serif text-[120px] md:text-[200px] select-none leading-none tracking-tighter uppercase font-black opacity-30">JA</span>
          </div>
          <div className="w-1/2 h-full curtain-v animate-in slide-in-from-right duration-700 border-l border-theater-gold/10 flex items-center justify-start pl-4 translate-y-24 md:translate-y-32">
             <span className="jat-insignia font-serif text-[120px] md:text-[200px] select-none leading-none tracking-tighter uppercase font-black">T</span>
          </div>

          <div className="absolute inset-0 z-[1100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
             <div className="max-w-4xl w-full p-8 md:p-14 bg-theater-parchment text-theater-midnight shadow-2xl border-t-[10px] border-theater-gold">
               {nextEp ? (
                 <div>
                    <p className="text-xs uppercase font-black tracking-[0.5em] mb-4 text-theater-burgundy opacity-40">Production Continuing...</p>
                    <h2 className="text-3xl md:text-5xl font-serif italic font-black uppercase mb-10 tracking-tighter leading-tight">{nextEp.title}</h2>
                    <div className="flex flex-col items-center gap-6">
                       <button onClick={goToNext} className="bg-theater-midnight text-theater-gold px-12 py-5 font-black uppercase text-xs tracking-widest hover:scale-105 transition shadow-2xl flex items-center gap-4">
                          <FastForward size={16} fill="currentColor"/> Next Part Begins in {countdown}s
                       </button>
                       <div className="w-48 h-1 bg-black/5 rounded-full overflow-hidden">
                          <div className="timer-drain progress-shrink"></div>
                       </div>
                    </div>
                 </div>
               ) : (
                 <div>
                    <h2 className="text-3xl md:text-6xl font-serif italic font-black mb-10 uppercase tracking-tighter">Choose a New Story</h2>
                    <div className="grid md:grid-cols-3 gap-6 md:gap-10">
                       {recs.map(r => (
                         <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group text-left">
                            <img src={r.image} className="w-full aspect-square object-cover mb-4 shadow-md group-hover:scale-105 transition" alt="" />
                            <p className="font-serif text-sm font-black italic uppercase leading-none opacity-80">{r.title}</p>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
               <button onClick={() => setShowCurtains(false)} className="mt-12 text-[10px] uppercase font-black opacity-30 tracking-[0.4em] hover:text-black transition">Stay in the Lobby</button>
             </div>
          </div>
        </div>
      )}

      {/* --- NAVIGATION: HORIZONTALLY LEVELED FOR LAPTOP --- */}
      <nav className="fixed top-0 w-full z-[150] h-20 md:h-24 px-6 md:px-12 flex items-center border-b border-white/5 bg-theater-midnight/90 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex flex-col text-left justify-center h-full">
             <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black uppercase tracking-tighter">Jewish Audio Theater</h1>
             <p className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.3em] text-white opacity-40 mt-1">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex items-center gap-12 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] pt-2">
            <a href="#vault" className="hover:text-white transition">The Vault</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 font-black hover:text-white transition">Heshy Riesel Direct</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold"><Menu size={32}/></button>
        </div>
        {isMenuOpen && <div className="md:hidden absolute inset-x-0 top-full bg-theater-midnight p-10 flex flex-col items-center gap-8 border-b border-theater-gold/10 z-[200]"><a href="#vault" className="text-3xl font-serif">Vault</a><a href="mailto:Maggid@jewishaudiotheater.com" className="text-3xl font-serif">Contact</a></div>}
      </nav>

      {/* HERO SECTION */}
      {episodes.length > 0 && (
        <header className="relative min-h-[100dvh] flex items-center pt-24 px-8 text-left z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-30 pointer-events-none"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-24 items-center">
            <div className="md:col-span-7">
              <h2 className="text-5xl md:text-8xl lg:text-[115px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <div className="h-1 w-20 bg-theater-gold mb-10 opacity-30"></div>
              <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-xs md:text-sm hover:bg-[#F5F2E8] transition shadow-2xl flex items-center gap-4">
                <Play size={24} fill="black" /> START STORY
              </button>
            </div>
            <div className="hidden md:block md:col-span-5">
              <img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] grayscale" />
            </div>
          </div>
        </header>
      )}

      {/* VAULT SECTION */}
      <section id="vault" className="relative z-10 bg-[#F5F2E8] text-theater-midnight py-32 px-6 md:px-12 border-y-[15px] border-[#02040A]">
        <div className="max-w-7xl mx-auto text-left">
          <h3 className="text-6xl md:text-[160px] font-serif uppercase tracking-tighter border-b-8 border-black/5 pb-8 mb-24 italic leading-none font-black opacity-90 text-theater-midnight">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-32">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 bg-black/40"><Play size={64} fill="#D4AF37" className="text-theater-gold" /></div>
                </div>
                <h4 className="text-3xl md:text-4xl font-serif uppercase italic font-black leading-tight tracking-tighter">{ep.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-48 bg-theater-midnight text-center z-10 relative">
        <h2 className="text-3xl md:text-8xl font-serif uppercase tracking-tighter mb-10 text-theater-gold italic font-black">Contact Heshy</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-xl md:text-5xl font-black uppercase tracking-tighter hover:text-white transition italic block leading-none px-6">Maggid@jewishaudiotheater.com</a>
        <div className="mt-16 flex justify-center gap-10 text-theater-gold/20">
          <Globe size={32} /> <Music size={32} /> <Share2 size={32} />
        </div>
      </footer>

      {/* PLAYER: HIGH PERSISTENCE - UNAFFECTED BY THEATER DIMMER OR CONTENT CLUTTER */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold/50 px-6 md:px-12 py-10 md:py-16 z-[2000] shadow-[0_-30px_100px_#000] transition-all duration-700 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto">
            {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">Parent Alert: Finishing in 60s</div>}
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-2 bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            <div className="w-full flex items-center justify-between gap-10">
              <div className="flex items-center gap-6 text-left truncate flex-1">
                <img src={activeEp.image} className="w-16 h-16 md:w-28 md:h-28 object-cover border-2 border-white/20" />
                <div className="truncate">
                  <h5 className="text-xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase font-black text-white/30 italic mt-3 tracking-widest leading-none">Heshy Riesel Authority Archive</p>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-10">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 rounded-full transition-all border ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_30px_#D4AF3744]' : 'bg-transparent text-white/20 border-white/10'}`}>
                  <Lamp size={28}/>
                </button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300 transform -rotate-1">
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
