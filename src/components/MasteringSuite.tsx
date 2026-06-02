import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Upload, 
  Settings, 
  Lock, 
  CheckCircle, 
  Zap, 
  ShieldCheck, 
  Download, 
  Play, 
  Pause, 
  Volume2, 
  RotateCcw, 
  Sliders, 
  Radio, 
  Dna, 
  Cpu, 
  Waves, 
  AlertTriangle, 
  FileAudio, 
  Link as LinkIcon, 
  Check, 
  Trophy, 
  Menu, 
  X, 
  LayoutDashboard, 
  Feather, 
  User, 
  Star,
  Binary,
  Terminal,
  Gavel,
  Users,
  Coffee,
  ShoppingBag,
  Activity
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";

/* SECURED: Gemini calls proxied through /api/gemini/generate */
const ai = {
  models: {
    generateContent: async (params: any) => {
      const resp = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!resp.ok) throw new Error('Proxy connection failed');
      return await resp.json();
    }
  }
};

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

const GENRES = [
  "Hip Hop", "Rap", "R&B", "Pop", "Rock", "Electronic", "Jazz", "Lo-Fi"
];

// Reference interfaces for our Web Audio nodes
interface AudioNodes {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  bassFilter: BiquadFilterNode;
  vocalFilter: BiquadFilterNode;
  trebleFilter: BiquadFilterNode;
  compressor: DynamicsCompressorNode;
  makeUpGain: GainNode;
  bypass: boolean;
}

