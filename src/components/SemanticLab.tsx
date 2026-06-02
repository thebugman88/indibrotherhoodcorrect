import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { 
  Cpu, Zap, BarChart3, Database, Shield, Globe, Terminal, Activity, Layers, Repeat, Binary, Music, User, Home, LayoutDashboard, Gavel, Users, Coffee, ShoppingBag, Feather, Menu, X, Sparkles, AlertCircle, Share2, Clipboard, Trash2, CheckCircle, Star, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { logBreadcrumb, SentinelBoundary } from '../lib/sentinel';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';

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

// --- TYPES ---
interface TrajectoryPoint {
  time: string;
  probability: number;
  frequency: number;
}

interface SemanticScore {
  subject: string;
  A: number;
  fullMark: number;
}

interface ProcessedTrack {
  id: string;
  title: string;
  mode: 'UNLEASHED' | 'CLEAN';
  trajectoryScore: number;
  timestamp: any;
  semanticAnalysis: string;
}

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

const SemanticLab = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mode, setMode] = useState<'UNLEASHED' | 'CLEAN'>('CLEAN');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<any>(null);
  const [history, setHistory] = useState<ProcessedTrack[]>([]);
  const navigate = useNavigate();

  // --- MOCK DATA FOR THE HARDWARE FEEL ---
  const trajectoryData: TrajectoryPoint[] = [
    { time: 'T-6h', probability: 45, frequency: 12 },
    { time: 'T-5h', probability: 52, frequency: 18 },
    { time: 'T-4h', probability: 48, frequency: 24 },
    { time: 'T-3h', probability: 70, frequency: 32 },
    { time: 'T-2h', probability: 85, frequency: 45 },
    { time: 'T-1h', probability: 92, frequency: 60 },
    { time: 'NOW', probability: 98, frequency: 85 },
  ];

  const defaultSemanticScores: SemanticScore[] = [
    { subject: 'Rhyme Depth', A: 85, fullMark: 100 },
    { subject: 'Soul Weight', A: 92, fullMark: 100 },
    { subject: 'Frequency Fit', A: 78, fullMark: 100 },
    { subject: 'Era Sync', A: 95, fullMark: 100 },
    { subject: 'Brutality', A: 60, fullMark: 100 },
  ];

  // --- AUTH AND HISTORY ---
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        setUserProfile({ ...snap.data(), uid: user.uid });
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (!userProfile) return;
    const q = query(
      collection(db, 'semantic_registry'), 
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcessedTrack));
      setHistory(data);
    }, (err) => {
      console.error("Semantic lab history sync error:", err);
    });
  }, [userProfile]);

  const runSynthesis = async () => {
    if (!userProfile) return;
    if (userProfile.subscriptionTier === 'free' && !isSuperAdmin(userProfile.email)) {
       alert("Semantic Lab is completely locked for the Free Tier. Please upgrade to unlock Elite ML Synthesis.");
       return;
    }
    if (!inputText.trim()) return;
    setIsProcessing(true);
    logBreadcrumb(`SEMANTIC SYNTHESIS COMMENCED: ${mode}`);

    try {
      const prompt = `Analyze these lyrics as the Brotherhood Semantic Engine. 
      MODE: ${mode}
      LYRICS: ${inputText}
      
      Provide a JSON analysis with:
      1. trajectoryScore (0-100)
      2. semanticScores (array of {subject, A} involving: Rhyme depth, soul weight, viral potential, era sync, technicality)
      3. synthesisSummary (paragraph about the sonic ownership and era trajectory)
      4. suggestedEdits (3 bullet points for TikTok Ready catchiness)`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text.replace(/```json|```/g, "").trim());
      setActiveAnalysis(result);
      
      // Save to Registry (Sonic Ownership)
      await addDoc(collection(db, 'semantic_registry'), {
        title: inputText.slice(0, 20) + '...',
        mode,
        trajectoryScore: result.trajectoryScore,
        semanticAnalysis: result.synthesisSummary,
        timestamp: serverTimestamp(),
        userId: userProfile.uid
      });

      logBreadcrumb(`SEMANTIC SYNTHESIS COMPLETE: ${result.trajectoryScore}% ERA MATCH`);
    } catch (error) {
      console.error("Synthesis failed:", error);
      alert("SEMANTIC ENGINE FAULT: RE-BOOTING CALIBRATION...");
    } finally {
      setIsProcessing(false);
    }
  };

  const NavItems = [
    { label: "Profile", icon: User, to: "/profile" },
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "ML Lab", icon: Binary, to: "/ml-lab", active: true },
    ...(isSuperAdmin(userProfile?.email) ? [
      { label: "Control Room", icon: Terminal, to: "/control-room" },
      { label: "Admin Hub", icon: Activity, to: "/sentinel" }
    ] : []),
    { label: "The Judgment", icon: Gavel, to: "/judgment" },
    { label: "IBH Meeting", icon: Users, to: "/ibh" },
    { label: "The Lounge", icon: Coffee, to: "/lounge" },
    { label: "Mastering Suite", icon: Music, to: "/mastering" },
    { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
    { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
    { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
  ];

  return (
    <SentinelBoundary moduleName="Semantic">
      <div className="min-h-screen bg-[#0a0a0b] text-[#e0e0e0] font-mono selection:bg-[#24b324] selection:text-black overflow-x-hidden">
        {/* Hardware Status Ticker */}
        <div className="bg-[#24b324] overflow-hidden py-1 border-y border-black/20 relative z-30 shadow-[0_0_20px_rgba(217,225,43,0.1)]">
          <div className="flex whitespace-nowrap animate-ticker">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-12 px-6">
                <span className="text-black font-black uppercase italic text-[10px] tracking-[0.4em]">SEMANTIC ENGINE STATUS: OPTIMIZED // ERA TRAJECTORY LOCK: ON</span>
                <span className="text-black/40 font-black">•</span>
                <span className="text-black font-black uppercase italic text-[10px] tracking-[0.4em]">SONIC OWNERSHIP REGISTERED // DATA PURGE: ENABLED</span>
                <span className="text-black/40 font-black">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* Header - Industrial Feel */}
        <header className="p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-[28px] z-20">
          <div className="flex items-center gap-8">
            <button 
              className="p-3 hover:bg-[#24b324] hover:text-black rounded-sm border border-white/10 transition-all group" 
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu size={20} className="text-[#24b324] group-hover:text-black" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-900 border border-[#24b324]/40 flex items-center justify-center relative shadow-[inset_0_0_15px_rgba(217,225,43,0.05)]">
                 <Cpu size={24} className="text-[#24b324] animate-pulse" />
                 <div className="absolute top-0 right-0 w-2 h-2 bg-[#24b324] rounded-full animate-ping" />
              </div>
              <div>
                <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none text-white">Semantic Lab</h1>
                <p className="text-[9px] text-white/30 uppercase tracking-[0.5em] mt-1">Era Synthesis Engine v4.8</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* MODE TOGGLE */}
            <div className="flex bg-zinc-950 border border-white/5 p-1 rounded-sm">
                <button 
                  onClick={() => setMode('CLEAN')}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    mode === 'CLEAN' ? "bg-[#24b324] text-black shadow-lg" : "text-white/20 hover:text-white"
                  )}
                >
                  CLEAN
                </button>
                <button 
                   onClick={() => setMode('UNLEASHED')}
                   className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                    mode === 'UNLEASHED' ? "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]" : "text-white/20 hover:text-white"
                  )}
                >
                  UNLEASHED
                </button>
            </div>

            <div className="flex items-center gap-3 border-l border-white/10 pl-8">
               <div className="text-right">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Processing Power</div>
                  <div className="text-[#24b324] font-black italic inline-flex items-center gap-2">
                    <Zap size={14} /> 99.8% READY
                  </div>
               </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT COLUMN: TRAJECTORY & METRICS */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* ERA TRAJECTORY HEATMAP (CHART) */}
            <div className="bg-zinc-950 border border-white/5 p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                 <Globe size={150} />
              </div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#24b324]/60 flex items-center gap-2">
                  <Activity size={14} /> Global Era Trajectory
                </h2>
                <div className="px-3 py-1 border border-[#24b324]/20 text-[9px] font-black text-[#24b324] uppercase tracking-widest">
                  LIVE FREQUENCY SYNC
                </div>
              </div>

              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trajectoryData}>
                    <defs>
                      <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#24b324" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#24b324" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#000', border: '1px solid #ffffff10', fontSize: '10px' }}
                      itemStyle={{ color: '#24b324' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="probability" 
                      stroke="#24b324" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorProb)" 
                      animationDuration={2000}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="frequency" 
                      stroke="#ffffff30" 
                      strokeWidth={1} 
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-6 pt-8 border-t border-white/5">
                <div>
                  <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Peak Probability</div>
                  <div className="text-2xl font-black italic text-[#24b324]">98.2%</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Sonic Saturation</div>
                  <div className="text-2xl font-black italic text-blue-400">Low</div>
                </div>
                <div>
                  <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Era Compatibility</div>
                  <div className="text-2xl font-black italic text-green-500">OPTIMAL</div>
                </div>
              </div>
            </div>

            {/* SYNTHESIS INPUT MODULE */}
            <div className="bg-zinc-950 border border-white/5 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#24b324]/60 flex items-center gap-2">
                  <Terminal size={14} /> Semantic Processor
                </h2>
                <div className="flex gap-2 text-[9px] uppercase tracking-widest font-bold text-white/20">
                  <span>UNLEASHED_DRIVE: {mode === 'UNLEASHED' ? 'ACTIVE' : 'OFF'}</span>
                </div>
              </div>

              <div className="relative">
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Inject raw lyrics or rhythmic patterns for synthesis..."
                  className="w-full h-40 bg-black/40 border border-white/5 p-6 text-sm text-white/80 focus:border-[#24b324]/40 focus:outline-none transition-all font-mono resize-none italic backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                />
                <div className="absolute bottom-4 right-4 text-[9px] text-white/20 font-black uppercase tracking-widest">
                  SYSTEM READY FOR INJECTION
                </div>
              </div>

              {userProfile?.subscriptionTier === 'free' && !isSuperAdmin(userProfile?.email) ? (
                 <button 
                   onClick={() => window.location.href = '/dashboard'}
                   className="w-full py-5 bg-white/10 text-white/50 font-black uppercase italic tracking-[0.3em] hover:bg-white hover:text-black active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-none backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                 >
                   <Lock size={20} fill="currentColor" />
                   UPGRADE TO BASIC TIER TO UNLOCK
                 </button>
              ) : (
                <button 
                  onClick={runSynthesis}
                  disabled={isProcessing || !inputText.trim()}
                  className="w-full py-5 bg-[#24b324] text-black font-black uppercase italic tracking-[0.3em] hover:bg-white active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(217,225,43,0.2)] disabled:opacity-50 border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                >
                  {isProcessing ? (
                    <>
                      <Repeat className="animate-spin" size={20} />
                      Processing Semantic Soul...
                    </>
                  ) : (
                    <>
                      <Zap size={20} />
                      Execute Full Write Synthesis
                    </>
                  )}
                </button>
              )}
            </div>

            {/* ACTIVE ANALYSIS DISPLAY */}
            <AnimatePresence>
              {activeAnalysis && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black border-2 border-[#24b324] p-10 space-y-10 shadow-[0_0_50px_rgba(217,225,43,0.1)]"
                >
                  <div className="flex justify-between items-start border-b border-white/10 pb-8">
                     <div className="space-y-2">
                        <div className="text-[10px] font-black text-[#24b324] uppercase tracking-[0.5em] italic flex items-center gap-2">
                           <Sparkles size={12} /> Synthesis Result
                        </div>
                        <h3 className="text-4xl font-black italic uppercase italic tracking-tighter text-white">
                           {activeAnalysis.trajectoryScore}% Era Trajectory Match
                        </h3>
                     </div>
                     <div className="w-16 h-16 bg-[#24b324] flex items-center justify-center text-black font-black text-2xl italic tracking-tighter">
                        {activeAnalysis.trajectoryScore}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* RADAR CHART */}
                    <div className="h-[250px] bg-zinc-950/50 p-4 border border-white/5 flex items-center justify-center">
                       <ResponsiveContainer width="100%" height="100%">
                         <RadarChart cx="50%" cy="50%" outerRadius="80%" data={activeAnalysis.semanticScores}>
                            <PolarGrid stroke="#ffffff10" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#ffffff40', fontSize: 8 }} />
                            <Radar
                              name="Era Score"
                              dataKey="A"
                              stroke="#24b324"
                              fill="#24b324"
                              fillOpacity={0.4}
                            />
                         </RadarChart>
                       </ResponsiveContainer>
                    </div>

                    <div className="space-y-6">
                       <div>
                          <h4 className="text-[10px] font-black text-[#24b324] uppercase tracking-widest mb-3 flex items-center gap-2">
                             <Layers size={14} /> Semantic Synthesis Summary
                          </h4>
                          <p className="text-sm text-white/50 leading-relaxed italic">{activeAnalysis.synthesisSummary}</p>
                       </div>
                       
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                             <Zap size={14} /> Viral Optimization Hooks
                          </h4>
                          <ul className="space-y-2">
                             {activeAnalysis.suggestedEdits.map((edit: string, idx: number) => (
                               <li key={idx} className="text-[11px] text-white/70 flex items-start gap-2 italic">
                                  <span className="text-[#24b324] font-black">0{idx + 1}</span>
                                  {edit}
                               </li>
                             ))}
                          </ul>
                       </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/20">
                     <span className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Sonic Ownership Transferred</span>
                     <span>Data Purged from AI Cache</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT COLUMN: REGISTRY & SYSTEM DATA */}
          <div className="lg:col-span-4 space-y-10">
            
            {/* SONIC OWNERSHIP REGISTRY */}
            <div className="bg-zinc-950 border border-white/5 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <Shield size={100} className="text-[#24b324]" />
              </div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#24b324]/60 mb-8 flex items-center gap-2">
                <Database size={14} /> Ownership Registry
              </h2>
              
              <div className="space-y-6">
                {history.map((item) => (
                  <div key={item.id} className="group cursor-pointer">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-xs font-black text-white/80 uppercase italic tracking-tighter group-hover:text-[#24b324] transition-colors truncate max-w-[150px]">
                        {item.title}
                      </span>
                      <span className="text-[9px] text-[#24b324] font-black italic">{item.trajectoryScore}%</span>
                    </div>
                    <div className="h-1 bg-white/5 overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.trajectoryScore}%` }}
                        className={cn("h-full", item.mode === 'UNLEASHED' ? 'bg-red-500' : 'bg-[#24b324]')}
                       />
                    </div>
                    <div className="flex justify-between text-[8px] text-white/10 uppercase font-black tracking-widest mt-2">
                      <span>{item.mode} MODULE</span>
                      <span>{new Date(item.timestamp?.seconds * 1000).toLocaleDateString() || 'RECENT'}</span>
                    </div>
                  </div>
                ))}
                
                {history.length === 0 && (
                   <p className="text-[9px] text-white/10 font-black text-center py-10 uppercase tracking-[0.5em] italic">Registry Empty // Pending Synthesis</p>
                )}
              </div>
            </div>

            {/* SYSTEM HEURISTICS */}
            <div className="bg-zinc-900/40 border border-white/5 p-8 space-y-8">
               <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-4 flex items-center gap-2">
                <Binary size={14} /> System Heuristics
               </h2>
               
               <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#24b324]">
                      <span>Cache Purity</span>
                      <span>100%</span>
                    </div>
                    <div className="h-1 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                       <div className="h-full bg-[#24b324] w-full" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-500">
                      <span>Era Sync Lag</span>
                      <span>0.02ms</span>
                    </div>
                    <div className="h-1 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                       <div className="h-full bg-blue-500 w-[2%]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-purple-500">
                      <span>Soul Compression</span>
                      <span>NONE</span>
                    </div>
                    <div className="h-1 bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                       <div className="h-full bg-purple-500 w-0" />
                    </div>
                  </div>
               </div>

               <div className="pt-6 border-t border-white/5 text-center">
                  <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.4em]">Proprietary Brotherhood Semantic Engine :: All Rights Transferred</p>
               </div>
            </div>
          </div>
        </main>

        {/* Side Menu Drawer */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100]"
              />
                <motion.div 
                  initial={{ x: -400 }}
                  animate={{ x: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  exit={{ x: -400 }}
                  className="fixed top-0 left-0 bottom-0 w-80 bg-zinc-950 border-r-4 border-[#24b324] z-[101] p-10 flex flex-col overflow-y-auto no-scrollbar"
                >
                  <div className="flex justify-between items-center mb-8 flex-shrink-0">
                     <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter text-white italic">Indie<br/><span className="text-[#24b324]">Brotherhood</span></h2>
                     <button onClick={() => setIsMenuOpen(false)} className="p-2 border border-white/10 text-white/20 hover:text-white transition-all">
                        <X size={20} />
                     </button>
                  </div>
                  
                  <nav className="flex-grow space-y-1 mb-8">
                  {NavItems.map((item, i) => (
                    <Link 
                      to={item.to} 
                      key={i} 
                      onClick={() => {
                        logBreadcrumb(`NAV TO: ${item.label}`);
                        if (window.location.pathname === item.to) {
                          setIsMenuOpen(false);
                        }
                      }}
                      className={`flex items-center gap-4 p-5 transition-all group border-b border-white/5 ${window.location.pathname === item.to ? 'bg-[#24b324] text-black shadow-lg translate-x-2' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                    >
                      <item.icon size={20} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#24b324] transition-transform group-hover:scale-110'} />
                      <span className="font-black uppercase tracking-[0.2em] text-[11px] italic">{item.label}</span>
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto pt-10 border-t border-white/5 flex-shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-black border border-[#24b324]/40 flex items-center justify-center p-0.5 overflow-hidden shadow-[inset_0_0_20px_rgba(217,225,43,0.1)]">
                         <div className="w-full h-full bg-gradient-to-tr from-[#24b324]/20 to-transparent flex items-center justify-center">
                            <User size={28} className="text-[#24b324]" />
                         </div>
                      </div>
                      <div>
                         <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] italic mb-1">Authenticated Artist</div>
                         <div className="text-[#24b324] font-black italic text-lg uppercase tracking-tighter truncate max-w-[150px]">
                           {userProfile?.displayName || userProfile?.email.split('@')[0]}
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </SentinelBoundary>
  );
};

export default SemanticLab;
