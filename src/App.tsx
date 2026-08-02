import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Mail, Bell, CheckCircle2, Menu, Globe, Music, Share2, AlertCircle, Loader2
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_final_cache_v30";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
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
          title: item.querySelector("title")?.textContent || "Story",
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

  // AUTO-PLAY ENGINE (10 SEC COUNTDOWN)
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
      audioRef.current.play().catch(e => console.log(e));
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (!activeEp) return;
    const currentIndex = episodes.findIndex(e => e.id === activeEp.id);
    
    // PART 1 (LATER INDEX) -> PART 2 (SOONER INDEX)
    if (currentIndex > 0) {
      const currentRoot = activeEp.title.split(/Part|Chapter/i)[0].trim().toLowerCase();
      const possibleNext = episodes[currentIndex - 1];
      if (possibleNext.title.toLowerCase().includes(currentRoot)) {
        setNextEp(possibleNext);
        setStoryComplete(true);
        return;
      }
    }
    // No series? End quietly or show lobby
    setStoryComplete(true);
    setNextEp(null);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(current);

    // PARENT CHIME & RED BAR: Triggered at exactly 60 seconds
    if (dur > 65 && (dur - current <= 60.5 && dur - current >= 59) && !warned) {
      setWarned(true);
      const chime = new Audio(CHIME_URL);
      chime.volume = 0.5;
      chime.play().catch(e => console.log(e));
    }
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center"><Loader2 className="animate-spin text-theater-gold" /></div>;

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60);

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={handleEnded} preload="auto" />

      {/* CURTAIN CALL */}
      {storyComplete && (
        <div className="fixed inset-0 z-[200] bg-[#050A14]/98 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-[#F5F2E8] p-10 border-t-8 border-[#D4AF37] shadow-2xl">
            <CheckCircle2 size={48} className="mx-auto mb-6 text-theater-burgundy" />
            <h2 className="text-[#050A14] font-serif text-3xl mb-4 italic font-black leading-tight uppercase">The Curtain Falls</h2>
            {nextEp ? (
              <div>
                <p className="text-[12px] uppercase font-black text-[#4A0E0E] mb-2 tracking-widest">Starting Part 2 in {countdown}s...</p>
                <p className="text-[#050A14] font-serif text-xl italic font-black mb-8 leading-tight">{nextEp.title}</p>
                <div className="w-full h-1 bg-black/5 rounded-full overflow-hidden">
                   <div className="h-full bg-theater-gold fill-countdown"></div>
                </div>
              </div>
            ) : <p className="text-theater-midnight italic mb-8">Series Complete.</p>}
            <button onClick={() => setStoryComplete(false)} className="mt-8 text-theater-midnight font-black uppercase text-[10px]">Return to Theater</button>
          </div>
        </div>
      )}

      {/* NAV - HORIZONTALLY LEVELED FOR LAPTOP */}
      <nav className="fixed top-0 w-full z-50 bg-[#050A14]/95 border-b border-[#D4AF37]/10 px-8 py-6 flex items-center">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full h-full">
          <div className="flex flex-col text-left">
            <h1 className="font-serif text-2xl md:text-3xl text-[#D4AF37] uppercase leading-none italic font-black">Jewish Audio Theater</h1>
            <p className="text-[9px] uppercase tracking-[0.4em] text-[#F5F2E8]/40 font-black mt-1 leading-none uppercase">Timeless Stories Brought to Life</p>
          </div>
          <div className="hidden md:flex gap-10 items-center h-full text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
            <a href="#vault" className="hover:text-white pt-1 transition">The Vault</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="hover:text-white pt-1 transition">Contact</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-[#D4AF37]"><Menu /></button>
        </div>
        {isMenuOpen && <div className="md:hidden fixed top-20 left-0 w-full bg-[#050A14] p-10 flex flex-col items-center gap-6"><a href="#vault" onClick={() => setIsMenuOpen(false)}>Vault</a><a href="mailto:Maggid@jewishaudiotheater.com">Contact</a></div>}
      </nav>

      {/* STAGE */}
      {episodes.length > 0 && (
        <header id="stage" className="relative min-h-screen flex items-center pt-24 px-8 text-left">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_70%)] opacity-30"></div>
          <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 relative z-10 items-center">
            <div className="md:col-span-7">
              <h2 className="text-5xl sm:text-7xl lg:text-[105px] font-serif leading-[0.85] mb-10 uppercase tracking-tighter italic font-black text-white">{episodes[0].title}</h2>
              <p className="text-xl font-light opacity-90 mb-12 italic border-l-2 border-theater-gold/50 pl-8 leading-relaxed">"Timeless Stories Brought to Life"</p>
              <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-theater-gold text-black px-12 md:px-16 py-6 md:py-8 font-black uppercase text-sm md:text-base hover:bg-theater-parchment transition shadow-2xl flex items-center gap-4">
                {activeEp?.id === episodes[0].id && isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                Enter the Theater
              </button>
            </div>
            <div className="hidden md:block md:col-span-5">
              <img src={episodes[0].image} className="w-full aspect-square object-cover border-8 border-theater-gold/20 shadow-2xl grayscale" />
            </div>
          </div>
        </header>
      )}

      {/* VAULT */}
      <section id="vault" className="bg-[#F5F2E8] text-[#050A14] py-32 px-8 text-left border-y-8 border-theater-midnight">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-5xl md:text-9xl font-serif uppercase tracking-tighter border-b-4 border-black/10 pb-8 mb-24 italic leading-none">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-32">
            {episodes.length > 1 && episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-8 shadow-2xl border border-black/10">
                  <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-1000" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/50">
                    <Play size={48} className="text-theater-gold" />
                  </div>
                </div>
                <h4 className="text-3xl md:text-4xl font-serif uppercase leading-tight italic font-black text-theater-midnight">{ep.title}</h4>
                <p className="mt-4 text-[9px] font-black uppercase opacity-50 tracking-[0.2em] italic text-theater-burgundy leading-none">By Heshy Riesel</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-24 px-8 bg-theater-midnight text-center border-t border-theater-gold/10">
        <Mail className="mx-auto text-theater-gold mb-12 opacity-30" size={64} />
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-lg md:text-5xl font-black uppercase tracking-tighter hover:text-white transition break-words italic leading-none">Maggid@jewishaudiotheater.com</a>
        <div className="mt-16 flex justify-center gap-10 text-theater-gold/30">
          <Globe size={24} /> <Music size={24} /> <Share2 size={24} />
        </div>
        <p className="mt-20 text-[9px] uppercase tracking-[0.5em] opacity-30 italic font-black">© 2024 Heshy Riesel • Authority Production Archive</p>
      </footer>

      {/* G-D MOVE MASTER PLAYER */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-[#D4AF37] px-6 md:px-12 py-6 md:py-10 z-[100] shadow-2xl transition-all duration-1000 ${isFinalMinute ? 'alert-red' : 'bg-[#0A0F1B]'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
            
            {isFinalMinute && (
              <div className="w-full flex items-center justify-center gap-2 text-white font-black uppercase text-[12px] tracking-[0.4em] mb-1 animate-bounce">
                <AlertCircle size={20} /> Final Minute Warning
              </div>
            )}

            <div className="w-full flex items-center gap-6">
              <span className="text-[11px] font-black text-theater-gold w-14 text-left">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-1 bg-[#F5F2E8]/20 appearance-none accent-theater-gold cursor-pointer" />
              <span className="text-[11px] font-black text-white/50 w-14 text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4 text-left truncate">
                <img src={activeEp.image} className="w-16 h-16 object-cover border border-white/20 shadow-lg" alt="" />
                <div className="truncate">
                  <h5 className="text-sm md:text-2xl font-serif text-[#D4AF37] uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                  <p className="text-[9px] uppercase font-black opacity-40 italic tracking-[0.2em] text-[#D4AF37]">Heshy Riesel • Timeless Stories</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => togglePlay()} className="w-14 h-14 md:w-20 md:h-20 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300">
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
