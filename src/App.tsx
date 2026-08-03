import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, Lamp, Loader2, PlayCircle, FastForward, User, MessageCircle, Crown, LogIn, Save
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_auth_v1";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  
  // Auth & Membership States
  const [user, setUser] = useState<any>(null); // Logic: Null = Visitor, {id, name, type: 'free' | 'member'}
  const [history, setHistory] = useState<any>({}); // Track progress: { "story-id": 450 (seconds) }
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [theaterView, setTheaterView] = useState<'lobby' | 'stage'>('lobby');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCurtain, setShowCurtain] = useState(false);
  const [isDimmed, setIsDimmed] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
          title: item.querySelector("title")?.textContent || "Theater Production",
          desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
          url: item.querySelector("enclosure")?.getAttribute("url") || "",
          image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
          access_level: i < 5 ? 'free' : 'premium' // MONETIZATION PREP: Set first 5 to free
        }));
        setEpisodes(items);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
        setLoading(false);
      } catch (e) { setLoading(false); }
    }
    loadTheater();
  }, []);

  // Save Progress periodically if user is logged in
  useEffect(() => {
    if (user && activeEp && currentTime > 0) {
      const savePoint = Math.floor(currentTime);
      localStorage.setItem(`jat_save_${activeEp.id}`, String(savePoint));
    }
  }, [currentTime, activeEp, user]);

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;

    // Gated Check
    if (ep?.access_level === 'premium' && !user) {
      setShowAuthModal(true);
      return;
    }

    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      setActiveEp(ep);
      setIsPlaying(true);
      audioRef.current.src = ep.url;
      audioRef.current.load();
      
      // Load saved position
      const savedPos = localStorage.getItem(`jat_save_${ep.id}`);
      if (savedPos) audioRef.current.currentTime = parseInt(savedPos);
      
      audioRef.current.play();
      setTheaterView('stage');
    } else if (activeEp) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-theater-midnight flex items-center justify-center"><Loader2 className="animate-spin text-theater-gold" size={40} /></div>;

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden ${isDimmed ? 'filter brightness-50 contrast-125 transition-all' : ''}`}>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- AUTHORITY NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-[1000] h-20 md:h-24 px-6 md:px-12 flex items-center border-b border-white/5 bg-[#02040A]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
          <div className="flex flex-col cursor-pointer" onClick={() => setTheaterView('lobby')}>
             <h1 className="font-serif text-xl md:text-3xl text-theater-gold italic font-black uppercase tracking-tighter">Jewish Audio Theater</h1>
             <p className="text-[9px] uppercase font-black text-white/40 tracking-[0.2em]">Heshy Riesel • The Maggid</p>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {user ? (
              <div className="flex items-center gap-4 bg-theater-gold/5 border border-theater-gold/20 px-4 py-2">
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-theater-gold leading-none">{user.name}</p>
                    <p className="text-[8px] font-bold uppercase opacity-40 leading-none mt-1">{user.type === 'member' ? 'Member Circle' : 'Standard Access'}</p>
                 </div>
                 <User className="text-theater-gold" size={18} />
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 text-theater-gold font-black uppercase text-[10px] tracking-widest bg-white/5 px-6 py-2 hover:bg-theater-gold hover:text-black transition-all">
                <LogIn size={14}/> Enter the Circle
              </button>
            )}
            <a href="mailto:Maggid@jewishaudiotheater.com" className="bg-theater-burgundy text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-theater-gold transition-colors">Contact</a>
          </div>
        </div>
      </nav>

      {/* --- LOBBY VS STAGE MODE --- */}
      {theaterView === 'lobby' ? (
        <LobbyView episodes={episodes} togglePlay={togglePlay} />
      ) : (
        <StageView activeEp={activeEp} episodes={episodes} user={user} togglePlay={togglePlay} duration={duration} currentTime={currentTime} />
      )}

      {/* --- AUTH MODAL (G-D MOVE BRANDING) --- */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[5000] bg-black/90 flex items-center justify-center p-6 animate-in zoom-in duration-300 backdrop-blur-sm">
           <div className="max-w-md w-full bg-theater-parchment p-10 md:p-14 text-theater-midnight shadow-2xl relative border-t-8 border-theater-gold">
             <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-black/20 hover:text-black"><X/></button>
             <h3 className="font-serif text-3xl font-black italic uppercase tracking-tighter mb-8">Access the Theater</h3>
             <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 block">Username / Identity</label>
                   <input className="w-full bg-black/5 border-b-2 border-black/10 py-3 px-4 focus:outline-none focus:border-theater-gold" />
                </div>
                <div>
                   <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-2 block">Security Token</label>
                   <input type="password" className="w-full bg-black/5 border-b-2 border-black/10 py-3 px-4 focus:outline-none focus:border-theater-gold" />
                </div>
                <button 
                  onClick={() => { setUser({id: 1, name: 'Guest Storyteller', type: 'free'}); setShowAuthModal(false); }}
                  className="w-full bg-theater-midnight text-theater-gold py-5 font-black uppercase text-xs tracking-widest hover:bg-theater-burgundy transition"
                >Enter Now</button>
                <div className="flex items-center gap-4 text-center mt-6">
                   <div className="h-[1px] bg-black/10 flex-1"></div>
                   <p className="text-[10px] uppercase font-black opacity-30 tracking-[0.3em]">Become a Member</p>
                   <div className="h-[1px] bg-black/10 flex-1"></div>
                </div>
                <button className="w-full border-2 border-theater-midnight/10 text-theater-midnight/40 py-4 font-black uppercase text-xs">Unlock All Premium Tale</button>
             </div>
           </div>
        </div>
      )}

      {/* --- MASTER PLAYER BAR --- */}
      {activeEp && <MasterPlayerBar ep={activeEp} isPlaying={isPlaying} currentTime={currentTime} duration={duration} togglePlay={togglePlay} isDimmed={isDimmed} setIsDimmed={setIsDimmed} />}
    </div>
  );
}

// --- VIEW COMPONENT: LOBBY (Public Landing) ---
function LobbyView({ episodes, togglePlay }: any) {
  return (
    <div className="pt-40 md:pt-60 px-6">
      <header className="max-w-5xl mx-auto text-center mb-40 animate-in fade-in slide-in-from-bottom duration-1000">
         <h2 className="text-6xl md:text-9xl lg:text-[130px] font-serif font-black italic tracking-tighter leading-none mb-10 text-white uppercase">Heshy Riesel</h2>
         <h3 className="text-xl md:text-4xl font-light italic mb-16 text-white/50 tracking-tight leading-relaxed max-w-4xl mx-auto">Step behind the curtain into a world where <br/> Jewish history and timeless adventures come alive.</h3>
         <button onClick={() => togglePlay(episodes[0])} className="bg-theater-gold text-black px-12 py-6 font-black uppercase text-sm md:text-lg hover:scale-105 transition-transform shadow-[0_0_80px_rgba(212,175,55,0.4)] tracking-widest">Experience Theater</button>
      </header>

      <section className="bg-theater-parchment py-32 px-6 md:px-12 border-y-[20px] border-theater-midnight -mx-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 border-b-2 border-black/5 pb-8">
            <h4 className="text-4xl md:text-[100px] font-serif font-black uppercase tracking-tighter leading-none text-theater-midnight italic">The Archive</h4>
            <div className="flex items-center gap-3 text-theater-burgundy font-black uppercase text-[10px] tracking-widest mt-6 opacity-30"><Library size={18}/> <span>Access Granted to Public Stories</span></div>
          </div>
          <div className="grid md:grid-cols-3 gap-12 md:gap-x-12 md:gap-y-32">
             {episodes.map((ep: any) => (
                <div key={ep.id} className="cursor-pointer group flex flex-col text-left" onClick={() => togglePlay(ep)}>
                  <div className="relative aspect-square overflow-hidden mb-6 shadow-2xl bg-black border-4 border-white transition-all group-hover:border-theater-gold">
                    <img src={ep.image} loading="lazy" className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition duration-1000" alt="" />
                    {ep.access_level === 'premium' && <div className="absolute top-2 right-2 bg-theater-gold p-2 shadow-2xl"><Crown size={12} fill="black" /></div>}
                  </div>
                  <h5 className="text-2xl font-serif font-black text-theater-midnight leading-none uppercase italic">{ep.title}</h5>
                </div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// --- VIEW COMPONENT: THE STAGE (Engagement & Social) ---
function StageView({ activeEp, episodes, user, togglePlay, currentTime, duration }: any) {
  const [comments, setComments] = useState<any[]>([
    { id: 101, user: 'Heshy Riesel', body: 'The production of Stefan involved months of research. The Merchant theme reflects the era truly.', isCreator: true, date: 'Aug 2' },
    { id: 102, user: 'Aidel W.', body: 'My children listen to this every Friday before Shabbos starts. Such a highlight!', date: 'Aug 3' }
  ]);

  return (
    <div className="pt-32 pb-60 px-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-right duration-500">
       <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Main Display */}
          <div className="lg:col-span-7">
             <img src={activeEp?.image} className="w-full aspect-video object-cover shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 mb-10" alt="" />
             <div className="flex items-center gap-2 text-theater-gold font-black uppercase text-[10px] tracking-[0.3em] mb-4 italic leading-none"><Star size={12} fill="#D4AF37"/> High Priority Discovery</div>
             <h2 className="text-4xl md:text-7xl font-serif font-black italic tracking-tighter leading-tight mb-8">{activeEp?.title}</h2>
             <div className="p-8 border border-white/5 bg-white/[0.03] text-white/50 leading-relaxed font-light italic text-xl">
               "{activeEp?.desc}"
             </div>

             {/* COMMUNITY COMMENTS (G-D MOVE) */}
             <div className="mt-20 border-t border-white/5 pt-12">
                <div className="flex items-center justify-between mb-12">
                   <h4 className="font-serif text-3xl font-black italic uppercase flex items-center gap-3"><MessageCircle className="text-theater-gold" size={24}/> The Audience Speaks</h4>
                </div>
                
                <div className="space-y-8 mb-12">
                  {comments.map(c => (
                    <div key={c.id} className={`p-6 border ${c.isCreator ? 'border-theater-gold bg-theater-gold/5 shadow-[0_0_40px_rgba(212,175,55,0.1)]' : 'border-white/5 bg-white/[0.02]'} transition-all`}>
                       <div className="flex items-center gap-3 mb-3">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${c.isCreator ? 'text-theater-gold' : 'text-white/40'}`}>
                            {c.isCreator ? 'From the Stage • ' : ''} {c.user}
                          </span>
                       </div>
                       <p className={`italic ${c.isCreator ? 'text-white' : 'text-white/70'} leading-relaxed`}>{c.body}</p>
                    </div>
                  ))}
                </div>

                {user ? (
                   <div className="bg-theater-parchment p-8 shadow-2xl flex flex-col gap-6">
                      <p className="text-[10px] font-black uppercase text-theater-midnight opacity-40">Posting as {user.name}</p>
                      <textarea className="bg-transparent border-b-2 border-black/10 text-theater-midnight py-2 focus:outline-none focus:border-theater-gold" placeholder="Write your reflection on this production..."></textarea>
                      <button className="bg-theater-midnight text-theater-gold px-8 py-3 font-black uppercase text-[10px] tracking-widest self-end hover:bg-theater-burgundy transition">Publish Note</button>
                   </div>
                ) : (
                   <div className="text-center p-12 border-2 border-dashed border-white/5 bg-white/5">
                      <p className="font-serif text-lg opacity-40 italic mb-6">You must join the membership circle to leave a reflection.</p>
                   </div>
                )}
             </div>
          </div>

          {/* Up Next / Sidebar Curations */}
          <div className="lg:col-span-5 sticky top-32">
             <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-10 border-l-2 border-theater-gold pl-4">Recommendations from the Vault</p>
             <div className="flex flex-col gap-10">
                {episodes.slice(1, 5).map((r: any) => (
                  <div key={r.id} onClick={() => togglePlay(r)} className="group cursor-pointer flex items-center gap-6 border-b border-white/5 pb-10 last:border-0 hover:bg-white/[0.02] transition-colors p-4">
                     <img src={r.image} className="w-28 h-28 object-cover shadow-2xl border border-white/10 group-hover:scale-105 transition" />
                     <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase text-theater-gold mb-2 opacity-50 italic">The Next Journey</p>
                        <h6 className="text-xl md:text-2xl font-serif italic font-black uppercase tracking-tighter group-hover:text-white transition leading-none truncate mb-4">{r.title}</h6>
                        <div className="flex items-center gap-2 text-theater-gold font-bold text-[10px] uppercase">
                          <Play size={10} fill="#D4AF37"/> Experience tale
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

// --- SHARED MASTER PLAYERBAR COMPONENT ---
function MasterPlayerBar({ ep, isPlaying, currentTime, duration, togglePlay, isDimmed, setIsDimmed }: any) {
  const format = (s: number) => {
    const m = Math.floor(s/60); const sc = Math.floor(s%60); return `${m}:${sc<10?'0'+sc:sc}`;
  };

  const isFinalMinute = duration > 0 && (duration - currentTime <= 60);

  return (
    <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-theater-gold px-6 md:px-12 py-10 md:py-14 z-[4000] shadow-[0_-40px_100px_#000] transition-all duration-700 ${isFinalMinute ? 'bg-[#7B0000]' : 'bg-[#02040A]'}`}>
      <div className="max-w-7xl mx-auto">
        {isFinalMinute && <div className="text-center text-white font-black uppercase text-[12px] tracking-[0.5em] mb-4 animate-bounce">1 Minute Left • Completion Imminent</div>}
        <div className="flex items-center gap-8 mb-10">
          <span className="text-[12px] font-black text-theater-gold w-14 text-left font-mono">{format(currentTime)}</span>
          <div className="flex-1 h-[4px] bg-white/10 relative rounded-full">
             <div className="h-full bg-theater-gold transition-all duration-100" style={{ width: `${(currentTime/duration)*100}%` }}></div>
             <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 bg-theater-gold border-4 border-black rounded-full" style={{ left: `${(currentTime/duration)*100}%` }}></div>
          </div>
          <span className="text-[12px] font-black text-white/50 w-14 text-right font-mono">-{format(duration - currentTime)}</span>
        </div>
        <div className="w-full flex justify-between gap-10 items-center">
          <div className="flex items-center gap-8 text-left truncate flex-1 pr-6">
            <img src={ep.image} className="w-16 h-16 md:w-32 md:h-32 object-cover border-2 border-white/20 shadow-2xl" alt="" />
            <div className="truncate">
              <h5 className="text-3xl md:text-6xl font-serif text-theater-gold uppercase italic truncate leading-none mb-1 font-black">{ep.title}</h5>
              <p className="text-[10px] uppercase font-black text-white/40 tracking-[0.2em] font-serif leading-none mt-4">Now On The Stage • Heshy Riesel</p>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <button onClick={() => setIsDimmed(!isDimmed)} className={`p-4 md:p-6 rounded-full border transition-all ${isDimmed ? 'bg-theater-gold text-black border-theater-gold' : 'bg-white/5 text-white/20'}`}>
               <Lamp size={28}/>
            </button>
            <button onClick={() => togglePlay()} className="w-16 h-16 md:w-32 md:h-32 bg-theater-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300">
              {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-1" fill="black" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
