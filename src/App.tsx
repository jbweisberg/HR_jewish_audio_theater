import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, X, Library, CheckCircle2, Menu, Globe, Music, 
  Share2, AlertCircle, Headphones, ArrowRight, Lamp, Loader2, PlayCircle, FastForward, Sparkles, Lock, User, LogIn, Send
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const CACHE_KEY = "jat_master_final_repertory";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState<any>(null);
  
  // Interaction & Identity State
  const [appMode, setAppMode] = useState<'gate' | 'theater'>('gate');
  const [user, setUser] = useState<any>(null); // Logic for persistent history
  const [history, setHistory] = useState<string[]>([]); // Array of IDs listened to
  const [showLogin, setShowLogin] = useState(false);
  
  // Transition logic
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const [nextChoiceList, setNextChoiceList] = useState<any[]>([]);
  const [isSeriesLink, setIsSeriesLink] = useState(false);
  
  // Playback state
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

  // MULTI-GATEWAY CRAWLER + INSTANT CACHE RELOAD
  useEffect(() => {
    async function loadCatalog() {
      // 1. Instant recovery from local cache
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) { setEpisodes(JSON.parse(cached)); setLoading(false); }

      const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`,
        `https://corsproxy.io/?${encodeURIComponent(RSS_URL)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(RSS_URL)}`
      ];

      for (let proxy of proxies) {
        try {
          const res = await fetch(proxy);
          const data = await res.json();
          const xmlRaw = data.contents || data;
          if (typeof xmlRaw !== 'string' || !xmlRaw.includes('<item>')) continue;

          const xml = new DOMParser().parseFromString(xmlRaw, "text/xml");
          const items = Array.from(xml.querySelectorAll("item")).map((item, i) => ({
            id: item.querySelector("guid")?.textContent || `ep-${i}`,
            title: item.querySelector("title")?.textContent || "Production",
            desc: item.querySelector("description")?.textContent?.replace(/<[^>]*>/g, '').slice(0, 180) + "...",
            url: item.querySelector("enclosure")?.getAttribute("url") || "",
            image: item.getElementsByTagName("itunes:image")[0]?.getAttribute("href") || xml.querySelector("image url")?.textContent || "",
          }));

          setEpisodes(items);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(items));
          setLoading(false);
          return; // Kill loop once successful
        } catch (e) { console.warn("Relay rotation..."); }
      }
      setLoading(false);
    }
    loadCatalog();
  }, []);

  // Continuity logic for Chapter Part 2
  useEffect(() => {
    let timer: any;
    if (showNextOverlay && isSeriesLink && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (showNextOverlay && isSeriesLink && countdown === 0) {
      handleContinuityAuto();
    }
    return () => clearInterval(timer);
  }, [showNextOverlay, countdown, isSeriesLink]);

  const handleContinuityAuto = () => {
    if (nextChoiceList[0]) {
      const sequel = nextChoiceList[0];
      setShowNextOverlay(false);
      togglePlay(sequel);
    }
  };

  const togglePlay = (ep?: any) => {
    if (!audioRef.current) return;
    setShowNextOverlay(false);
    setWarned(false);
    setCountdown(10);

    if (ep && ep.id && (!activeEp || ep.id !== activeEp.id)) {
      // Logic for tracking what was listened to
      if (user && !history.includes(ep.id)) setHistory(prev => [...prev, ep.id]);
      
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

    // G-D MOVE INTERCEPT: No cut-off. Menu appears at 10 seconds.
    if (!showNextOverlay && (dur - cur <= 10) && (dur - cur > 1)) {
      matchNextSequentialPart();
    }

    // 1-MINUTE WARNING
    if (!showNextOverlay && dur > 70 && (dur - cur <= 60.5 && dur - cur >= 59.5) && !warned) {
      setWarned(true);
      new Audio(CHIME_URL).play().catch(() => {});
    }
  };

  const matchNextSequentialPart = () => {
    const idx = episodes.findIndex(e => e.id === activeEp.id);
    const baseTitle = activeEp.title.split(/part|chapter|pt|:/i)[0].trim().toLowerCase();
    let choices: any[] = [];
    let linked = false;

    // Search feed list for "Part 2"
    if (idx > 0) {
      const possibleNext = episodes[idx - 1]; 
      if (possibleNext.title.toLowerCase().includes(baseTitle)) {
        choices.push(possibleNext);
        linked = true;
      }
    }
    const fillers = episodes.filter(e => e.id !== activeEp.id && (!linked || e.id !== choices[0].id)).sort(() => 0.5 - Math.random()).slice(0, linked ? 2 : 3);
    setNextChoiceList([...choices, ...fillers]);
    setIsSeriesLink(linked);
    setCountdown(10);
    setShowNextOverlay(true);
  };

  if (loading && episodes.length === 0) return <div className="h-screen bg-[#02040A] flex items-center justify-center text-theater-gold"><Loader2 className="animate-spin" size={40}/></div>;

  // VIEW 1: ENTRANCE
  if (appMode === 'gate') {
    return (
      <div className="fixed inset-0 z-[9000] bg-theater-midnight portal-bg flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-1000">
         <h1 className="jat-insignia-stage select-none">JAT</h1>
         <p className="font-serif text-3xl md:text-5xl font-black uppercase italic tracking-[0.2em] mb-12">Enter the Portal</p>
         <button onClick={() => { setAppMode('theater'); window.scrollTo(0,0); }} className="bg-theater-gold text-black px-16 py-7 font-black uppercase tracking-widest text-sm md:text-lg hover:scale-110 transition shadow-[0_0_100px_#D4AF3744]">Open the Curtains</button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#02040A] text-[#F5F2E8] font-sans selection:bg-theater-gold overflow-x-hidden ${isDimmed ? 'is-bedtime' : ''}`}>
      <audio ref={audioRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} preload="auto" />

      {/* --- AUDIENCE IDENTITY LOGIN --- */}
      {showLogin && (
        <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="max-w-md w-full bg-theater-parchment text-theater-midnight p-10 md:p-14 border-t-[10px] border-theater-gold shadow-2xl relative">
              <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-black/20 hover:text-black"><X/></button>
              <div className="text-center mb-10">
                 <User className="mx-auto mb-4 text-theater-burgundy" size={48} />
                 <h4 className="text-3xl font-serif font-black italic uppercase leading-none">Inner Circle</h4>
              </div>
              <div className="space-y-4">
                 <input placeholder="Family Identity" className="w-full bg-black/5 border-b border-black/10 py-4 px-2 uppercase font-black text-xs tracking-widest focus:outline-none" />
                 <input type="password" placeholder="Gate Passkey" className="w-full bg-black/5 border-b border-black/10 py-4 px-2 uppercase font-black text-xs tracking-widest focus:outline-none" />
                 <button onClick={() => { setUser({ name: 'Member Family' }); setShowLogin(false); }} className="w-full bg-theater-midnight text-theater-gold py-5 uppercase font-black text-sm tracking-widest hover:bg-theater-burgundy transition">Enter theater</button>
                 <p className="text-center text-[10px] uppercase opacity-30 mt-6 font-bold">New Family? Application Link Coming Soon</p>
              </div>
           </div>
        </div>
      )}

      {/* CONTINUITY INTERCEPT */}
      {showNextOverlay && (
        <div className="fixed inset-0 z-[8000] bg-black flex items-center justify-center p-4 md:p-8 animate-in slide-in-from-bottom duration-700">
           <div className="max-w-5xl w-full bg-theater-parchment text-theater-midnight p-8 md:p-14 border-t-[10px] border-theater-gold shadow-2xl">
              <div className="text-center mb-12">
                 <h2 className="text-4xl md:text-8xl font-serif italic font-black uppercase tracking-tighter">
                    {isSeriesLink ? "The Story Continues" : "Your Next Choice"}
                 </h2>
                 <p className="text-[10px] uppercase font-black tracking-[0.4em] opacity-40">Choose from the repertory vault</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {nextChoiceList.map((ep, i) => (
                  <div key={ep.id} onClick={() => togglePlay(ep)} className={`cursor-pointer group p-5 border-2 transition-all duration-500 ${i === 0 && isSeriesLink ? 'bg-white border-theater-gold ring-8 ring-theater-gold/5 scale-105 shadow-xl' : 'bg-white/40 border-transparent opacity-80 hover:opacity-100 grayscale hover:grayscale-0'}`}>
                    <div className="aspect-square overflow-hidden mb-5 shadow-sm border border-black/5"><img src={ep.image} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" /></div>
                    <h4 className="font-serif text-lg md:text-xl font-black italic uppercase leading-none tracking-tight line-clamp-2">{ep.title}</h4>
                    {i === 0 && isSeriesLink && <p className="mt-4 text-[#D4AF37] font-black text-[9px] uppercase tracking-widest animate-pulse">Continuing in {countdown}s</p>}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowNextOverlay(false)} className="mt-14 uppercase font-black text-[11px] opacity-20 hover:opacity-100 transition tracking-[0.6em] block w-full text-center">Back to current production</button>
           </div>
        </div>
      )}

      {/* REPERTORY VIEW */}
      <div id="stage-content">
        <nav className="fixed top-0 w-full z-[200] h-20 md:h-24 bg-[#02040A]/60 backdrop-blur-xl border-b border-white/5 flex items-center px-6 md:px-12">
           <div className="max-w-7xl mx-auto w-full flex justify-between items-center h-full">
              <div className="flex flex-col text-left">
                <h1 className="font-serif text-xl md:text-3xl text-theater-gold leading-none italic font-black uppercase">Jewish Audio Theater</h1>
                <p className="text-[9px] md:text-[10px] uppercase font-black text-white/50 mt-1 uppercase">Timeless Stories Brought to Life</p>
