import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Upload, 
  Search, 
  FileText, 
  ShieldAlert, 
  Zap, 
  Cpu, 
  TrendingUp, 
  Flame, 
  Award, 
  Globe, 
  Mic2, 
  AlertCircle, 
  FileAudio, 
  Link as LinkIcon, 
  Menu, 
  X, 
  LayoutDashboard, 
  Music, 
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

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

const HitAnalyzer = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [lyrics, setLyrics] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    viral: number;
    syncFit: string;
    breakdown: string;
    suggestions: string[];
    sentiment: string;
    reclamationFix?: string;
    executiveNotes?: string;
    marketingStrategy?: string;
  } | null>(null);
  const [loadingStep, setLoadingStep] = useState("");
  
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

    // Cleanup on unmount (Privacy guarantee)
    return () => {
      setLyrics("");
      setAnalysisResult(null);
    };
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const runAnalysis = async () => {
    if (!userProfile) {
      alert("System Syncing... Please wait for profile authentication.");
      return;
    }
    
    // Feature Gating for 'free' tier
    if (userProfile.subscriptionTier === 'free' && !isSuperAdmin(userProfile.email)) {
       if (userProfile.freeAnalyzerUsed) {
          alert("Free Tier Limit Reached. Upgrade to Basic or higher for unlimited Hit Analysis access.");
          return;
       }
    }

    const creditsNeeded = 2;
    if ((userProfile.credits || 0) < creditsNeeded && !isSuperAdmin(userProfile.email)) {
      alert("Insufficient Brotherhood Credits (BC). Upgrade or purchase more to use Hit Analyzer.");
      return;
    }

    if (!lyrics && !file && !url) {
      alert("Provide lyrics, a file, or a link to analyze.");
      return;
    }

    setIsAnalyzing(true);
    setLoadingStep("SCRAPING BILLBOARD TRENDS...");
    
    try {
      if (!isSuperAdmin(userProfile.email)) {
         const userRef = doc(db, 'users', userProfile.uid);
         await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User not found");
            const currentCredits = userDoc.data()?.credits || 0;
            if (currentCredits < creditsNeeded) {
               throw new Error("Insufficient credits in database.");
            }
            
            let updates: any = { credits: currentCredits - creditsNeeded };
            if (userProfile.subscriptionTier === 'free') {
               updates.freeAnalyzerUsed = true;
            }
            
            transaction.update(userRef, updates);
         });
      }

      setLoadingStep("RUNNING ACOUSTIC FINGERPRINTING & ENCODING AUDIO...");

      let fileData: string | null = null;
      if (file) {
        const reader = new FileReader();
        fileData = await new Promise((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });
      }

      const prompt = `You are the IndieBrotherhood Hit Analyzer AI, an elite A&R algorithms expert. Perform a deep industry analysis on this song entry.
      Lyrics: ${lyrics || 'No lyrics provided'}
      Metadata/Link: ${url || 'No URL provided'}
      Current Tier: ${userProfile.subscriptionTier}
      
      Compare this against current Billboard Top 100 and viral TikTok trends (2026).
      Provide:
      1. "Hit Score" (0-100)
      2. "Viral Potential" (0-100)
      3. "Sync Licensing Fit" (What TV/Film/Ad vibe fits this best?)
      4. "Breakdown" (A brutal, honest, deep-dive into the melodic/lyrical structure and why it matches or fails current trends).
      5. 4 specific, highly technical "Change Suggestions".
      6. A "Sentiment & Vibe" analysis.
      7. Reclimation Fix: If score < 85%, provide a 'Reclamation Fix' (rewrite/remix advice) to reach 95%.
      8. "Executive Notes": Add elite level executive A&R notes targeting commercial radio.
      9. "Marketing Strategy": Include a robust 2-week digital launch strategy for independent platforms.
      
      Format your response as valid JSON.`;

      const contents: any[] = [{ text: prompt }];
      if (fileData) {
        contents.push({
          inlineData: {
            mimeType: file.type || "audio/mpeg",
            data: fileData
          }
        });
      }

      const userRef = doc(db, 'users', userProfile.uid);
      
      // Atomic Credit Check using runTransaction before the AI is ever called
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User record not found");
        }
        
        const currentCredits = userDoc.data()?.credits || 0;
        if (currentCredits < creditsNeeded) {
          throw new Error("Insufficient Brotherhood Credits (BC)");
        }
        
        transaction.update(userRef, { credits: currentCredits - creditsNeeded });
      });

      setLoadingStep("AI SYNERGY IN PROGRESS...");

      const systemInstruction = `You are an elite music industry analyst. Analyze this track for hit potential. 
      The report must be tailored for a user who speaks ${userProfile.language || 'English'}. 
      All descriptive text, analysis, and marketing strategy must be in ${userProfile.language || 'English'}.
      Adapt the industry terminology to be most impactful for this specific linguistic market.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [...contents, { text: systemInstruction }] as any },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              viral: { type: Type.NUMBER },
              syncFit: { type: Type.STRING },
              breakdown: { type: Type.STRING },
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              sentiment: { type: Type.STRING },
              reclamationFix: { type: Type.STRING },
              executiveNotes: { type: Type.STRING },
              marketingStrategy: { type: Type.STRING }
            },
            required: ["score", "viral", "syncFit", "breakdown", "suggestions", "sentiment"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Analysis engine returned empty result.");
      }

      const result = JSON.parse(responseText);
      setAnalysisResult(result);

      // Award Points and Badges for using the tool
      try {
        await updateDoc(userRef, {
          points: increment(250),
          analysisTotal: increment(1),
          badges: Array.from(new Set([...(userProfile.badges || []), "Data Miner", "Analyzer"]))
        });
      } catch (e) {
        console.warn("Gamification sync failed:", e);
      }

      if (!isSuperAdmin(userProfile.email)) {
          setUserProfile((prev: any) => {
             const updates: any = { credits: prev.credits - creditsNeeded };
             if (prev.subscriptionTier === 'free') updates.freeAnalyzerUsed = true;
             return { ...prev, ...updates };
          });
      }

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Analysis failed. Check your connection or Brotherhood Credits (BC).");
    } finally {
      setIsAnalyzing(false);
      setLoadingStep("");
    }
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
            <div className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Analyzer Status</div>
            <div className="text-sm font-black italic uppercase text-[#24b324]">
              Scanning the Era
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
                  { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
                  { label: "Hit Analyzer", icon: Zap, to: "/analysis", active: true },
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
              <span className="text-black font-black uppercase italic text-sm">IBH HIT ANALYZER: WE ANALYZE DATA, NOT PROMISES</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">NO GUARANTEES OF SUCCESS PROVIDED</span>
              <span className="text-black/40 font-black">•</span>
              <span className="text-black font-black uppercase italic text-sm">BASED ON LIVE 2026 STREAMING TRENDS</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="space-y-2">
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-[0.8]">Hit Analyzer</h1>
            <p className="text-[#24b324] font-black uppercase tracking-widest italic text-sm pl-2">Trend-Mapping Logic Portal</p>
          </div>
          <div className="bg-black/40 p-4 border-l-4 border-[#24b324] text-right backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
             <div className="text-[10px] font-black uppercase text-white/30 tracking-widest">Brotherhood Credits (BC)</div>
             <div className="text-3xl font-black italic text-[#24b324]">{userProfile?.credits || 0}</div>
          </div>
        </div>

        {/* Disclaimer Panel */}
        <div className="bg-red-900/10 border border-red-500/20 p-6 flex gap-4 items-start mb-12">
           <ShieldAlert className="text-red-500 shrink-0" size={24} />
           <div className="space-y-1">
             <h4 className="text-xs font-black uppercase tracking-[0.2em] text-red-500">Legal Disclaimer & Limitation of Era</h4>
             <p className="text-[10px] text-white/40 uppercase font-bold italic leading-relaxed">
               WE ARE A DATA ANALYZER BASED ON CURRENT MUSIC HITS. WE ARE NOT GUARANTEEING COMMERCIAL SUCCESS, CHART PLACEMENT, OR MONETARY GAIN. DATA IS VOLATILE. ART IS SUBJECTIVE. PROCEED AT YOUR OWN RISK.
             </p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Input Console */}
           <div className="lg:col-span-7 bg-[#222] border-4 border-black/50 p-8 space-y-8 relative">
              <div className="space-y-4">
                <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                  <FileText size={14} /> 01. Lyric Engine
                </label>
                <textarea 
                  placeholder="PASTE YOUR LYRICS HERE FOR SEMANTIC ANALYSIS..."
                  className="w-full bg-black/40 border-2 border-white/5 h-64 p-6 text-xs font-bold font-mono tracking-wider focus:border-[#24b324] outline-none transition-all resize-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                    <FileAudio size={14} /> 02. Audio Source
                  </label>
                  <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-white/10 hover:border-[#24b324]/40 transition-colors cursor-pointer group bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                    <Upload size={24} className={`mb-2 ${file ? 'text-[#24b324]' : 'text-white/10 group-hover:text-white/30'}`} />
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30 text-center px-4">
                      {file ? file.name : 'UPLOAD RAW WAV/MP3'}
                    </span>
                  </label>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.3em] text-[#24b324] flex items-center gap-2">
                    <LinkIcon size={14} /> 03. Live URL
                  </label>
                  <div className="relative h-32 bg-black/20 border-2 border-white/5 flex items-center px-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <LinkIcon className="absolute left-6 text-white/20" size={16} />
                    <input 
                      type="text"
                      placeholder="SOUNDCLOUD / WEB AUDIO URL"
                      className="w-full bg-transparent p-4 pl-12 text-[10px] font-bold uppercase tracking-widest focus:text-[#24b324] outline-none"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={runAnalysis}
                disabled={isAnalyzing || (!lyrics && !file && !url)}
                className="w-full bg-[#24b324] text-black py-6 font-black italic uppercase text-2xl tracking-tighter hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
              >
                <span className="flex items-center justify-center gap-4">
                  {isAnalyzing ? <Cpu className="animate-spin" /> : <Zap fill="currentColor" />}
                  {isAnalyzing ? "SCRUBBING DATA..." : "INITIATE TREND ANALYSIS (2 BC)"}
                </span>
              </button>
           </div>

           {/* Analysis Panel */}
           <div className="lg:col-span-5">
             <AnimatePresence mode="wait">
               {isAnalyzing && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0 }}
                   className="bg-black border-2 border-[#24b324] p-10 h-full flex flex-col items-center justify-center text-center space-y-8 shadow-2xl shadow-black/80"
                 >
                   <div className="relative">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="w-32 h-32 border-4 border-[#24b324]/20 border-t-[#24b324] rounded-full"
                      />
                      <Search className="absolute inset-0 m-auto text-[#24b324]" size={40} />
                   </div>
                   <div className="space-y-3">
                     <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[#24b324]">CRUNCHING METRICS</h3>
                     <p className="text-xs font-black uppercase tracking-[0.4em] text-white/40 animate-pulse">{loadingStep}</p>
                   </div>
                 </motion.div>
               )}

               {!isAnalyzing && analysisResult && (
                 <motion.div 
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="space-y-8"
                 >
                    {/* Score Ring & Viral Index */}
                    <div className="bg-[#222] border-4 border-black/50 p-8 flex flex-col items-center relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                         <Flame size={120} />
                       </div>
                       
                       <div className="w-full grid grid-cols-2 gap-4">
                         <div className="relative w-40 h-40 mx-auto">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                              <motion.circle 
                                cx="80" cy="80" r="72" 
                                stroke="currentColor" strokeWidth="12" fill="transparent" 
                                strokeDasharray={2 * Math.PI * 72}
                                initial={{ strokeDashoffset: 2 * Math.PI * 72 }}
                                animate={{ strokeDashoffset: (2 * Math.PI * 72) * (1 - analysisResult.score / 100) }}
                                transition={{ duration: 2, delay: 0.5 }}
                                className="text-[#24b324]" 
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <div className="text-4xl font-black italic tracking-tighter drop-shadow-lg">{analysisResult.score}%</div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-white/40">Hit Score</div>
                            </div>
                         </div>
                         
                         <div className="relative w-40 h-40 mx-auto">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                              <motion.circle 
                                cx="80" cy="80" r="72" 
                                stroke="currentColor" strokeWidth="12" fill="transparent" 
                                strokeDasharray={2 * Math.PI * 72}
                                initial={{ strokeDashoffset: 2 * Math.PI * 72 }}
                                animate={{ strokeDashoffset: (2 * Math.PI * 72) * (1 - analysisResult.viral / 100) }}
                                transition={{ duration: 2, delay: 0.8 }}
                                className="text-[#00A8E1]" 
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <div className="text-4xl font-black italic tracking-tighter drop-shadow-lg">{analysisResult.viral}%</div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-[#00A8E1]/60">Viral Index</div>
                            </div>
                         </div>
                       </div>
                       
                       <div className="text-center w-full grid grid-cols-2 gap-4 mt-6">
                          <div className="flex flex-col items-center p-3 bg-white/5 border border-white/10 uppercase italic backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                             <div className="text-[9px] text-[#24b324] font-black tracking-widest mb-1">Detected Vibe</div>
                             <div className="text-xs font-bold text-white leading-tight">{analysisResult.sentiment}</div>
                          </div>
                          <div className="flex flex-col items-center p-3 bg-white/5 border border-white/10 uppercase italic backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                             <div className="text-[9px] text-[#00A8E1] font-black tracking-widest mb-1">Sync Licensing</div>
                             <div className="text-xs font-bold text-white leading-tight text-center">{analysisResult.syncFit}</div>
                          </div>
                       </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-4">
                       <div className="bg-black/40 border border-[#24b324]/20 p-6 space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                          <div className="flex items-center gap-2 text-xs font-black uppercase italic text-[#24b324]">
                            <BarChart3 size={14} /> Industry Breakdown
                          </div>
                          <p className="text-xs text-white/60 leading-relaxed italic font-medium">"{analysisResult.breakdown}"</p>
                       </div>

                        {analysisResult.reclamationFix && (
                          <div className="bg-red-500/10 border border-red-500/30 p-6 space-y-4">
                             <div className="flex items-center gap-2 text-xs font-black uppercase italic text-red-500">
                               <Flame size={14} /> Reclamation Fix (Score &lt; 85%)
                             </div>
                             <p className="text-xs text-white/80 leading-relaxed italic font-medium">{analysisResult.reclamationFix}</p>
                          </div>
                        )}

                        {analysisResult.executiveNotes && (
                          <div className="bg-[#24b324]/10 border border-[#24b324]/30 p-6 space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                             <div className="flex items-center gap-2 text-xs font-black uppercase italic text-[#24b324]">
                               <Zap size={14} /> Executive Notes (Legacy+)
                             </div>
                             <p className="text-xs text-white/80 leading-relaxed italic font-medium">{analysisResult.executiveNotes}</p>
                          </div>
                        )}
                        
                        {analysisResult.marketingStrategy && (
                          <div className="bg-[#00A8E1]/10 border border-[#00A8E1]/30 p-6 space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                             <div className="flex items-center gap-2 text-xs font-black uppercase italic text-[#00A8E1]">
                               <TrendingUp size={14} /> Marketing Strategy (Supreme+)
                             </div>
                             <p className="text-xs text-white/80 leading-relaxed italic font-medium">{analysisResult.marketingStrategy}</p>
                          </div>
                        )}

                       <div className="bg-black/40 border border-white/10 p-6 space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                          <div className="flex items-center gap-2 text-xs font-black uppercase italic text-white/60">
                            <TrendingUp size={14} /> Optimization Map
                          </div>
                          <ul className="space-y-4">
                             {analysisResult.suggestions.map((s, i) => (
                               <li key={i} className="flex gap-4 items-start group">
                                  <div className="bg-[#24b324] text-black w-6 h-6 flex items-center justify-center shrink-0 font-black italic text-xs border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">0{i+1}</div>
                                  <span className="text-xs font-bold uppercase italic text-white/40 group-hover:text-white transition-colors">{s}</span>
                               </li>
                             ))}
                          </ul>
                       </div>
                    </div>
                 </motion.div>
               )}

               {!isAnalyzing && !analysisResult && (
                 <div className="h-full border-4 border-dashed border-white/5 flex flex-col items-center justify-center text-center p-12 opacity-30 grayscale">
                    <BarChart3 size={64} className="mb-6" />
                    <div className="space-y-2">
                       <h3 className="text-xl font-black italic uppercase">Output Console</h3>
                       <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Era Input. We Analyze Hits. You Make History.</p>
                    </div>
                 </div>
               )}
             </AnimatePresence>
           </div>
        </div>

        {/* Professional Icons Row */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/5 pt-12">
           {[
             { title: "Software Powerhouse", icon: Cpu, sub: "IBH Proprietary Logic" },
             { title: "Analyzer Number One", icon: Award, sub: "Voted Top Entry Port '26" },
             { title: "Top Of Its Era", icon: Flame, sub: "Unmatched Trend Sync" }
           ].map((item, i) => (
             <div key={i} className="flex items-center gap-6 group">
                <div className="bg-[#222] p-5 border border-white/10 group-hover:border-[#24b324]/40 group-hover:bg-[#24b324]/10 transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                   <item.icon className="text-white/20 group-hover:text-[#24b324] transition-colors" size={32} />
                </div>
                <div className="space-y-1">
                  <h5 className="text-sm font-black uppercase italic tracking-tighter leading-none">{item.title}</h5>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{item.sub}</p>
                </div>
             </div>
           ))}
        </div>
      </main>
    </div>
  );
};

export default HitAnalyzer;
