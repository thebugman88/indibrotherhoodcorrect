import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Feather, 
  Music, 
  Upload, 
  Settings, 
  Lock, 
  Zap, 
  ShieldCheck, 
  Download, 
  Trash2,
  AlertTriangle,
  Check,
  Trophy,
  Menu,
  X,
  LayoutDashboard,
  User,
  Star,
  Sparkles,
  Edit3,
  Lightbulb,
  FileText,
  Skull,
  FileDown,
  Cpu,
  Copy,
  RotateCcw,
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
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleGenAI, Type } from "@google/genai";

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

const GENRES = [
  "Hip Hop", "Rap", "R&B", "Pop", "Rock", "Country", "Drill", "Trap"
];

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

const LyricPro = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [genre, setGenre] = useState("Rap");
  const [isExplicit, setIsExplicit] = useState(false);
  const [showExplicitDisclaimer, setShowExplicitDisclaimer] = useState(false);
  const [projectType, setProjectType] = useState<'full' | 'finish' | 'idea'>('full');
  const [inputText, setInputText] = useState("");
  const [outputs, setOutputs] = useState<{ v1: string; v2: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [progress, setProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/');
        return;
      }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setUserProfile(snap.data());
      }
    };
    fetchUser();
    
    // Privacy clean: Clear state on unmount
    return () => {
      setInputText("");
      setOutputs(null);
    };
  }, [navigate]);

  const toggleExplicit = (val: boolean) => {
    setIsExplicit(val);
    if (val) setShowExplicitDisclaimer(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingStep("EXTRACTING METADATA...");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
      setLoadingStep("");
    };
    reader.readAsText(file);
  };

  const generateLyrics = async () => {
    if (!userProfile) {
      alert("System Syncing... Please wait for profile authentication.");
      return;
    }
    
    // FREE for basic/legacy/supreme, EXCEPT for Elite Full Write which costs 1 BC.
    let creditsNeeded = 0;
    if (projectType === 'full' || (!['basic', 'legacy', 'supreme', 'admin'].includes(userProfile.subscriptionTier))) {
        creditsNeeded = 1;
    }
    
    if (userProfile.credits < creditsNeeded && !isSuperAdmin(userProfile.email)) {
      alert(`Insufficient Brotherhood Credits (BC). This action requires ${creditsNeeded} BC.`);
      return;
    }

    if (!inputText && projectType !== 'idea') {
      alert("Provide some input or an idea first.");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setLoadingStep("SCRAPING BILLBOARD TRENDS...");
    
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      
      if (creditsNeeded > 0 && !isSuperAdmin(userProfile.email)) {
         // Perform atomic debit before generating 
         await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User not found");
            const currentCredits = userDoc.data()?.credits || 0;
            if (currentCredits < creditsNeeded) {
               throw new Error("Insufficient credits in database.");
            }
            transaction.update(userRef, { credits: currentCredits - creditsNeeded });
         });
      }
      setProgress(20);
      setLoadingStep("GATHERING LYRICAL SEEDS...");
      
      const systemPrompt = `You are the IndieBrotherhood Elite Lyrical Engine. Your mission is to facilitate Full-Length, Top-Tier Songwriting.
      
      CORE DIRECTIVES:
      1. Zero Repetition Policy: DO NOT repeat lines or verses. Deliver a wide range of vocabulary and sophisticated concepts.
      2. Full-Length Architecture: You MUST output a complete song structure (Intro, Verse 1, Pre-Chorus, Chorus, Verse 2, Pre-Chorus, Chorus, Bridge, Chorus, Outro). Do not output half a song.
      3. Genre Integrity: Master the specific cadence of ${genre}.
      4. Explicit Policy: ${isExplicit ? "UNLEASHED mode. Raw, unfiltered expression. Use explicit language naturally if it fits the genre." : "CLEAN mode. Radio-ready optimization. Absolutely no profanity."}
      5. Project Context: ${projectType === 'full' ? 'Elite Full Write. Prioritize complex internal rhymes, double entendres, and top-tier narrative progression.' : projectType === 'finish' ? 'Semantic Synthesis. Finish the provided bars with high poetic quality without abandoning the established structure.' : 'Idea Incubator. Generate a full narrative and elite layout from a simple thought.'}
      
      TECHNICAL REQUIREMENTS:
      - Internal Rhyme Score: Maximum
      - Vocabulary Breadth: Elite (use rare, impactful wording)
      - Metaphorical Depth: High (avoid basic or cliché tropes)
      - Output TWO distinct full-length variations (Style A: Modern Era / Style B: Brotherhood Classic) in a strict JSON format.
      
      Format MUST strictly be parsable JSON: { "v1": "Full lyrics for variation 1", "v2": "Full lyrics for variation 2" }`;

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userProfile.uid}`
      };

      const finalPrompt = `System: ${systemPrompt}\n\nLanguage: ${userProfile.language || 'English'}\n\nThe output MUST be in the following language: ${userProfile.language || 'English'}. Adapt the cultural nuances, slang, and metaphors to perfectamente fit this dialect while maintaining the elite IndieBrotherhood standard.
      
      User Input: ${inputText || "Generate an elite idea for a " + genre + " song."}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: finalPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              v1: { type: Type.STRING },
              v2: { type: Type.STRING }
            },
            required: ["v1", "v2"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Lyric engine returned empty result.");
      }

      setProgress(70);
      setLoadingStep("PERFECTING SONIC FLOW...");

      const data = JSON.parse(responseText);
      setOutputs(data);

      // Award Points/Badges
      try {
        await updateDoc(userRef, {
          points: increment(200),
          lyricsGenerated: increment(1),
          badges: Array.from(new Set([...(userProfile.badges || []), "Era Lyricist", "Soul Scribe"]))
        });
      } catch (e) {
        console.warn("Gamification sync failed:", e);
      }

      setProgress(100);
      setLoadingStep("FORGE COMPLETE.");

      setUserProfile((prev: any) => ({ ...prev, credits: prev.credits - creditsNeeded }));

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Era connection failed. Ensure you have credits.");
    } finally {
      setIsGenerating(false);
      setLoadingStep("");
    }
  };

  const downloadLyrics = (content: string, version: string) => {
    // Audit log (Local only)
    console.log(`[IBH-SEC] Transferring ownership for Variation ${version}`);
    
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `IBH_LYRICS_${genre.toUpperCase()}_${version}.txt`;
    document.body.appendChild(element);
    element.click();
    
    // Ownership reinforcement alert
    alert("DOWNLOADED. 100% OWNERSHIP CLAIMED. DATA PURGED FROM IBH SERVERS.");
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    alert("LYRICS COPIED. IDENTITY SECURED.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white font-sans selection:bg-[#24b324] selection:text-black relative overflow-x-hidden flex flex-col">
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
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Lyric Pro Active</div>
            <div className="text-sm font-black italic uppercase text-[#24b324]">
              Engine Status: Peak
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
                  { label: "Mastering Suite", icon: Music, to: "/mastering" },
                  { label: "Lyric Pro", icon: Feather, to: "/lyrics", active: true },
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
      <div className="bg-[#24b324] overflow-hidden py-1 border-y border-black/10 relative z-40">
        <div className="flex whitespace-nowrap animate-ticker">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-12 px-6">
              <span className="text-black font-black uppercase italic text-sm">DOWNLOAD ANY COPY YOU WANT - IT WILL NOT BE SAVED</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">PRIVACY IS PARA MOUNT: NO DATA STORED</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">100% OWNERSHIP TRANSFERRED ON DOWNLOAD</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 md:p-12 relative z-10 w-full flex-grow">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="space-y-2">
             <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.8] flex items-center gap-4">
               Lyric Pro <Feather size={48} className="text-[#24b324]" />
             </h1>
             <p className="text-[#24b324] font-black uppercase tracking-widest italic text-sm pl-2">Semantic Soul Processing</p>
          </div>
          <div className="bg-black/40 p-4 border-l-4 border-[#24b324] text-right backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
             <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Brotherhood Credits (BC)</div>
             <div className="text-3xl font-black italic text-[#24b324]">{userProfile?.credits || 0}</div>
             {(isSuperAdmin(userProfile?.email) || userProfile?.isDev) && (
               <div className="mt-2 text-[8px] font-black text-[#24b324] uppercase tracking-widest bg-black/50 px-2 py-1 flex items-center gap-1 justify-end backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                 <ShieldCheck size={10} /> Partner Engine Active
               </div>
             )}
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            
            {/* Control Panel */}
            <div className="lg:col-span-8 bg-[#222] border-4 border-black/50 p-8 space-y-8 shadow-2xl relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Genre */}
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                    <Music size={14} /> 01. Genre Pocket
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GENRES.map(g => (
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

                {/* Explicit Toggle */}
                <div className="space-y-4">
                   <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                    <Skull size={14} /> 02. Explicit Mode
                  </label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => toggleExplicit(true)}
                      className={`flex-1 p-4 border-2 font-black uppercase italic text-sm transition-all ${isExplicit ? 'bg-red-600 border-red-600 text-white' : 'bg-black/20 border-white/5 text-white/30 hover:text-red-500'}`}
                    >
                      UNLEASHED
                    </button>
                    <button 
                      onClick={() => toggleExplicit(false)}
                      className={`flex-1 p-4 border-2 font-black uppercase italic text-sm transition-all ${!isExplicit ? 'bg-[#24b324] border-[#24b324] text-black' : 'bg-black/20 border-white/5 text-white/30 hover:text-white'}`}
                    >
                      CLEAN
                    </button>
                  </div>
                  <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest italic leading-relaxed">
                    * IBH NOTE: EXPLICIT MODE ENABLES UNFILTERED ARTISTIC FREEDOM.
                  </p>
                </div>
              </div>

              {/* Project Type */}
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                  <Settings size={14} /> 03. Project Trajectory
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'full', label: 'ELITE FULL WRITE', icon: Sparkles, desc: 'TikTok Ready / Catchy', locked: userProfile?.subscriptionTier === 'free' && !isSuperAdmin(userProfile?.email) },
                    { id: 'finish', label: 'FINISH MY VIBE', icon: Edit3, desc: 'Complete existing bars', locked: false },
                    { id: 'idea', label: 'IDEA INCUBATOR', icon: Lightbulb, desc: 'From a simple thought', locked: false }
                  ].map(type => (
                    <button 
                      key={type.id}
                      onClick={() => {
                        if (type.locked) {
                          alert("Elite Full Write requires Basic Tier or higher. Please upgrade in Dashboard.");
                        } else {
                          setProjectType(type.id as any);
                        }
                      }}
                      className={`p-6 border-4 text-left transition-all relative overflow-hidden ${projectType === type.id ? 'bg-[#24b324]/10 border-[#24b324] scale-[1.02]' : 'bg-black/20 border-black/40 text-white/30 hover:border-white/20'} ${type.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {type.locked && (
                         <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                            <Lock size={16} className="text-white/50 mb-1" />
                            <span className="text-[8px] font-black uppercase text-white/50 tracking-widest">Locked (Upgrade)</span>
                         </div>
                      )}
                      <type.icon className={projectType === type.id ? 'text-[#24b324] mb-2' : 'text-white/20 mb-2'} size={24} />
                      <div className={`text-xs font-black italic uppercase leading-none mb-1 ${projectType === type.id ? 'text-[#24b324]' : 'text-white'}`}>{type.label}</div>
                      <div className="text-[9px] uppercase font-bold tracking-widest">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Box */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                    <Edit3 size={14} /> 04. Description or Idea
                  </label>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-black uppercase italic text-white/20 hover:text-[#24b324] flex items-center gap-2 transition-colors"
                  >
                    <Upload size={12} /> UPLOAD PDF / TXT
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.txt" onChange={handleFileUpload} />
                </div>
                <textarea 
                  placeholder={projectType === 'full' ? 'Describe the mood, topic, or story of the track...' : projectType === 'finish' ? 'Paste the lyrics you want us to finalize...' : 'Type your simple idea here...'}
                  className="w-full bg-black/40 border-2 border-white/5 h-64 p-8 text-sm font-medium tracking-wide focus:border-[#24b324] outline-none transition-all resize-none font-sans backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              <button 
                onClick={generateLyrics}
                disabled={isGenerating || (!inputText && projectType !== 'idea')}
                className="w-full bg-[#24b324] text-black py-6 font-black italic uppercase text-3xl tracking-tighter hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
              >
                <span className="relative z-10 flex items-center justify-center gap-4">
                  {isGenerating ? <Zap className="animate-spin" /> : <Feather fill="currentColor" />}
                  {isGenerating ? "FORGING BARS..." : "IGNITE SEMANTIC ENGINE (1 BC)"}
                </span>
                <motion.div 
                  animate={isGenerating ? { x: ['-100%', '100%'] } : { x: '-100%' }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="absolute inset-0 bg-white/30 skew-x-12 translate-x-full backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                />
              </button>
            </div>

            {/* Side Sidebar / Status */}
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-black/40 border-l-4 border-[#24b324] p-6 space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <h4 className="text-xs font-black italic uppercase text-[#24b324] flex items-center gap-2">
                     <Lock size={14} /> Brotherhood Security
                  </h4>
                  <p className="text-[11px] text-white/40 leading-relaxed font-bold uppercase tracking-widest">
                    ONCE DOWNLOADED, YOU HAVE ACCEPTED 100% OWNERSHIP. WE DO NOT SAVE DATA. IF IT'S NOT SAVED IN YOUR PORTAL, IT EXPIRES FROM THE UNIVERSE.
                  </p>
               </div>

               <AnimatePresence>
                 {isGenerating && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-[#222] border-4 border-[#24b324] p-10 flex flex-col items-center justify-center text-center space-y-8"
                    >
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          className="w-24 h-24 border-2 border-[#24b324]/20 border-t-[#24b324] rounded-full shadow-2xl shadow-black/80"
                        />
                        <Zap size={32} className="absolute inset-0 m-auto text-[#24b324] animate-pulse" />
                      </div>
                      <div className="space-y-2 w-full">
                        <h3 className="text-xl font-black italic uppercase text-[#24b324]">THE ERA IS PROCESSING</h3>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden mb-2 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-[#24b324] shadow-[0_0_15px_rgba(217,225,43,0.5)]"
                          />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                          <span className="text-[#24b324]">{progress}%</span>
                          <span className="text-white/40 animate-pulse">{loadingStep}</span>
                        </div>
                      </div>
                    </motion.div>
                 )}
               </AnimatePresence>
            </div>
        </div>

        {/* Output Section */}
        <AnimatePresence>
          {outputs && !isGenerating && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24"
            >
              {[
                { label: "VERSION A: THE ERA STYLE", content: outputs.v1 },
                { label: "VERSION B: THE BROTHERHOOD STYLE", content: outputs.v2 }
              ].map((ver, i) => (
                <div key={i} className="bg-[#222] border-4 border-black/50 p-8 flex flex-col gap-6 group hover:border-[#24b324]/30 transition-all">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black italic uppercase text-[#24b324]">{ver.label}</h3>
                    <button 
                      onClick={() => downloadLyrics(ver.content, i === 0 ? 'A' : 'B')}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      <FileDown size={20} />
                    </button>
                  </div>
                  <div className="bg-black/40 p-6 whitespace-pre-wrap text-xs md:text-sm font-medium leading-relaxed italic text-white/80 h-96 overflow-y-auto border border-white/5 font-sans scrollbar-hide backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    {ver.content}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => copyToClipboard(ver.content)}
                      className="bg-white/5 border border-white/10 text-white p-4 font-black italic uppercase text-xs flex items-center justify-center gap-2 hover:bg-white/10 transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                    >
                      <Copy size={14} /> COPY BAR
                    </button>
                    <button 
                      onClick={() => downloadLyrics(ver.content, i === 0 ? 'A' : 'B')}
                      className="bg-white text-black p-4 font-black italic uppercase text-xs flex items-center justify-center gap-2 hover:bg-[#24b324] transition-colors"
                    >
                      <Download size={14} /> CLAIM RIGHTS
                    </button>
                  </div>
                </div>
              ))}
              <div className="md:col-span-2 flex justify-center pt-8">
                 <button 
                  onClick={generateLyrics}
                  className="bg-transparent border-2 border-[#24b324] text-[#24b324] px-12 py-4 font-black italic uppercase text-xl hover:bg-[#24b324] hover:text-black transition-all flex items-center gap-4"
                >
                  <RotateCcw size={20} /> RE-GENERATE ERA DATA (1 BC)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Professional Icons Row */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-4 gap-12 border-t border-white/5 pt-12 text-center md:text-left">
           {[
             { title: "ADVANCED LYRICS 2026", icon: Sparkles, sub: "Deep Semantic Synthesis" },
             { title: "ELITE LEVEL SCALE", icon: Trophy, sub: "Voted Top Entry Port '26" },
             { title: "THE ERA FORGE", icon: Cpu, sub: "Unmatched Creative Logic" },
             { title: "SONIC OWNERSHIP", icon: ShieldCheck, sub: "100% Rights Transfer" }
           ].map((item, i) => (
             <div key={i} className="flex flex-col md:flex-row items-center gap-6 group">
                <div className="bg-[#222] p-5 border border-white/10 group-hover:border-[#24b324]/40 group-hover:bg-[#24b324]/10 transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                   <item.icon className="text-white/20 group-hover:text-[#24b324] transition-colors" size={32} />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-black uppercase italic tracking-tighter leading-none">{item.title}</h5>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{item.sub}</p>
                </div>
             </div>
           ))}
        </div>
      </main>

      {/* Explicit Disclaimer Modal */}
      <AnimatePresence>
        {showExplicitDisclaimer && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#222] border-4 border-red-600 p-10 max-w-xl w-full space-y-8"
            >
              <div className="w-16 h-16 bg-red-600 text-white flex items-center justify-center font-black italic text-3xl mb-6"><Skull size={32} /></div>
              <div className="space-y-4">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-red-600">Explicit Protocol</h2>
                <div className="h-px w-full bg-red-600/30 mb-6" />
                <div className="text-sm text-white/60 space-y-4 font-medium italic leading-relaxed uppercase font-bold tracking-widest">
                  <p>1. BY ENABLING EXPLICIT CONTENT, YOU ACKNOWLEDGE THE USE OF UNFILTERED ARTISTIC EXPRESSION.</p>
                  <p>2. IBH LYRIC PRO DOES NOT CONDONE HATE SPEECH, VIOLENCE, OR HARM TOWARDS ANY INDIVIDUAL OR GROUP.</p>
                  <p>3. CREATIVE FREEDOM IS THE CORNERSTONE OF THE BROTHERHOOD, BUT RESPONSIBILITY LIES WITH THE ARTIST.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowExplicitDisclaimer(false)}
                className="w-full bg-red-600 text-white py-5 font-black uppercase italic text-xl flex items-center justify-center gap-4 hover:bg-white hover:text-red-600 transition-all shadow-[0_10px_30px_rgba(220,38,38,0.3)]"
              >
                I AGREE & UNDERSTAND <Check size={24} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="py-12 border-t border-white/10 px-4 text-center mt-auto bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <p className="text-white/20 text-[10px] uppercase font-bold tracking-[0.2em]">Established 2026. FOR THE ERA. BY THE BROTHERHOOD.</p>
      </footer>
    </div>
  );
};

export default LyricPro;
