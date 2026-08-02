import React, { useState, useEffect, useRef } from ' COUNTDOWN
      setTimeout(() => {
        // Double check we are still in complete state before starting
        togglereact';
import { 
  Play, Pause, ChevronRight, X, Mail, Bell, Library, @400;700;900&display=swap" rel="stylesheet">
    <script>
      tailwindPlay(next);
      }, 10000);
    } else {
      const randomRec
  Mic2, CheckCircle2, Star, Menu, Globe, Music, Share2, AlertCircle, Play.config = {
        theme: {
          extend: {
            colors: {
              theater: { midnight: '#05s = [...episodes].filter(e => e.id !== activeEp.id).sort(() => 0Circle, Clock
} from 'lucide-react';

const RSS_URL = "https://feed.podbean.0A14', parchment: '#F5F2E8', burgundy: '#4A0E0E.5 - Math.random()).slice(0, 3);
      setRecs(randomRecs);com/handyhesh/feed.xml";
const CHIME_URL = "https://assets.mixkit
      setNextEp(null);
      setStoryComplete(true);
    }
  };

  ', gold: '#D4AF37' }
            },
            fontFamily: { serif: ['Playfair Display', 'serif.co/active_storage/sfx/2869/2869-preview.mp3const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current ='], sans: ['Inter', 'sans-serif'] }
          }
        }
      }
    </ audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setCurrentTime(";

export default function App() {
  const [episodes, setEpisodes] = useState<any[]>([]);
script>
    <style>
      body { background-color: #050A14; color  const [loading, setLoading] = useState(true);
  const [activeEp, setActiveEp] = useState: #F5F2E8; margin: 0; overflow-x: hidden; width: 1current);

    // PARENTAL ALERT LOGIC: Trigger at exactly 60 seconds left
    if (dur<any>(null);
  const [nextEp, setNextEp] = useState<any>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [isPlaying, setIs00%; }
      html { scroll-behavior: smooth; }
      .final-minute-pulse { animation: alert > 65 && (dur - current <= 60.5 && dur - current >= 59.5) && !warnedPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const) {
      setWarned(true);
      const chime = new Audio(CHIME_URL);
-pulse 1.5s infinite; }
      @keyframes alert-pulse { 0% { background- [duration, setDuration] = useState(0);
  const [storyComplete, setStoryComplete] = useState(false);
  const      chime.volume = 0.4;
      chime.play().catch(e => console.log("Ch [countdown, setCountdown] = useState(10);
  const [warned, setWarned] = useState(false);
  constcolor: #4A0E0E; } 50% { background-color: #8B0000; } 1ime blocked"));
    }
  };

  if (loading && episodes.length === 0) return ( [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const audioRef = useRef<
    <div className="h-screen bg-[#050A14] flex items-center justify-00% { background-color: #4A0E0E; } }
      input[type='range']::-webkit-HTMLAudioElement | null>(null);

  const formatTime = (time: number) => {
    constcenter text-[#D4AF37]">
      <div className="w-10 h-10 borderslider-thumb { -webkit-appearance: none; width: 18px; height: 18px; background: #D4AF min = Math.floor(time / 60);
    const sec = Math.floor(time % -2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
37; cursor: pointer; border-radius: 50%; border: 2px solid #050A14; }
    </div>
  );

  const isFinalMinute = duration > 0 && (duration - currentTime <= 6    </style>
  </head>
  <body>
    <div id="root"></div>
    <  };

  useEffect(() => {
    async function loadTheater() {
      try {
        const res = await fetch(`https://0);

  return (
    <div className="min-h-screen bg-[#050A1script type="module" src="/src/main.tsx"></script>
  </body>
</html>
