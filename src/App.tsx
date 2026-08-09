import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, 
  AlertCircle, Headphones, Lamp, Loader2, PlayCircle, FastForward, Sparkles, User, LogIn
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_ultimate_v1";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [appMode, setAppMode] = useState<'gate' | 'theater'>('gate');
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [nextChoiceList, setNextChoiceList] = useState<any[]>([]);
  const [isSeriesLink, setIsSeriesLink] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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
          title: item.querySelector("title")?.textContent || "Jewish Story",
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
    if (showNextOverlay && isSeriesLink && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextOverlay && isSeriesLink && countdown === 0) {
      const next = nextChoiceList[0];
      if (next) togglePlay(next);
    }
    return () => clearInterval(timer);
  }, [showNextOverlay, countdown, isSeriesLink]);

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowNextOverlay(false);
    setWarned(false);
    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play();
      setAppMode('theater');
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

    if (!showNextOverlay && (dur - cur <= 10) && (dur - cur > 1)) {
      const idx = episodes.findIndex(e => e.id === activeEp.id);
      const root = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
      let list: any[] = [];
      let isSeq = false;
      if (idx > 0) {
        const newer = episodes[idx - 1];
        if (newer.title.toLowerCase().includes(root)) { list.push(newer); isSeq = true; }
      }
      const recs = episodes.filter(e => e.id !== activeEp.id && (!isSeq || e.id !== list[0].id)).sort(() => 0.5 - Math.random()).slice(0, isSeq ? 2 : 3);
      setNextChoiceList([...list, ...recs]);
      setIsSeriesLink(isSeq);
      setShowNextOverlay(true);
    }

    if (!showNextOverlay && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" /></div>;

  if (appMode === 'gate') {
    return (
      <div className="fixed inset-0 z-[9000] bg-theater-midnight flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-1000">
        <h1 className="font-ornate text-theater-gold text-[120px] md:text-[200px] leading-none py-10 jat-insignia">JAT</h1>
        <p className="font-serif text-3xl md:text-6xl font-black uppercase italic tracking-[0.2em] mb-12">Enter the Portal</p>
        <button onClick={() => setAppMode('theater')} className="bg-theater-gold text-black px-14 py-7 font-black uppercase text-sm md:text-lg hover:scale-110 transition shadow-2xl active:scale-95">Open the Theater</button>
        <div className="mt-20 opacity-30 text-[9px] font-black uppercase tracking-[0.6em]">TIMELESS STORIES • HESHY RIESEL</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* TRANSITION OVERLAY */}
      {showNextOverlay && (
        <div className="fixed inset-0 z-[5000] bg-black/98 flex items-center justify-center p-4 md:p-8 animate-in slide-in-from-bottom duration-700">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-6 md:p-14 shadow-2xl border-t-[10px] border-theater-gold relative">
              <div className="text-center mb-10">
                 <h2 className="text-3xl md:text-7xl font-serif italic font-black uppercase tracking-tighter">
                   {isSeriesLink ? "The Story Continues" : "Your Next Adventure"}
                 </h2>
                 <p className="text-[10px] uppercase font-black tracking-[0.5em] opacity-40">Choose from the repertory</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {nextChoiceList.map((ep, i) => (
                  <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all ${i === 0 && isSeriesLink ? 'bg-white border-theater-gold shadow-xl scale-[1.02]' : 'bg-black/5 opacity-60'}`}>
                    <img src={ep.image} className="aspect-square object-cover mb-4 border border-black/10" alt="" />
                    <h4 className="font-serif text-lg font-black uppercase italic leading-none truncate">{ep.title}</h4>
                    {i === 0 && isSeriesLink && <p className="mt-4 text-[#D4AF37] font-black text-[9px] uppercase tracking-widest animate-pulse">Starts in {countdown}s</p>}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowNextOverlay(false)} className="mt-14 uppercase font-black text-[11px] opacity-20 w-full text-center">Back to current production</button>
           </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div id="stage-content">
        <nav className="fixed top-0 w-full z-[100] h-20 md:h-24 bg-[#02040A]/60 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
          <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
            <div className="flex flex-col text-left">
               <h1 className="font-serif text-xl md:text-3xl text-theater-gold italic font-black uppercase">Jewish Audio Theater</h1>
               <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1 uppercase">Timeless Stories Brought to Life</p>
            </div>
            <div className="hidden md:flex items-center gap-10 h-full text-[11px] font-black uppercase pt-1 tracking-widest">
               <a href="#repertory" className="text-theater-gold hover:text-white transition">Repertory</a>
               <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 text-theater-gold font-bold"> <LogIn size={14}/> {user ? user.name : 'Sign In'} </button>
            </div>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-theater-gold"><Menu size={32}/></button>
          </div>
        </nav>

        {/* HERO */}
        {episodes.length > 0 && (
          <header className="relative min-h-screen flex items-center pt-24 px-8 text-left z-10 overflow-hidden mb-32">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E77_0%,_transparent_75%)] opacity-40"></div>
            <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 items-center z-10">
              <div className="md:col-span-7">
                <h2 className="text-4xl md:text-[110px] font-serif leading-[0.82] mb-12 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
                <div className="h-1 w-20 bg-theater-gold mb-10 opacity-30"></div>
                <p className="text-xl md:text-3xl font-light opacity-90 mb-14 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed text-[#F5F2E8]">"Timeless Stories Brought to Life"</p>
                <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-20 py-6 md:py-8 font-black uppercase text-base hover:bg-[#F5F2E8] transition shadow-[0_0_80px_rgba(212,175,55,0.4)] flex items-center gap-6">
                  {activeEp && activeEp.id === episodes[0].id && isPlaying ? <Pause size={32}/> : <Play size={32} fill="black"/>} BEGIN STORY
                </button>
              </div>
              <div className="hidden md:block md:col-span-5"><img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/10 shadow-2xl grayscale" alt=""/></div>
            </div>
          </header>
        )}

        {/* VAULT */}
        <section id="repertory" className="bg-[#F5F2E8] text-[#02040A] py-32 px-10 border-y-[20px] border-theater-midnight shadow-inner relative z-10">
           <div className="max-w-7xl mx-auto text-left">
              <h3 className="text-6xl md:text-[150px] font-serif uppercase tracking-tighter mb-20 italic font-black border-b-[6px] border-black/5 pb-12 leading-none uppercase tracking-tighter">Repertory</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-40 text-left">
                {episodes.length > 1 && episodes.slice(1).map(ep => (
                   <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                      <div className="relative aspect-square overflow-hidden mb-10 shadow-2xl bg-[#000] border-4 border-white transition-all group-hover:border-theater-gold">
                        <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-110 transition" alt="" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40"><PlayCircle size={80} className="text-theater-gold" fill="#000" /></div>
                      </div>
                      <h4 className="text-2xl md:text-5xl font-serif font-black italic uppercase leading-none tracking-tighter">{ep.title}</h4>
                      <p className="mt-4 text-[11px] font-black uppercase text-theater-burgundy opacity-40 italic tracking-widest leading-none">Heshy Riesel • THE MAGGID</p>
                   </div>
                ))}
              </div>
           </div>
        </section>

        {/* CASTING FORM */}
        <section className="py-24 md:py-48 px-8 bg-[#02040A] border-t border-theater-gold/10 relative">
           <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
              <div>
                <Mic2 className="text-theater-gold mb-10" size={60} />
                <h2 className="text-4xl md:text-7xl font-serif font-black uppercase italic leading-none mb-8 tracking-tighter">Your Voice <br/>on the Stage</h2>
                <p className="text-xl md:text-2xl font-light opacity-60 leading-relaxed mb-10 italic">Children and parents: Audition to be a character in our upcoming productions.</p>
                <div className="flex items-center gap-4 text-theater-gold font-black uppercase text-xs tracking-widest">
                  <Star size={16} fill="#D4AF37"/> Open Casting Calls Active
                </div>
              </div>
              <div className="bg-theater-parchment p-10 shadow-[0_0_100px_rgba(212,175,55,0.15)] text-[#02040A]">
                 <div className="space-y-6">
                    <input type="text" placeholder="Name" className="w-full border-b border-black/10 py-3 focus:outline-none focus:border-theater-gold uppercase text-[10px] font-black" />
                    <input type="text" placeholder="Age" className="w-full border-b border-black/10 py-3 focus:outline-none focus:border-theater-gold uppercase text-[10px] font-black" />
                    <button className="w-full bg-theater-midnight text-theater-gold py-5 font-black uppercase tracking-[0.3em] text-[10px] hover:bg-theater-burgundy transition">Submit Voice Sample Inquiry</button>
                 </div>
              </div>
           </div>
        </section>

        <footer id="contact" className="py-24 bg-theater-midnight text-center">
           <h2 className="text-2xl md:text-4xl font-serif text-theater-gold italic uppercase mb-4 tracking-tighter">Contact the Maggid</h2>
           <a href="mailto:Maggid@jewishaudiotheater.com" className="text-lg md:text-3xl font-black uppercase tracking-widest hover:text-white transition">Maggid@jewishaudiotheater.com</a>
           <p className="mt-16 text-[9px] font-black opacity-20 uppercase tracking-[0.5em] font-serif leading-none italic">© 2024 Heshy Riesel • THE MAGGID</p>
        </footer>
      </div>

      {/* --- LOGIN MODAL --- */}
      {showLogin && (
        <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-8">
           <div className="max-w-md w-full bg-theater-parchment text-theater-midnight p-10 shadow-2xl relative">
              <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4"><X/></button>
              <h2 className="font-serif text-3xl font-black italic uppercase text-center mb-8">Audience Profile</h2>
              <div className="space-y-6">
                 <input placeholder="Username" className="w-full border-b border-black/10 py-3 uppercase text-[10px] font-black outline-none focus:border-theater-gold" />
                 <input type="password" placeholder="Pass-key" className="w-full border-b border-black/10 py-3 uppercase text-[10px] font-black outline-none focus:border-theater-gold" />
                 <button onClick={() => { setUser({ name: 'Simcha W.' }); setShowLogin(false); }} className="w-full bg-theater-midnight text-theater-gold py-4 uppercase font-black text-xs tracking-widest hover:bg-theater-burgundy transition shadow-lg">Authenticate</button>
              </div>
           </div>
        </div>
      )}

      {/* PLAYER BAR */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t border-theater-gold px-6 md:px-12 py-10 md:py-16 z-[3000] shadow-[0_-40px_150px_#000] transition-all duration-700 ${duration - currentTime <= 60 && !showNextOverlay ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
          <div className="max-w-7xl mx-auto text-left">
            {duration - currentTime <= 60 && !showNextOverlay && <div className="text-center text-white font-black uppercase text-[11px] tracking-[0.5em] mb-4 animate-bounce italic font-black leading-none">Finish in {Math.floor(duration - currentTime)} seconds</div>}
            
            <div className="flex items-center gap-10 mb-8">
              <span className="text-[12px] font-black text-theater-gold w-14 font-mono text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-[2px] bg-white/10 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{formatTime(duration - currentTime)}</span>
            </div>
            <div className="w-full flex justify-between gap-10 items-center">
              <div className="flex items-center gap-8 text-left truncate flex-1 pr-6 cursor-pointer">
                <img src={activeEp.image} className="w-14 h-14 md:w-28 md:h-28 object-cover border border-white/20" alt="" />
                <div className="truncate pr-10">
                  <h5 className="text-2xl md:text-5xl font-serif text-theater-gold uppercase italic truncate leading-none mb-2 font-black">{activeEp.title}</h5>
                  <p className="text-[10px] md:text-xs uppercase font-black text-white/40 tracking-widest mt-2">HESHY RIESEL • THE MAGGID</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold shadow-[0_0_50px_#D4AF3744]' : 'bg-white/5 text-white/20'}`}> <Lamp size={32}/></button>
                <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all transform -rotate-2">
                   {isPlaying ? <Pause size={56} /> : <Play size={56} className="ml-2" fill="black" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); }} className="text-white/20 p-2 hover:text-white transform hover:rotate-90 transition-all"><X size={40}/></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
