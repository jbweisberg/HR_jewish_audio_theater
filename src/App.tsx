import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_logic_v105_GATE";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  
  // App Modes: gate -> lobby -> playing
  const [mode, setMode] = useState<'gate' | 'theater'>('gate');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [showNextScreen, setShowNextScreen] = useState(false);
  const [nextChoices, setNextChoices] = useState<any[]>([]);
  const [isSeries, setIsSeries] = useState(false);
  
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

  // Continuity Auto-start Logic
  useEffect(() => {
    let timer: any;
    if (showNextScreen && isSeries && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextScreen && isSeries && countdown === 0) {
      togglePlay(nextChoices[0]);
    }
    return () => clearInterval(timer);
  }, [showNextScreen, countdown, isSeries, nextChoices]);

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowNextScreen(false);
    setWarned(false);
    setCountdown(10);
    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play();
      setMode('theater');
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

    // 15-SECOND INTERCEPT
    if (!showNextScreen && (dur - cur <= 15) && (dur - cur > 1)) {
      triggerSequence();
    }

    // PARENT CHIME
    if (!showNextScreen && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59)) {
      if (!warned) {
        setWarned(true);
        new Audio(CHIME_URL).play().catch(() => {});
      }
    }
  };

  const triggerSequence = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const rootName = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    
    let options: any[] = [];
    let linked = false;

    if (idx > 0) {
      const olderIdx = episodes[idx - 1]; // Moving toward index 0 is Part 2
      if (olderIdx.title.toLowerCase().includes(rootName)) {
        options.push(olderIdx);
        linked = true;
      }
    }

    const filler = episodes.filter(e => e.id !== activeEp.id && (linked ? e.id !== options[0].id : true)).sort(() => 0.5 - Math.random()).slice(0, linked ? 2 : 3);
    setNextChoices([...options, ...filler]);
    setIsSeries(linked);
    setShowNextScreen(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className="min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- THE ENTRANCE GATE (PORTAL) --- */}
      {mode === 'gate' && (
        <div className="fixed inset-0 z-[5000] bg-theater-midnight flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-1000">
           <div className="portal-gate p-16 md:p-24 border-[1px] border-theater-gold relative flex flex-col items-center">
              <h1 className="font-ornate insignia-shimmer text-6xl md:text-[140px] leading-none mb-4">JAT</h1>
              <p className="font-serif text-2xl md:text-5xl italic font-black uppercase mb-12 tracking-widest">Enter the Portal</p>
              <div className="w-16 h-[2px] bg-theater-gold mb-16 opacity-30"></div>
              <button 
                onClick={() => { setMode('theater'); window.scrollTo(0,0); }} 
                className="bg-theater-gold text-black px-16 py-6 font-black uppercase tracking-[0.2em] text-sm hover:bg-theater-parchment transition shadow-2xl flex items-center gap-3"
              >
                <Sparkles size={20}/> Open the Theatre Gates
              </button>
           </div>
           <p className="mt-12 text-[10px] uppercase font-black tracking-[0.6em] text-white opacity-20">TIMELESS STORIES BROUGHT TO LIFE • HESHY RIESEL</p>
        </div>
      )}

      {/* --- CHOOSE NEXT OVERLAY (15S INTERCEPT) --- */}
      {showNextScreen && (
        <div className="fixed inset-0 z-[4000] bg-[#02040A]/95 flex items-center justify-center p-4 md:p-8 animate-in slide-in-from-bottom duration-700">
           <div className="max-w-4xl w-full bg-theater-parchment text-theater-midnight p-8 md:p-12 shadow-[0_0_100px_#000] border-t-8 border-theater-gold">
              <h2 className="text-4xl md:text-7xl font-serif italic font-black uppercase text-center mb-4 tracking-tighter">
                {isSeries ? "The Story Continues" : "Discover a New Tale"}
              </h2>
              <p className="text-center font-black uppercase tracking-[0.4em] opacity-30 mb-10 text-[10px]">
                {isSeries ? "Starting next part automatically" : "This production is almost finished"}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {nextChoices.map((ep, i) => (
                  <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group bg-white p-4 transition-all duration-500 border-2 ${i === 0 && isSeries ? 'border-theater-gold shadow-2xl scale-105' : 'border-transparent'}`}>
                    <img src={ep.image} className="aspect-square object-cover mb-4 group-hover:scale-105 transition shadow-lg" alt="" />
                    <p className="font-serif text-sm font-black italic uppercase leading-none">{ep.title}</p>
                    {i === 0 && isSeries && (
                      <div className="mt-4 flex items-center gap-4">
                        <span className="bg-theater-burgundy text-white px-2 py-1 text-[8px] font-black uppercase">Sequel Found</span>
                        <p className="text-[10px] font-bold text-theater-gold italic">Auto-start in {countdown}s</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-12 flex justify-center">
                 <button onClick={() => setShowNextScreen(false)} className="text-[10px] uppercase font-black opacity-30 tracking-[0.5em] hover:text-black transition">Stay on current story</button>
              </div>
           </div>
        </div>
      )}

      {/* --- THE THEATER VIEW --- */}
      <div className={isDimmed ? 'dimmed-view' : 'transition-all duration-1000'}>
        <nav className="fixed top-0 w-full z-[1000] h-20 md:h-24 px-6 md:px-12 flex items-center justify-center border-b border-white/5 bg-[#02040A]/80 backdrop-blur-md">
          <div className="max-w-7xl w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold italic font-black">Jewish Audio Theater</h1>
               <p className="text-[8px] md:text-[10px] uppercase font-black text-white opacity-40 mt-1 uppercase leading-none">Timeless Stories Brought to Life</p>
            </div>
            
            <div className="hidden md:flex items-center gap-8 h-full pt-1">
               <a href="#vault" className="text-theater-gold hover:text-white uppercase font-black text-[10px] tracking-widest transition">The Vault</a>
               {/* Sign In Grayed Out for Children Mode */}
               <button className="flex items-center gap-2 text-white/20 border border-white/5 px-6 py-2 uppercase font-black text-[9px] cursor-not-allowed">
                  <Lock size={12}/> Entry Link Pending
               </button>
               <a href="mailto:Maggid@jewishaudiotheater.com" className="border-l border-white/10 pl-8 uppercase font-black text-white text-[10px] tracking-widest hover:text-theater-gold transition leading-none">Heshy Riesel</a>
            </div>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold"><Menu/></button>
          </div>
        </nav>

        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-32 pb-32 px-8">
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 items-center">
              <div className="md:col-span-7">
                 <h2 className="text-5xl md:text-[110px] font-serif leading-[0.85] mb-12 uppercase tracking-tighter italic font-black">{episodes[0].title}</h2>
                 <p className="text-2xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
                 <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-base hover:scale-105 transition shadow-2xl flex items-center gap-6">
                    {activeEp?.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} fill="black" />}
                    Experience Theater
                 </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-2xl grayscale" alt=""/></div>
            </div>
          </header>
        )}

        <section id="vault" className="bg-theater-parchment text-theater-midnight py-48 px-10 border-y-[20px] border-theater-midnight shadow-inner">
           <div className="max-w-7xl mx-auto">
              <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter mb-20 italic font-black border-b-[6px] border-black/5 pb-12">THE VAULT</h3>
              <div className="grid md:grid-cols-3 gap-16 md:gap-y-40">
                 {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="cursor-pointer group flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-black border-[1px] border-black/5 group-hover:border-theater-gold transition duration-700">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition duration-1000" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 bg-black/40 group-hover:backdrop-blur-sm"><PlayCircle size={64} className="text-theater-gold" fill="#02040A" /></div>
                      </div>
                      <h4 className="text-3xl font-serif font-black uppercase italic leading-none mb-2 tracking-tighter text-center">{ep.title}</h4>
                      <p className="text-[10px] font-black uppercase opacity-20 text-center tracking-[0.5em] text-theater-burgundy">Authority Selection</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>
      </div>

      {/* --- MASTER PLAYER & LANTERN (Bright Level) --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold/40 px-6 md:px-12 py-10 md:py-16 z-[3000] shadow-[0_-30px_100px_#000] transition-all duration-700 ${duration - currentTime <= 60 ? 'bg-theater-burgundy' : 'bg-theater-midnight'}`}>
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10 md:gap-14">
              <div className="w-full md:w-fit flex items-center gap-10">
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-110 active:scale-90 transition-all">
                   {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-1" fill="black" />}
                </button>
                <div className="flex flex-col flex-1 truncate text-left pr-4">
                  <h5 className="text-lg md:text-5xl font-serif text-theater-gold uppercase italic truncate font-black leading-none mb-2">{activeEp.title}</h5>
                  <p className="text-[10px] uppercase font-black text-white/30 italic tracking-[0.2em]">Heshy Riesel • Timeless Stories</p>
                </div>
              </div>
              <div className="w-full flex-1 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                   <span className="text-[11px] font-black text-theater-gold font-mono">{formatTime(currentTime)}</span>
                   <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[2px] bg-white/10 appearance-none cursor-pointer accent-theater-gold" />
                   <span className="text-[11px] font-black text-white/50 font-mono">-{formatTime(duration - currentTime)}</span>
                </div>
                {duration - currentTime <= 60 && <div className="text-[11px] font-black uppercase text-center tracking-[0.3em] text-white animate-bounce"><AlertCircle size={14} className="inline mr-2"/> parental alert: Finish In {Math.floor(duration - currentTime)}s</div>}
              </div>
              <div className="flex items-center gap-8">
                 <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_30px_#D4AF37]' : 'bg-white/5 text-white/20'}`} title="The Theater Dimmer">
                    <Lamp size={28}/>
                 </button>
                 <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/10 hover:text-white transition-all transform hover:rotate-90"><X size={32}/></button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
