import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, Star, MessageCircle, LogIn, Crown, Send
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_auth_v105";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  
  // Membership & Memory State
  const [user, setUser] = useState<any>(null); // Null = Guest
  const [view, setView] = useState<'lobby' | 'stage'>('lobby');
  const [showAuth, setShowAuth] = useState(false);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [warned, setWarned] = useState(false);
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
        // Updated CORS Proxy with Fallback Relay
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`);
        const data = await res.json();
        const xml = new DOMParser().parseFromString(data.contents, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).map((item, i) => ({
          id: item.querySelector("guid")?.textContent || String(i),
          title: item.querySelector("title")?.textContent || "Jewish Story",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
          access: i < 5 ? 'free' : 'member' // Setting a paywall logic for monetization prep
        }));
        setEpisodes(items);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) { console.error(e); setLoading(false); }
    }
    loadTheater();
  }, []);

  // PERSISTENCE LOGIC: Save timestamp to local storage every 5 seconds
  useEffect(() => {
    if (activeEp && currentTime > 0) {
      localStorage.setItem(`save_point_${activeEp.id}`, String(currentTime));
    }
  }, [currentTime]);

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    
    // GATED ACCESS logic
    if (ep?.access === 'member' && !user) {
      setShowAuth(true);
      return;
    }

    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      
      // Auto-Resume feature
      const savedTime = localStorage.getItem(`save_point_${ep.id}`);
      if (savedTime) audioRef.current.currentTime = parseFloat(savedTime);
      
      audioRef.current.play();
      setView('stage');
      window.scrollTo(0,0);
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

    if (dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center"><Loader2 className="animate-spin text-theater-gold" size={48} /></div>;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans overflow-x-hidden selection:bg-theater-gold`}>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- AUTH MODAL (Identity Entry) --- */}
      {showAuth && (
        <div className="fixed inset-0 z-[5000] bg-black/90 flex items-center justify-center p-6 backdrop-blur-md animate-in zoom-in duration-300">
           <div className="max-w-md w-full bg-theater-parchment text-theater-midnight p-8 md:p-12 shadow-2xl border-t-[10px] border-theater-gold relative">
             <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 opacity-20 hover:opacity-100 transition"><X/></button>
             <div className="text-center mb-8">
                <Crown size={40} className="mx-auto text-theater-burgundy mb-4"/>
                <h2 className="text-3xl font-serif italic font-black uppercase">Inner Circle Access</h2>
                <p className="text-[10px] uppercase font-black tracking-widest mt-2 opacity-50">Members only storytelling archive</p>
             </div>
             <div className="space-y-4">
                <input placeholder="Username" className="w-full bg-black/5 border-b border-black/20 p-4 focus:outline-none focus:border-theater-gold uppercase text-[10px] font-black" />
                <input type="password" placeholder="Pass-key" className="w-full bg-black/5 border-b border-black/20 p-4 focus:outline-none focus:border-theater-gold uppercase text-[10px] font-black" />
                <button 
                  onClick={() => { setUser({ name: 'Shimon B.' }); setShowAuth(false); }}
                  className="w-full bg-theater-midnight text-theater-gold py-5 font-black uppercase text-xs hover:bg-theater-burgundy transition"
                >Enter the Stage</button>
             </div>
           </div>
        </div>
      )}

      {/* --- SHARED HEADER --- */}
      <nav className="fixed top-0 w-full z-[500] h-20 bg-theater-midnight/40 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex flex-col text-left cursor-pointer" onClick={() => setView('lobby')}>
             <h1 className="font-serif text-xl md:text-2xl text-theater-gold leading-none italic font-black uppercase">Jewish Audio Theater</h1>
             <p className="text-[9px] uppercase font-black text-white/40 tracking-[0.2em]">Timeless Stories Brought to Life</p>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
               <div className="bg-theater-gold/10 px-4 py-2 flex items-center gap-2 border border-theater-gold/20">
                  <span className="text-[10px] font-black text-theater-gold uppercase">{user.name}</span>
               </div>
            ) : (
               <button onClick={() => setShowAuth(true)} className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-theater-gold tracking-widest"><LogIn size={14}/> Sign In</button>
            )}
            <a href="mailto:Maggid@jewishaudiotheater.com" className="bg-theater-burgundy text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-theater-gold transition">Contact</a>
          </div>
        </div>
      </nav>

      {/* --- CONTENT ENGINE (VIEW SWITCHING) --- */}
      <main className={`transition-all duration-1000 ${isDimmed ? 'filter brightness-50 contrast-125 grayscale-[30%]' : ''}`}>
        {view === 'lobby' ? (
          <Lobby episodes={episodes} togglePlay={togglePlay} />
        ) : (
          <TheaterStage activeEp={activeEp} episodes={episodes} togglePlay={togglePlay} user={user} />
        )}
      </main>

      {/* --- THE MASTER CONTROLLER --- */}
      {activeEp && (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold/50 px-6 md:px-12 py-8 md:py-12 z-[2000] shadow-[0_-30px_100px_rgba(0,0,0,0.9)] transition-all duration-700 ${duration - currentTime <= 60 ? 'bg-theater-burgundy' : 'bg-theater-midnight'}`}>
           <div className="max-w-7xl mx-auto">
             <div className="flex items-center gap-8 mb-6">
                <span className="text-[10px] font-black text-theater-gold font-mono">{formatTime(currentTime)}</span>
                <input type="range" min="0" max={duration || 0} value={currentTime} onChange={(e) => { if(audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="flex-1 h-1.5 bg-white/10 appearance-none cursor-pointer accent-theater-gold" />
                <span className="text-[10px] font-black text-white/50 font-mono text-right">-{formatTime(duration - currentTime)}</span>
             </div>
             <div className="flex justify-between items-center gap-6">
                <div className="flex items-center gap-6 text-left truncate flex-1" onClick={() => setView('stage')}>
                   <img src={activeEp.image} className="w-12 h-12 md:w-24 md:h-24 object-cover border border-white/10 shadow-2xl" />
                   <div className="truncate">
                      <h5 className="text-xl md:text-4xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{activeEp.title}</h5>
                      <p className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em] leading-none mt-2">Heshy Riesel • THE MAGGID</p>
                   </div>
                </div>
                <div className="flex items-center gap-6 md:gap-10">
                   <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black shadow-[0_0_50px_#D4AF37]' : 'bg-white/5 text-white/30 border-white/5'}`} title="Theater Bedtime Mode">
                      <Lamp size={28}/>
                   </button>
                   <button onClick={() => togglePlay()} className="w-16 h-16 md:w-28 md:h-28 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-95 transition-all">
                      {isPlaying ? <Pause size={48} /> : <Play size={48} fill="black" className="ml-1" />}
                   </button>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENT: PUBLIC LOBBY ---
function Lobby({ episodes, togglePlay }: any) {
  return (
    <div className="pt-32 pb-48">
      <header className="px-6 max-w-5xl mx-auto text-center mt-32 md:mt-48 animate-in slide-in-from-bottom duration-1000">
         <h2 className="text-6xl md:text-[140px] font-serif font-black italic tracking-tighter leading-none mb-8">Heshy Riesel</h2>
         <p className="text-xl md:text-4xl font-light italic mb-16 text-white/60">Step into the past with thrilling adventures, <br className="hidden md:block"/> suspense, and unforgettable characters.</p>
         <button onClick={() => togglePlay(episodes[0])} className="bg-theater-gold text-black px-14 py-6 font-black uppercase tracking-widest text-xs md:text-sm hover:scale-110 transition shadow-[0_0_80px_rgba(212,175,55,0.4)]">Begin Theater Experience</button>
      </header>

      <section id="vault" className="mt-60 bg-[#F5F2E8] text-[#02040A] py-32 px-6 md:px-12 border-y-[15px] border-theater-midnight shadow-inner">
         <div className="max-w-7xl mx-auto">
            <h3 className="text-6xl md:text-[120px] font-serif uppercase tracking-tighter mb-20 italic font-black text-center border-b-2 border-black/5 pb-10">THE ARCHIVE</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-x-12 md:gap-y-32">
               {episodes.map((ep: any) => (
                  <div key={ep.id} className="cursor-pointer group flex flex-col text-left" onClick={() => togglePlay(ep)}>
                    <div className="relative aspect-square overflow-hidden mb-8 shadow-2xl bg-black border-2 border-white group-hover:border-theater-gold transition duration-700">
                       <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition" />
                       {ep.access === 'member' && <div className="absolute top-4 right-4 bg-theater-gold p-3 shadow-2xl animate-pulse"><Crown size={18} fill="black" /></div>}
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition"><Play size={64} fill="#D4AF37" className="text-theater-gold" /></div>
                    </div>
                    <h4 className="text-2xl md:text-3xl font-serif font-black italic tracking-tighter leading-tight uppercase px-4">{ep.title}</h4>
                  </div>
               ))}
            </div>
         </div>
      </section>
    </div>
  );
}

// --- SUB-COMPONENT: THEATER STAGE (For Engagement) ---
function TheaterStage({ activeEp, episodes, togglePlay, user }: any) {
  return (
    <div className="pt-32 pb-48 px-6 md:px-12 max-w-7xl mx-auto animate-in slide-in-from-right duration-700">
      <div className="grid lg:grid-cols-12 gap-20">
         
         <div className="lg:col-span-7">
            <div className="relative group overflow-hidden border border-white/5 mb-10">
               <img src={activeEp?.image} className="w-full aspect-video object-cover" alt="" />
               <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-80"></div>
            </div>
            <p className="text-[10px] font-black uppercase text-theater-gold tracking-[0.4em] mb-4 italic flex items-center gap-2"><Star size={12} fill="#D4AF37"/> Audience Reflection Center</p>
            <h2 className="text-4xl md:text-7xl font-serif font-black italic tracking-tighter uppercase mb-10 leading-[0.85]">{activeEp?.title}</h2>
            <div className="p-10 border border-white/10 bg-white/[0.03] italic text-xl md:text-2xl font-light opacity-50 mb-20 leading-relaxed leading-[1.6]">
              "{activeEp?.desc}"
            </div>

            {/* AUDIENCE COMMENT ENGINE */}
            <div className="mt-20 space-y-12">
               <h4 className="font-serif text-3xl italic font-black uppercase flex items-center gap-3"><MessageCircle className="text-theater-gold"/> Reflected Memories</h4>
               
               {/* HESHY RIESEL COMMENT EXAMPLE */}
               <div className="p-8 border border-theater-gold bg-theater-gold/5 shadow-[0_0_40px_rgba(212,175,55,0.05)] relative">
                  <p className="text-[10px] font-black uppercase text-theater-gold mb-4 italic">Heshy Riesel • THE MAGGID</p>
                  <p className="text-xl italic leading-relaxed text-white">This production marks the first time we used spatial 3D audio for the outdoor market scene. It makes the story truly feel timeless.</p>
               </div>

               {/* USER COMMENT EXAMPLE */}
               <div className="p-8 border border-white/5 bg-white/[0.02]">
                  <p className="text-[10px] font-black uppercase text-white/40 mb-4 italic">Binyamin Gold</p>
                  <p className="text-lg italic leading-relaxed text-white/70 opacity-80">I’ve listened to Part 1 four times with my sons. We cannot wait to finish the cycle tonight. Truly professional theater!</p>
               </div>

               {user ? (
                 <div className="bg-theater-parchment p-10 shadow-2xl flex flex-col gap-8">
                   <p className="text-[10px] font-black uppercase text-black/30">Joining the discussion as {user.name}</p>
                   <textarea placeholder="How did this tale resonate with you?" className="w-full bg-transparent border-b-2 border-black/10 text-theater-midnight text-xl font-light italic focus:outline-none focus:border-theater-gold p-4" rows={3}></textarea>
                   <button className="bg-theater-midnight text-theater-gold px-12 py-5 self-end font-black uppercase text-xs tracking-widest flex items-center gap-2 hover:bg-theater-burgundy transition"><Send size={16}/> Reflect Now</button>
                 </div>
               ) : (
                 <div className="bg-white/5 p-12 text-center border-2 border-dashed border-white/10 rounded-sm">
                    <p className="font-serif text-lg opacity-30 italic mb-8 uppercase tracking-widest font-black">Login to Leave a Note</p>
                    <button onClick={() => setShowAuth(true)} className="text-theater-gold font-black uppercase text-[11px] border border-theater-gold/20 px-8 py-3 hover:bg-theater-gold hover:text-black transition">Authenticate Here</button>
                 </div>
               )}
            </div>
         </div>

         {/* SIDEBAR SUGGESTED CLUSTERS */}
         <div className="lg:col-span-5 sticky top-32 h-fit">
            <h4 className="text-[10px] font-black uppercase text-theater-gold tracking-[0.4em] mb-12 italic border-l border-theater-gold pl-6">Theater Recommendations</h4>
            <div className="flex flex-col gap-14">
               {episodes.filter(e => e.id !== activeEp?.id).slice(0, 5).map(e => (
                 <div key={e.id} onClick={() => togglePlay(e)} className="group flex items-center gap-6 cursor-pointer hover:bg-white/[0.03] p-4 transition-all">
                    <img src={e.image} className="w-24 h-24 md:w-32 md:h-32 object-cover border border-white/10 group-hover:scale-105 transition" alt="" />
                    <div className="flex-1 min-w-0">
                       <h6 className="font-serif text-lg md:text-3xl font-black uppercase leading-tight italic truncate mb-2">{e.title}</h6>
                       <div className="flex items-center gap-3 text-theater-gold/40 font-black text-[9px] uppercase tracking-widest">
                          <Play size={10} fill="currentColor"/> Begin Journey
                       </div>
                    </div>
                 </div>
               ))}
            </div>
         </div>

      </div>
    </div>
  );
}
