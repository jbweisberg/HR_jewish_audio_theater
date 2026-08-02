import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, ChevronRight, X, Mail, Bell, Library, 
  Mic2, CheckCircle2, Star, Menu, Globe, Music, Share2, Headphones
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

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
          date: new Date(item.querySelector("pubDate")?.textContent || "").toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        }));
        setEpisodes(items);
        setLoading(false);
      } catch (e) { setLoading(false); }
    }
    loadTheater();
  }, []);

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setStoryComplete(false);
    setWarned(false);
    if (ep && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      audioRef.current.play().catch(e => console.log(e));
    } else {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    const currentIndex = episodes.findIndex(e => e.id === activeEp.id);
    
    // Series Logic: Feeds are Newest(0) to Oldest(End). 
    // If we finish Part 1 (Older), we play Part 2 (Newer, lower index).
    if (currentIndex > 0) {
      const next = episodes[currentIndex - 1];
      setNextEp(next);
      setStoryComplete(true);
      setTimeout(() => togglePlay(next), 5000);
    } else {
      // End of Catalog: Show Recommendations
      const shuffled = [...episodes].sort(() => 0.5 - Math.random());
      setRecs(shuffled.slice(0, 3));
      setNextEp(null);
      setStoryComplete(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(current);
    if (dur > 60 && (dur - current <= 60) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  if (loading) return (
    <div className="h-screen bg-[#050A14] flex items-center justify-center text-[#D4AF37]">
      <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050A14] text-[#F5F2E8] font-sans w-full overflow-x-hidden">
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={handleEnded} preload="auto" />

      {/* CURTAIN CALL OVERLAY */}
      {storyComplete && (
        <div className="fixed inset-0 z-[200] bg-[#050A14]/98 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-700">
          <div className="max-w-4xl w-full bg-[#F5F2E8] p-8 md:p-12 text-center border-t-8 border-[#D4AF37] shadow-2xl overflow-y-auto max-h-[90vh]">
            <CheckCircle2 size={48} className="text-[#4A0E0E] mx-auto mb-6" />
            <h2 className="text-[#050A14] font-serif text-3xl md:text-5xl uppercase mb-2 italic font-black leading-none">The Curtain Falls</h2>
            
            {nextEp ? (
              <div className="mt-8 animate-pulse">
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-[#4A0E0E] mb-4">Auto-playing next part...</p>
                <p className="text-[#050A14] font-serif text-2xl italic mb-6">{nextEp.title}</p>
                <div className="w-40 h-1 bg-[#D4AF37]/20 mx-auto rounded-full overflow-hidden">
                   <div className="h-full bg-[#D4AF37] animate-[progress_5s_linear]"></div>
                </div>
              </div>
            ) : (
              <div className="mt-12">
                <p className="text-[#050A14] font-serif text-xl italic mb-8">Discover another tale from the Vault:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                  {recs.map(r => (
                    <div key={r.id} onClick={() => togglePlay(r)} className="cursor-pointer group">
                      <img src={r.image} className="w-full aspect-square object-cover border border-black/5 mb-4 group-hover:scale-105 transition" />
                      <p className="text-[#050A14] font-serif text-sm uppercase leading-tight italic font-bold">{r.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setStoryComplete(false)} className="mt-12 text-[10px] font-black uppercase tracking-widest text-[#050A14]/40 hover:text-[#4A0E0E]">Return to Theater</button>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-[#050A14]/95 backdrop-blur-lg border-b border-[#D4AF37]/10 px-6 py-5 md:py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex flex-col text-left">
            <h1 className="font-serif text-xl md:text-3xl text-[#D4AF37] uppercase leading-none italic">Jewish Audio Theater</h1>
            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.4em] text-[#F5F2E8]/40 font-black mt-1">Official Heshey Riesel Authority</p>
          </div>
          <div className="hidden md:flex gap-10 text-[10px] font-black uppercase tracking-widest">
            <a href="#vault" className="hover:text-[#D4AF37]">Vault</a>
            <a href="#casting" className="hover:text-[#D4AF37]">Audition</a>
            <a href="#signup" className="bg-[#D4AF37] text-black px-5 py-2 flex items-center gap-2"><Bell size={12} /> Alerts</a>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-[#D4AF37]">
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#050A14] border-b border-[#D4AF37]/20 flex flex-col items-center py-10 gap-8 animate-in slide-in-from-top">
            <a href="#vault" onClick={() => setIsMenuOpen(false)} className="text-2xl font-serif italic text-[#D4AF37]">The Vault</a>
            <a href="#casting" onClick={() => setIsMenuOpen(false)} className="text-2xl font-serif italic text-[#D4AF37]">Audition</a>
            <a href="mailto:Maggid@jewishaudiotheater.com" className="text-2xl font-serif italic text-[#D4AF37]">Contact</a>
          </div>
        )}
      </nav>

      {/* STAGE */}
      <header className="relative min-h-screen flex items-center pt-24 px-6 md:px-12 overflow-hidden text-left">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#4A0E0E66_0%,_transparent_70%)] opacity-40"></div>
        <div className="max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-10 md:gap-20 relative z-10">
          <div className="md:col-span-7 flex flex-col justify-center">
            <h2 className="voice-title text-5xl sm:text-6xl md:text-8xl lg:text-[100px] font-serif leading-[0.9] mb-8 uppercase tracking-tighter italic">{episodes[0]?.title}</h2>
            <p className="voice-desc text-lg md:text-2xl font-light opacity-80 mb-12 max-w-xl italic border-l-2 border-[#D4AF37]/30 pl-6">"{episodes[0]?.desc}"</p>
            <button onClick={() => togglePlay(episodes[0])} className="w-fit bg-[#D4AF37] text-black px-12 py-6 font-black uppercase text-sm hover:bg-white transition flex items-center gap-4 shadow-2xl">
              {activeEp?.id === episodes[0].id && isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              {activeEp?.id === episodes[0].id && isPlaying ? "Pause Story" : "Enter Theater"}
            </button>
          </div>
          <div className="hidden md:block md:col-span-5 self-center">
            <img src={episodes[0]?.image} className="w-full aspect-square object-cover border-8 border-[#D4AF37]/10 shadow-2xl grayscale hover:grayscale-0 transition duration-1000" />
          </div>
        </div>
      </header>

      {/* VAULT */}
      <section id="vault" className="bg-[#F5F2E8] text-[#050A14] py-24 md:py-40 px-6 md:px-12 text-left">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-5xl md:text-9xl font-serif uppercase tracking-tighter border-b-4 border-[#050A14] pb-6 md:pb-12 mb-12 md:mb-24 italic leading-none">The Vault</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-32">
            {episodes.slice(1).map((ep) => (
              <div key={ep.id} className="group cursor-pointer flex flex-col" onClick={() => togglePlay(ep)}>
                <div className="relative aspect-square overflow-hidden bg-black mb-6 md:mb-10 shadow-xl">
                  <img src={ep.image} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-1000" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-500 bg-black/40">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-[#D4AF37] rounded-full flex items-center justify-center text-black">
                      <Play size={32} className="ml-1" />
                    </div>
                  </div>
                </div>
                <h4 className="text-2xl md:text-4xl font-serif uppercase leading-tight group-hover:text-[#4A0E0E] transition italic tracking-tighter">{ep.title}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDITION */}
      <section id="casting" className="py-24 md:py-40 px-6 md:px-12 bg-[#050A14] border-y border-[#D4AF37]/10 text-left">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 md:gap-24 items-center">
          <div>
            <h2 className="text-4xl md:text-8xl font-serif uppercase tracking-tighter mb-8 italic text-[#D4AF37] leading-none text-left">Stage Call</h2>
            <p className="text-lg md:text-2xl font-light opacity-70 mb-10 italic">Children and parents are invited to audition for upcoming productions.</p>
            <div className="bg-[#4A0E0E] text-[#D4AF37] px-6 py-3 font-black uppercase text-[10px] tracking-widest inline-block italic">Casting: To be announced</div>
          </div>
          <div className="bg-[#F5F2E8] p-8 md:p-16 text-[#050A14] shadow-2xl border-t-4 border-[#D4AF37]">
            <form action="https://formspree.io/f/mbdnndlg" method="POST" className="space-y-6">
              <input type="text" name="name" placeholder="Full Name" required className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-[10px] font-black tracking-widest" />
              <input type="text" name="age" placeholder="Age" required className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-[10px] font-black tracking-widest" />
              <input type="email" name="email" placeholder="Email" required className="w-full bg-transparent border-b-2 border-black/10 py-4 focus:outline-none focus:border-[#D4AF37] uppercase text-[10px] font-black tracking-widest" />
              <button type="submit" className="w-full bg-[#050A14] text-[#D4AF37] py-6 font-black uppercase tracking-widest text-[10px] hover:bg-[#4A0E0E] transition mt-4">Submit Audition</button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="py-24 md:py-40 px-6 bg-[#050A14] text-center border-t border-[#D4AF37]/10">
        <h2 className="text-3xl md:text-7xl font-serif uppercase tracking-tighter mb-8 text-[#D4AF37] italic leading-none">Contact</h2>
        <a href="mailto:Maggid@jewishaudiotheater.com" className="text-lg md:text-4xl font-black uppercase tracking-tighter hover:text-white transition break-words italic tracking-tighter leading-none">Maggid@jewishaudiotheater.com</a>
        <div className="mt-20 flex justify-center gap-12 text-[#D4AF37]/30">
          <Globe size={20} /> <Music size={20} /> <Share2 size={20} />
        </div>
        <p className="mt-24 text-[8px] md:text-[10px] uppercase tracking-[0.5em] opacity-20 font-bold tracking-widest leading-none italic">© 2024 Heshey Riesel • Authority Production Archive</p>
      </footer>

      {/* PLAYER */}
      {activeEp && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0A0F1B] border-t-2 border-[#D4AF37] px-4 md:px-8 py-6 md:py-10 z-[100] shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
            <div className="w-full flex items-center gap-4 mb-4 md:mb-0">
              <span className="text-[10px] font-black text-[#D4AF37] w-12">{formatTime(currentTime)}</span>
              <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-1 bg-[#F5F2E8]/10 appearance-none cursor-pointer accent-[#D4AF37]" />
              <span className="text-[10px] font-black text-[#F5F2E8]/40 w-12 text-right">-{formatTime(duration - currentTime)}</span>
            </div>
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-4 text-left">
                <img src={activeEp.image} className="w-12 h-12 md:w-20 md:h-20 object-cover border border-[#D4AF37]/20" />
                <div className="truncate max-w-[150px] md:max-w-md">
                  <h5 className="text-sm md:text-2xl font-serif text-[#D4AF37] uppercase italic truncate tracking-tighter">{activeEp.title}</h5>
                  {duration - currentTime <= 60 && <span className="text-[8px] bg-[#4A0E0E] text-[#D4AF37] px-2 py-0.5 uppercase font-bold animate-pulse">Final Minute</span>}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => togglePlay()} className="w-12 h-12 md:w-20 md:h-20 bg-[#D4AF37] rounded-full flex items-center justify-center text-black shadow-2xl transition active:scale-95">
                  {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                </button>
                <button onClick={() => { setActiveEp(null); setIsPlaying(false); audioRef.current?.pause(); }} className="text-white/20 p-2"><X size={24} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}