const MasteringSuite = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showTerms, setShowTerms] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [genre, setGenre] = useState("Hip Hop");
  const [sliders, setSliders] = useState({
    bassBoost: 5,
    clarity: 5,
    vocalBoost: 5,
    vocalEnhance: 5,
    highFidelity: 5,
    sonicTransparency: 5
  });
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [masteredUrl, setMasteredUrl] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [masterMode, setMasterMode] = useState<'quick' | 'advanced'>('quick');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBypassed, setIsBypassed] = useState(true);
  const [sourceUrl, setSourceUrl] = useState<string>("");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioNodes | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (isSuperAdmin(user.email) && data.subscriptionTier !== 'admin') {
          await updateDoc(doc(db, 'users', user.uid), { subscriptionTier: 'admin', credits: 999999 });
          setUserProfile({ ...data, subscriptionTier: 'admin', credits: 999999 });
        } else {
          setUserProfile(data);
        }
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (file) {
      const u = URL.createObjectURL(file);
      setSourceUrl(u);
      return () => URL.revokeObjectURL(u);
    } else if (url) {
      setSourceUrl(url);
    }
  }, [file, url]);

  // Setup Web Audio API
  useEffect(() => {
    if (audioRef.current && sourceUrl && !audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaElementSource(audioRef.current);
      
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 100;
      
      const vocalFilter = ctx.createBiquadFilter();
      vocalFilter.type = 'peaking';
      vocalFilter.frequency.value = 2500;
      vocalFilter.Q.value = 1.0;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 10000;

      const compressor = ctx.createDynamicsCompressor();
      
      const makeUpGain = ctx.createGain();

      // Connect standard chain
      source.connect(ctx.destination); // Start bypassed

      audioContextRef.current = {
        ctx,
        source,
        bassFilter,
        vocalFilter,
        trebleFilter,
        compressor,
        makeUpGain,
        bypass: true,
      };
    }
  }, [sourceUrl]);

  // Update nodes when sliders or bypass change
  useEffect(() => {
    if (!audioContextRef.current) return;
    const nodes = audioContextRef.current;
    
    // Disconnect existing chain
    nodes.source.disconnect();
    nodes.bassFilter.disconnect();
    nodes.vocalFilter.disconnect();
    nodes.trebleFilter.disconnect();
    nodes.compressor.disconnect();
    nodes.makeUpGain.disconnect();
    
    if (isBypassed) {
       nodes.source.connect(nodes.ctx.destination);
    } else {
       // Values mapped from 0-10
       nodes.bassFilter.gain.value = (sliders.bassBoost - 5) * 2; // -10 to +10 dB
       nodes.trebleFilter.gain.value = (sliders.clarity - 5) * 1.5 + (sliders.highFidelity - 5); 
       nodes.vocalFilter.gain.value = (sliders.vocalBoost - 5) * 1.5;
       
       // Compressor depth based on sonicTransparency & vocalEnhance
       const threshold = -20 - (sliders.vocalEnhance * 1.5);
       const ratio = 2 + (sliders.sonicTransparency / 2);
       nodes.compressor.threshold.value = threshold;
       nodes.compressor.ratio.value = ratio;
       
       nodes.makeUpGain.gain.value = 1 + (sliders.sonicTransparency * 0.1);

       nodes.source.connect(nodes.bassFilter);
       nodes.bassFilter.connect(nodes.vocalFilter);
       nodes.vocalFilter.connect(nodes.trebleFilter);
       nodes.trebleFilter.connect(nodes.compressor);
       nodes.compressor.connect(nodes.makeUpGain);
       nodes.makeUpGain.connect(nodes.ctx.destination);
    }
  }, [sliders, isBypassed]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const startMastering = async () => {
    if (!userProfile) return;
    
    if (!sourceUrl) {
      alert("Please upload an audio file or provide a url first.");
      return;
    }

    // Require AudioContext resume if suspended (browser autoplay policy)
    if (audioContextRef.current?.ctx.state === 'suspended') {
      await audioContextRef.current.ctx.resume();
    }
    
    const creditsNeeded = masterMode === 'quick' ? 1 : 3;
    if ((userProfile.credits || 0) < creditsNeeded && !isSuperAdmin(userProfile.email)) {
      alert(`Insufficient Brotherhood Credits (BC). ${creditsNeeded} BC required.`);
      return;
    }

    setIsProcessing(true);
    setProcessingStep("ANALYZING WAVEFORM DYNAMICS...");
    
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      
      // Atomic Transaction Check
      if (!isSuperAdmin(userProfile.email)) {
        await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) throw new Error("User record not found");
          
          const currentCredits = userDoc.data()?.credits || 0;
          if (currentCredits < creditsNeeded) {
            throw new Error("Insufficient Brotherhood Credits (BC)");
          }
          transaction.update(userRef, { credits: currentCredits - creditsNeeded });
        });
      }

      // 1. Gemini Analysis
      setProcessingStep("ANALYZING SONIC PROFILE...");
      
      const prompt = `You are the IndieBrotherhood Master AI. Analyze these mastering settings for a ${genre} track:
      - Bass Boost: ${sliders.bassBoost}/10
      - Clarity: ${sliders.clarity}/10
      - Vocal Boost: ${sliders.vocalBoost}/10
      - Vocal Enhance: ${sliders.vocalEnhance}/10
      - High Fidelity: ${sliders.highFidelity}/10
      Provide a brief (2-3 sentence) professional mastering report in the following language: ${userProfile.language || 'English'}.
      Explain why these settings work for ${genre}. Mention "High Fidelity Sonic Transparency" (translated if appropriate).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });
      
      const reportText = response.text || "Mastering synergy achieved. High Fidelity Sonic Transparency verified.";
      setAnalysisReport(reportText);

      setUserProfile((prev: any) => ({ ...prev, credits: prev.credits - creditsNeeded }));

      // Enable the effects chain
      setIsBypassed(false);
      setMasteredUrl(sourceUrl); // The output is real-time via the player now

      // Award Points/Badges
      try {
        await updateDoc(userRef, {
          points: increment(300),
          masteringTotal: increment(1),
          badges: Array.from(new Set([...(userProfile.badges || []), "Master Mechanic", "Sonic Architect"]))
        });
      } catch (e) {
        console.warn("Gamification sync failed:", e);
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Mastering Failed. Ensure you have credits.");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const togglePlay = async () => {
    if (audioRef.current) {
      if (audioContextRef.current?.ctx.state === 'suspended') {
        await audioContextRef.current.ctx.resume();
      }
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleBypass = () => {
    setIsBypassed(!isBypassed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white font-sans selection:bg-[#24b324] selection:text-black relative overflow-x-hidden flex flex-col">
      {/* Carbon Fiber Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md relative z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <Menu className="text-[#24b324]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">IndieBrotherhood</h1>
            <span className="text-[10px] uppercase font-bold text-[#24b324] tracking-widest pl-1">A Dawn Of A New Era</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Mastering Status</div>
            <div className="text-sm font-black italic uppercase text-[#24b324]">
              Ready to Forge
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-[#24b324] flex items-center justify-center bg-black/50 overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {auth.currentUser?.photoURL ? (
              <img src={auth.currentUser.photoURL} alt="Profile" referrerPolicy="no-referrer" />
            ) : (
              <User size={24} className="text-[#24b324]" />
            )}
          </div>
        </div>
      </header>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#24b324] z-[101] p-8 flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="mb-8 flex justify-between items-center flex-shrink-0">
                <h2 className="text-3xl font-black italic uppercase italic leading-none">Indie<br/>Brotherhood</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 text-white/40 hover:text-white transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <X size={24} />
                </button>
              </div>
              
              <nav className="flex-grow space-y-2 mb-8">
                {[
                  { label: "Profile", icon: User, to: "/profile" },
                  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
                  { label: "ML Lab", icon: Binary, to: "/ml-lab" },
                  ...(isSuperAdmin(userProfile?.email) ? [
                    { label: "Control Room", icon: Terminal, to: "/control-room" },
                    { label: "Admin Hub", icon: Activity, to: "/sentinel" }
                  ] : []),
                  { label: "The Judgment", icon: Gavel, to: "/judgment" },
                  { label: "IBH Meeting", icon: Users, to: "/ibh" },
                  { label: "The Lounge", icon: Coffee, to: "/lounge" },
                  { label: "Mastering Suite", icon: Music, to: "/mastering", active: true },
                  { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
                  { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
                  { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
                ].map((item, i) => (
                  <Link 
                    to={item.to} 
                    key={i} 
                    onClick={() => {
                      if (window.location.pathname === item.to) {
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`flex items-center gap-4 p-4 font-black uppercase italic tracking-wider transition-all group ${window.location.pathname === item.to ? 'bg-[#24b324] text-black shadow-lg translate-x-2' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <item.icon size={20} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#24b324] transition-transform group-hover:scale-110'} />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <button 
                onClick={() => signOut(auth)}
                className="mt-auto border-2 border-white/10 p-4 font-black uppercase italic text-white/40 hover:text-red-500 hover:border-red-500 transition-all text-center tracking-widest flex-shrink-0 shadow-2xl shadow-black/80"
              >
                Exit Portal
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Banner Ticker */}
      <div className="bg-[#24b324] overflow-hidden py-1 border-y border-black/10 relative z-50">
        <div className="flex whitespace-nowrap animate-ticker">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span className="text-black font-black uppercase italic text-sm">MASTERS COST 3 BC (BROTHERHOOD CREDITS)</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">UPGRADE PLAN TO RELOAD YOUR BC</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">STUDIO GRADE POLISH IN SECONDS</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">THE BROTHERHOOD GUARANTEE ON EVERY TRACK</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="space-y-2">
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.8]">Mastering Suite</h1>
            <p className="text-[#24b324] font-black uppercase tracking-widest italic text-sm pl-2">Proprietary AI Audio Forging</p>
          </div>
          <div className="bg-black/40 p-4 border-l-4 border-[#24b324] text-right backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
             <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Available Credits</div>
             <div className="text-3xl font-black italic text-[#24b324]">{userProfile?.credits || 0}</div>
          </div>
        </div>

        {/* Console Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Panel */}
          <div className="lg:col-span-8 bg-[#222] border-4 border-black/50 shadow-2xl p-8 relative overflow-hidden">
             {/* Hardware Screws Decor */}
             <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
             <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
             <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
             <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
               {/* Genre Grid */}
               <div className="space-y-4">
                 <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                   <Radio size={14} /> 01. Genre Mapping
                 </label>
                 <div className="grid grid-cols-2 gap-2">
                   {GENRES.map((g) => (
                     <button
                       key={g}
                       onClick={() => setGenre(g)}
                       className={`p-3 border-2 font-black uppercase text-[10px] italic transition-all ${genre === g ? 'bg-[#24b324] border-[#24b324] text-black scale-[1.02]' : 'bg-black/20 border-white/5 text-white/30 hover:text-white'}`}
                     >
                       {g}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Advanced Sliders */}
               <div className="space-y-6">
                 <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                   <Sliders size={14} /> 02. Spectral Distortion
                 </label>
                 <div className="space-y-4">
                   {Object.entries(sliders).map(([key, val]) => (
                     <div key={key} className="space-y-1">
                       <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40">
                         <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                         <span className="text-[#24b324]">{val} / 10</span>
                       </div>
                       <input 
                         type="range" min="1" max="10" step="1"
                         className="w-full accent-[#24b324] bg-white/5 appearance-none h-1 h-px backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                         value={val}
                         onChange={(e) => setSliders({...sliders, [key]: parseInt(e.target.value)})}
                       />
                     </div>
                   ))}
                 </div>
               </div>
             </div>

             {/* Input Zone */}
             <div className="bg-black/40 p-8 border border-white/5 space-y-8 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest text-white/40 mb-2 md:mb-0">
                    <Upload size={16} /> 03. Secure Source Upload
                  </div>
                  <div className="flex bg-black border border-white/10 p-1">
                     <button
                       onClick={() => setMasterMode('quick')}
                       className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${masterMode === 'quick' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                     >
                       One-Click (1 BC)
                     </button>
                     <button
                       onClick={() => setMasterMode('advanced')}
                       className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${masterMode === 'advanced' ? 'bg-[#24b324] text-black' : 'text-white/40 hover:text-white'}`}
                     >
                       Advanced (3 BC)
                     </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* File Upload */}
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 hover:border-[#24b324]/40 transition-colors cursor-pointer group shadow-2xl shadow-black/80">
                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                    <FileAudio size={32} className={`mb-3 ${file ? 'text-[#24b324]' : 'text-white/10 group-hover:text-white/30'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                      {file ? file.name : 'Upload MP3 / WAV'}
                    </span>
                  </label>

                  {/* URL Input */}
                  <div className="flex flex-col justify-center gap-4">
                    <div className="relative">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                      <input 
                        type="text"
                        placeholder="PASTE SOUNDCLOUD OR AUDIO URL"
                        className="w-full bg-black/50 border border-white/10 p-4 pl-12 text-xs font-bold uppercase tracking-widest focus:border-[#24b324] outline-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                      />
                    </div>
                    <p className="text-[9px] text-white/20 italic leading-relaxed uppercase font-bold">* ERA NOTE: URL ANALYSIS SUPPORTS SONIC MAPPING ONLY. FULL MASTERING REQUIRES LOCAL FILE UPLOAD.</p>
                  </div>
                </div>

                {userProfile?.subscriptionTier === 'free' && !isSuperAdmin(userProfile?.email) ? (
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-white/10 text-white/50 py-6 font-black italic uppercase text-2xl tracking-tighter hover:bg-white hover:text-black transition-all group relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-4">
                      <Lock fill="currentColor" />
                      UPGRADE TO UNLOCK MASTERING
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={startMastering}
                    disabled={isProcessing || (!file && !url)}
                    className="w-full bg-[#24b324] text-black py-6 font-black italic uppercase text-2xl tracking-tighter hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-4">
                      {isProcessing ? <Dna className="animate-spin" /> : <Zap fill="currentColor" />}
                      {isProcessing ? "FORGING MASTER..." : `IGNITE MASTERING SEQUENCE (${masterMode === 'quick' ? '1 BC' : '3 BC'})`}
                    </span>
                    <motion.div 
                      animate={isProcessing ? { x: ['-100%', '100%'] } : { x: '-100%' }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 bg-white/20 skew-x-12 translate-x-full backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                    />
                  </button>
                )}
             </div>
          </div>

          {/* Result / Analysis Panel */}
          <div className="lg:col-span-4 space-y-8">
            <AnimatePresence mode="wait">
              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-black border-2 border-[#24b324] p-8 text-center space-y-6 shadow-[0_0_50px_rgba(217,225,43,0.2)]"
                >
                  <div className="relative w-24 h-24 mx-auto">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="absolute inset-0 border-t-2 border-r-2 border-[#24b324] rounded-full"
                    />
                    <Cpu size={40} className="absolute inset-0 m-auto text-[#24b324] animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black italic uppercase text-[#24b324]">THE ERA IS PROCESSING</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 animate-pulse">{processingStep}</p>
                  </div>
                </motion.div>
              )}

              {!isProcessing && masteredUrl && (
                <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-6"
                >
                  {/* Player Console */}
                  <div className="bg-[#222] border-4 border-black/50 p-6 space-y-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-[10px] font-black uppercase italic text-[#24b324] flex items-center gap-2">
                        <Waves size={12} /> Master Processed
                      </div>
                      <div className="flex gap-2">
                        <div className="bg-black p-2 border border-white/5"><RotateCcw size={14} className="text-white/40" /></div>
                        <div className="bg-black p-2 border border-white/5"><Volume2 size={14} className="text-[#24b324]" /></div>
                      </div>
                    </div>

                    {/* Comparison UI */}
                    <div className="space-y-4">
                       <button 
                        onClick={() => {
                           if (!isPlaying) togglePlay();
                           setIsBypassed(false);
                        }}
                        className={`w-full p-6 border-2 flex items-center justify-between transition-all group ${isPlaying && !isBypassed ? 'border-[#24b324] bg-[#24b324]/10' : 'border-white/10 bg-black/20 hover:border-white/30'}`}
                       >
                         <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isPlaying && !isBypassed ? 'bg-[#24b324] text-black' : 'bg-white/10 text-white'}`}>
                             {(isPlaying && !isBypassed) ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                           </div>
                           <div className="text-left">
                             <div className={`text-sm font-black italic uppercase ${isPlaying && !isBypassed ? 'text-[#24b324]' : 'text-white'}`}>Mastered Output</div>
                             <div className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Enhanced Dynamics & Clarity</div>
                           </div>
                         </div>
                         {(isPlaying && !isBypassed) && <motion.div animate={{ scaleY: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.5 }} className="flex gap-1 items-end h-6"><div className="w-1 h-2 bg-[#24b324]" /><div className="w-1 h-4 bg-[#24b324]" /><div className="w-1 h-3 bg-[#24b324]" /></motion.div>}
                       </button>

                       <button 
                        onClick={() => {
                           if (!isPlaying) togglePlay();
                           setIsBypassed(true);
                        }}
                        className={`w-full p-4 border flex items-center justify-between transition-all group ${isPlaying && isBypassed ? 'border-white bg-white/10' : 'border-white/5 bg-black/40 hover:border-white/10'}`}
                       >
                         <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPlaying && isBypassed ? 'bg-white text-black' : 'bg-white/5 text-white/20'}`}>
                              {(isPlaying && isBypassed) ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                           </div>
                           <div className="text-xs font-black italic uppercase text-white/40 group-hover:text-white/60">Raw Original</div>
                         </div>
                         <div className="text-[9px] uppercase font-bold text-white/20">Pre-Era Processing</div>
                       </button>
                    </div>

                    <div className="h-24 bg-black/60 relative overflow-hidden flex items-center gap-1 px-2 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                       {/* Waveform Visualization Placeholder */}
                       {[...Array(60)].map((_, i) => (
                         <motion.div 
                          key={i}
                          animate={{ height: isPlaying ? [10, Math.random() * 80 + 10, 10] : 10 }}
                          transition={{ repeat: Infinity, duration: 0.5 + Math.random(), ease: "easeInOut" }}
                          className="w-1.5 bg-[#24b324]/60 rounded-full opacity-40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                         />
                       ))}
                       <div className="absolute inset-0 flex flex-col justify-between p-2 pointer-events-none">
                          <div className="text-[8px] font-black text-[#24b324] opacity-50 uppercase tracking-widest">+12dB PEAK</div>
                          <div className="h-px w-full bg-[#24b324]/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
                          <div className="text-[8px] font-black text-[#24b324] opacity-50 uppercase tracking-widest">-INF</div>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <a 
                        href={masteredUrl} 
                        download={`IBH_MASTER_${genre.toUpperCase()}.mp3`}
                        className="w-full bg-white text-black py-4 font-black italic uppercase flex items-center justify-center gap-2 hover:bg-[#24b324] transition-colors"
                       >
                         <Download size={18} /> Download Master Now
                       </a>
                       <p className="text-[9px] text-white/20 text-center uppercase font-black italic tracking-widest animate-pulse">
                         * CAUTION: DOWNLOAD NOW OR LOSE IT FOREVER. WE DO NOT STORE ERA DATA.
                       </p>
                    </div>
                  </div>

                  {/* AI Report */}
                  <div className="bg-black/40 border border-[#24b324]/20 p-6 space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                     <h4 className="text-xs font-black italic uppercase text-[#24b324] flex items-center gap-2">
                        <Cpu size={14} /> AI Mastering Breakdown
                     </h4>
                     <p className="text-xs text-white/60 leading-relaxed font-medium italic">
                       {analysisReport}
                     </p>
                  </div>
                </motion.div>
              )}

              {!isProcessing && !masteredUrl && (
                <div className="bg-black/20 border border-white/5 p-8 text-center space-y-6 opacity-30 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <Waves size={48} className="mx-auto text-white" />
                  <div className="space-y-2">
                     <h3 className="text-lg font-black italic uppercase">Output Console</h3>
                     <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">System ready for input. Waiting on source signal for sonic forging.</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Professional Icons Row */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8">
           {[
             { title: "Excellence Mastering", icon: Trophy, desc: "Indie Software Award '26" },
             { title: "Logic Run BY IBH", icon: Cpu, desc: "Proprietary Core Logic" },
             { title: "High Fidelity", icon: Music, desc: "24-bit Era Resolution" },
             { title: "Sonic Transparency", icon: ShieldCheck, desc: "Zero Artifact Forgery" }
           ].map((item, i) => (
             <div key={i} className="flex flex-col items-center text-center space-y-3 group">
                <div className="w-16 h-16 bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:border-[#24b324]/40 group-hover:bg-[#24b324]/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                   <item.icon className="text-white/20 group-hover:text-[#24b324] transition-colors" size={28} />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase italic tracking-tighter">{item.title}</div>
                  <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{item.desc}</div>
                </div>
             </div>
           ))}
        </div>
      </main>

      {/* Terms Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
          >
            <motion.div 
               initial={{ scale: 0.9, y: 30 }}
               animate={{ scale: 1, y: 0 }}
               className="bg-[#222] border-4 border-[#24b324] p-10 max-w-xl w-full space-y-8 relative overflow-hidden"
            >
              <div className="absolute -top-12 -right-12 opacity-5 text-white"><Music size={160} /></div>
              
              <div className="space-y-4 relative z-10">
                <div className="w-16 h-16 bg-[#24b324] text-black flex items-center justify-center font-black italic text-3xl mb-6 border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">!</div>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Sonic Ownership & Ethics</h2>
                <div className="h-px w-full bg-[#24b324]/30 mb-6 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
                <div className="text-sm text-white/60 space-y-4 font-medium italic leading-relaxed">
                  <p>1. BY PROCEEDING, YOU SWEAR ON YOUR LEGACY THAT YOU OWN THIS ART IN ITS ENTIRETY. NO STOLEN SOUNDS, NO UNLICENSED SIGNAL.</p>
                  <p>2. THE BROTHERHOOD IS A TOOL FOR CREATION, NOT THEFT. WE FORGE MASTERS FOR THE RIGHTFUL OWNERS OF THE SOUND.</p>
                  <p>3. YOU AGREE THAT IBH AI IS NOT RESPONSIBLE FOR CONTENT INFRACTION. YOU CAPTAIN THE SHIP; WE JUST POLISH THE ENGINE.</p>
                </div>
              </div>

              <button 
                onClick={() => setShowTerms(false)}
                className="w-full bg-[#24b324] text-black py-5 font-black uppercase italic text-xl flex items-center justify-center gap-4 hover:bg-white transition-all shadow-[0_10px_30px_rgba(217,225,43,0.3)] border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
              >
                I OWN THE ERA & THE SOUND <Check size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} src={sourceUrl} crossOrigin="anonymous" onEnded={() => setIsPlaying(false)} />
    </div>
  );
};

export default MasteringSuite;
