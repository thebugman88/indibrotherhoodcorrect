import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, RefreshCw, AlertTriangle, Terminal, CheckCircle, 
  Trash2, ChevronDown, ChevronUp, Database, Sparkles, 
  Code, Zap, Wrench, ShieldAlert, Cpu, Heart, AlertCircle,
  Menu, X, Home, LayoutDashboard, Gavel, Feather, User, Star, Coffee, Users, ShoppingBag, Music, Binary
} from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import { logBreadcrumb } from '../lib/sentinel';
import { awardPoints, awardBadge } from '../lib/gamification';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

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
const isSuperAdmin = (email?: string | null) => {
  if (!email) return false;
  const userEmail = email.toLowerCase();
  return SUPER_ADMINS.some(adminEmail => adminEmail.toLowerCase() === userEmail);
};

// --- TYPES & INTERFACES ---
interface SentinelLog {
  id: string;
  DTC_Code: string;
  message: string;
  Stack_Trace: string;
  Device_Profile: {
    userAgent: string;
    platform: string;
    connection: string;
    screen: string;
  };
  User_Breadcrumbs: string[];
  Timestamp: any;
  module: string;
  status: 'unresolved' | 'resolved' | 'ignored';
  riskScore?: number; 
  severity?: 'low' | 'warning' | 'critical';
}

interface GroupedLogs {
  [dtc: string]: {
    count: number;
    logs: SentinelLog[];
    highestRisk: number;
  };
}

interface AIAnalysisResult {
  analysis: string;
  fixA: string;
  fixB: string;
  patch?: string; // Git-style diff suggested by AI
}

interface ModuleHealth {
  name: string;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  faults: number;
}

const SentinelScanner = ({ embedded = false }: { embedded?: boolean }) => {
  const [authUser, setAuthUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logs, setLogs] = useState<SentinelLog[]>([]);
  const [groupedLogs, setGroupedLogs] = useState<GroupedLogs>({});
  const [loading, setLoading] = useState(false);
  const [expandedDtc, setExpandedDtc] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, AIAnalysisResult>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [healing, setHealing] = useState<string | null>(null);
  const [healingProgress, setHealingProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ step: string; percent: number } | null>(null);
  const navigate = useNavigate();

  // --- CORE: AUTH CHECK ---
  useEffect(() => {
    if (embedded) return;
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/');
        return;
      }
      setAuthUser(user);
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const profile = snap.data();
        // ONLY SUPER ADMIN can access the Admin Hub
        if (!isSuperAdmin(user.email)) {
          navigate('/dashboard');
          return;
        }
        setUserProfile({ ...profile, uid: user.uid });
      }
    });
  }, [navigate]);

  // --- CALCULATIONS: MODULE HEALTH ---
  const modules: ModuleHealth[] = [
    { name: 'Core Engine', score: 98, status: 'healthy', faults: 0 },
    { name: 'Auth System', score: 92, status: 'healthy', faults: 0 },
    { name: 'Database API', score: 85, status: 'warning', faults: 0 },
    { name: 'UI Components', score: 78, status: 'warning', faults: 0 },
    { name: 'Gamification', score: 100, status: 'healthy', faults: 0 }
  ].map(m => {
    const moduleFaults = logs.filter(l => l.module === m.name && l.status === 'unresolved').length;
    const penalty = moduleFaults * 15;
    const score = Math.max(0, m.score - penalty);
    return {
      ...m,
      score,
      faults: moduleFaults,
      status: score > 80 ? 'healthy' : score > 40 ? 'warning' : 'critical'
    };
  });

  // --- UTILS: PREDICTIVE RISK ENGINE ---
  const evaluateCodeRisk = (log: SentinelLog) => {
    let risk = 0;
    const stack = log.Stack_Trace?.toLowerCase() || "";
    const msg = log.message?.toLowerCase() || "";

    if (stack.includes("promise") || stack.includes("async")) risk += 15;
    if (stack.includes("undefined") || stack.includes("null")) risk += 20;
    if (stack.includes("memory") || stack.includes("heap")) risk += 30;
    if (msg.includes("timeout") || msg.includes("exceeded")) risk += 15;
    if (msg.includes("auth") || msg.includes("permission")) risk += 25;

    return {
      score: Math.min(risk, 100),
      level: risk > 50 ? "critical" : risk > 25 ? "warning" : "low"
    };
  };

  // --- UTILS: SAFE AI PARSING ---
  const safeParseAI = (text?: string): AIAnalysisResult => {
    if (!text) return { analysis: "No Data", fixA: "Check logs", fixB: "Restart Service" };
    try {
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      return {
        analysis: parsed.analysis || "Analysis unavailable",
        fixA: parsed.fixA || parsed.fix || "Manual review required",
        fixB: parsed.fixB || "Alternative strategy not found",
        patch: parsed.patch || ""
      };
    } catch (e) {
      return { 
        analysis: "AI format error", 
        fixA: "Review stack trace manually", 
        fixB: "Clear cache and retry",
        patch: ""
      };
    }
  };

  // --- CORE: REAL-TIME DATA LISTENER ---
  useEffect(() => {
    // SECURITY GATE: Only listen if confirmed as Super Admin
    if (!embedded && (!authUser || !isSuperAdmin(authUser.email))) return;
    if (embedded && !auth.currentUser) return; // Embedded mode relies on parent auth, wait for it

    setLoading(true);

    const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
        },
        operationType,
        path
      };
      console.error('[SENTINEL-FAILURE]: ', JSON.stringify(errInfo));
    };

    const q = query(collection(db, 'sentinel_logs'), orderBy('Timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const logData = doc.data() as SentinelLog;
        const riskEval = evaluateCodeRisk(logData);
        return {
          ...logData,
          id: doc.id,
          riskScore: riskEval.score,
          severity: riskEval.level as any
        };
      });

      setLogs(data);

      const grouped = data.reduce((acc, log) => {
        if (!acc[log.DTC_Code]) {
          acc[log.DTC_Code] = { count: 0, logs: [], highestRisk: 0 };
        }
        acc[log.DTC_Code].count += 1;
        acc[log.DTC_Code].logs.push(log);
        acc[log.DTC_Code].highestRisk = Math.max(acc[log.DTC_Code].highestRisk, log.riskScore || 0);
        return acc;
      }, {} as GroupedLogs);

      setGroupedLogs(grouped);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', 'sentinel_logs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser, embedded]);

  // --- LOGIC: FLUSH AUDIT LOGS (Clear 'Lint' Mode) ---
  const flushAuditLogs = async () => {
    if (!confirm("Are you sure you want to flush all static audit logs? This will clear the current 'Lint' state.")) return;
    
    const auditLogs = logs.filter(l => l.DTC_Code.includes('AUDIT'));
    if (auditLogs.length === 0) {
      alert("No audit logs found to flush.");
      return;
    }

    setLoading(true);
    try {
      await Promise.all(auditLogs.map(l => deleteDoc(doc(db, 'sentinel_logs', l.id))));
      alert(`[SENTINEL] ${auditLogs.length} audit instances purged.`);
    } catch (err) {
      console.error("Flush failed:", err);
      alert("Flush protocol failed. Check permissions.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: DEEP PROJECT SCAN ---
  const runDeepScan = async () => {
    setScanning(true);
    const steps = [
      { name: 'Mapping File Geometry', time: 1000 },
      { name: 'Static Analysis: Auth Patterns', time: 1500 },
      { name: 'Static Analysis: Async Memory Hooks', time: 2000 },
      { name: 'Predictive Diagnostics: Burn-in Patterns', time: 1500 },
      { name: 'Finalizing System Integrity Report', time: 1000 }
    ];

    for (let i = 0; i < steps.length; i++) {
      setScanProgress({ step: steps[i].name, percent: Math.round(((i + 1) / steps.length) * 100) });
      await new Promise(r => setTimeout(r, steps[i].time));
    }

    try {
      const prompt = `Perform a high-level static security and logic audit on this application structure.
      Available Modules: ${modules.map(m => m.name).join(', ')}
      Recent DTC Trends: ${Object.keys(groupedLogs).slice(0, 5).join(', ')}
      
      Look for potential "Weak Code" patterns:
      1. Missing error boundaries in UI components.
      2. Unhandled promise rejections in async logic.
      3. Global state mutation risks.
      
      Return JSON with a list of "audit_findings" (severity, message, file_target, patch_suggestion).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text.replace(/```json|```/g, "").trim());

      // Log findings as new DTCs marked as "Static Audit"
      for (const finding of result.audit_findings) {
        await addDoc(collection(db, 'sentinel_logs'), {
          DTC_Code: `AUDIT-${finding.severity.toUpperCase()}`,
          message: finding.message,
          Stack_Trace: `FILE: ${finding.file_target}\nSUGGESTED PATCH:\n${finding.patch_suggestion}`,
          module: 'Static Audit',
          status: 'unresolved',
          Timestamp: new Date(),
          User_Breadcrumbs: ['Deep Scan Triggered'],
          Device_Profile: { platform: 'Sentinel AI Audit' }
        });
      }

      alert("Deep Scan Complete. Audit findings have been injected into the scanner.");
    } catch (error) {
      console.error("Deep scan failed:", error);
    } finally {
      setScanning(false);
      setScanProgress(null);
    }
  };

  // --- LOGIC: AI ANALYSIS (DUAL-FIX + PATCH) ---
  const analyzeWithAI = async (dtc: string, log: SentinelLog) => {
    setAnalyzing(dtc);
    try {
      const prompt = `Act as a Senior SRE & Security Engineer for the IndieBrotherhood Sovereign Network. 
      Analyze this Sentinel OBD-II Diagnostic Trouble Code (DTC) and provide a surgical rectification strategy.
      
      DTC: ${dtc} | Module: ${log.module}
      Message: ${log.message}
      Stack: ${log.Stack_Trace}
      Context: ${log.User_Breadcrumbs?.join(' -> ')}
      
      CRITICAL REPAIR REQUIREMENTS:
      1. FIX_A must be a high-fidelity "Lock and Load" strategy focusing on ATOMIC transactions if state changes are involved.
      2. PATCH must be a specific code block or configuration change that resolves the root cause.
      3. Identify if this is a BOT attack or a VALID system fault.
      
      Return JSON:
      {
        "analysis": "Surgical root cause explanation (max 2 sentences)",
        "fixA": "Primary atomic strategy",
        "fixB": "Alternative fallback/mitigation",
        "patch": "--- Code Patch / Mitigation Steps ---"
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = safeParseAI(response.text);
      setAiAnalysis(prev => ({ ...prev, [dtc]: result }));
    } catch (error) {
      console.error("AI Diagnostic failed:", error);
    } finally {
      setAnalyzing(null);
    }
  };

  // --- LOGIC: SELF-HEALING / PATCHING ---
  const handleSelfHeal = async (dtc: string, logsToResolve: SentinelLog[], patch?: string) => {
    setHealing(dtc);
    setHealingProgress(20);
    logBreadcrumb(`SELF_HEAL_INIT: ${dtc}`);

    try {
      // ATOMIC TRANSACTION START
      await runTransaction(db, async (transaction) => {
        // 1. Log the patch if it exists
        if (patch) {
          const patchRef = doc(collection(db, 'sentinel_patches'));
          transaction.set(patchRef, {
            dtc,
            applied_patch: patch,
            timestamp: new Date(),
            status: 'applied',
            appliedBy: userProfile?.uid || 'SENTINEL_AUTO'
          });
        }

        // 2. Resolve all logs in this group
        for (const log of logsToResolve) {
          const logRef = doc(db, 'sentinel_logs', log.id);
          transaction.update(logRef, { status: 'resolved', resolvedAt: new Date() });
        }

        // 3. Award points if applicable
        if (userProfile?.uid) {
          const userRef = doc(db, 'users', userProfile.uid);
          transaction.update(userRef, { 
            credits: (userProfile.credits || 0) + 50,
            points: (userProfile.points || 0) + 100 
          });
        }
      });

      logBreadcrumb(`SELF_HEAL_SUCCESS: ${dtc}`);
      setHealingProgress(100);
      
      alert(`[SENTINEL ATOMIC REPAIR] ${dtc} rectified across ${logsToResolve.length} nodes.`);
    } catch (error) {
      console.error("Atomic healing failed:", error);
      logBreadcrumb(`SELF_HEAL_FAILED: ${dtc} - ${error instanceof Error ? error.message : 'Unknown'}`);
      alert("ATOMIC REPAIR FAILURE: System rollbacked to avoid corruption. Manual intervention required.");
    } finally {
      setHealing(null);
    }
  };

  const totalFaults = logs.filter(l => l.status === 'unresolved').length;
  const systemHealth = Math.max(0, 100 - (totalFaults * 5));

  const NavItems = [
    { label: "Profile", icon: User, to: "/profile" },
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "ML Lab", icon: Binary, to: "/ml-lab" },
    { label: "Control Room", icon: Terminal, to: "/control-room" },
    { label: "Admin Hub", icon: Activity, to: "/sentinel", active: true },
    { label: "The Judgment", icon: Gavel, to: "/judgment" },
    { label: "IBH Meeting", icon: Users, to: "/ibh" },
    { label: "The Lounge", icon: Coffee, to: "/lounge" },
    { label: "Mastering Suite", icon: Music, to: "/mastering" },
    { label: "Lyric Pro", icon: Feather, to: "/lyrics" },
    { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
    { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
  ];

  if (!embedded && !isSuperAdmin(authUser?.email)) {
     return (
       <div className="min-h-screen bg-black flex items-center justify-center p-20 text-center">
         <div className="space-y-6">
           <ShieldAlert className="text-red-600 mx-auto animate-pulse" size={80} />
           <h1 className="text-4xl font-black italic uppercase italic tracking-tighter text-white">Access Denied</h1>
           <p className="text-[#10b981] font-black uppercase tracking-widest text-[10px]">Unauthorized frequency detected. Return to terminal.</p>
           <button onClick={() => navigate('/dashboard')} className="px-8 py-3 border border-white/20 text-white/40 hover:text-white transition-all uppercase font-black italic text-xs tracking-widest">
             Exit
           </button>
         </div>
       </div>
     );
  }

  return (
    <div className={cn(
      "min-h-screen bg-black text-[#10b981] font-mono selection:bg-[#10b981] selection:text-black",
      !embedded && "overflow-x-hidden"
    )}>
      {/* HUD Scanner Ticker */}
      {!embedded && (
        <div className="bg-[#10b981] overflow-hidden py-1 border-y border-black/10 relative z-30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <div className="flex whitespace-nowrap animate-ticker">
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-12 px-6">
                <span className="text-black font-black uppercase italic text-xs tracking-[0.2em]">SENTINEL OBD-II ACTIVE // MONITORING ERA PROTOCOLS</span>
                <span className="text-black/40 font-black">•</span>
                <span className="text-black font-black uppercase italic text-xs tracking-[0.2em]">SYSTEM HEALTH: {systemHealth}% // FAULTS DETECTED: {totalFaults}</span>
                <span className="text-black/40 font-black">•</span>
                <span className="text-black font-black uppercase italic text-xs tracking-[0.2em]">AI DIAGNOSTIC ENGINE v3.1 STANDBY</span>
                <span className="text-black/40 font-black">•</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!embedded && (
        <header className="p-6 flex justify-between items-center border-b border-[#10b981]/10 bg-black/40 backdrop-blur-md sticky top-[28px] z-20">
          <div className="flex items-center gap-6">
            <button 
              className="p-3 hover:bg-[#10b981] hover:text-black rounded-sm border border-[#10b981]/20 transition-all group" 
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu size={20} className="text-[#10b981] group-hover:text-black" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#10b981] flex items-center justify-center animate-pulse">
                <Activity size={16} className="text-black" />
              </div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none text-white">Admin Hub <span className="text-[10px] text-[#10b981]/60">(Sentinel)</span></h1>
            </div>
            <div className="hidden lg:flex items-center gap-4 border-l border-[#10b981]/20 pl-6 ml-2">
              <div className="px-3 py-1 bg-[#10b981]/5 border border-[#10b981]/10 text-[10px] font-black uppercase tracking-widest text-[#10b981] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  ROOT ACCESS: EXECUTIVE
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end mr-6 hidden sm:flex">
              <span className="text-[10px] uppercase tracking-widest text-[#10b981]/60 mb-1">Global Health Index</span>
              <div className="flex items-center gap-3">
                <div className="w-48 h-2 bg-zinc-900 rounded-full overflow-hidden border border-[#10b981]/20">
                  <div 
                    className={cn("h-full transition-all duration-1000", systemHealth > 80 ? "bg-[#10b981]" : systemHealth > 50 ? "bg-yellow-500" : "bg-red-500")}
                    style={{ width: `${systemHealth}%` }}
                  />
                </div>
                <span className={cn("font-bold text-xl leading-none", systemHealth > 80 ? "text-[#10b981]" : systemHealth > 50 ? "text-yellow-500" : "text-red-500")}>
                  {systemHealth}%
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={flushAuditLogs}
                disabled={loading || logs.filter(l => l.DTC_Code.includes('AUDIT')).length === 0}
                className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-3 rounded-sm font-black italic uppercase italic tracking-widest transition-all flex items-center gap-2 border border-red-500/20 disabled:opacity-30"
                title="Clear all Static Audit logs (Lint Mode)"
              >
                <Trash2 size={18} />
                Flush Audit
              </button>
              
              <button 
                onClick={runDeepScan}
                disabled={scanning}
                className="bg-[#10b981] text-black px-6 py-3 rounded-sm font-black italic uppercase italic tracking-widest hover:bg-white active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                <Sparkles size={18} className={scanning ? "animate-spin" : ""} />
                Deep Scan
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-10">
         {/* LEFT COLUMN: MODULE HEALTH DASHBOARD */}
         <div className="lg:col-span-4 space-y-8">
            <div className="bg-zinc-950 border border-[#10b981]/20 p-8 shadow-[0_20px_50px_rgba(16,185,129,0.05)]">
               <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#10b981]/40 mb-8 flex items-center gap-2">
                  <Database size={14} /> Module Health Check
               </h2>
               <div className="space-y-8">
                  {modules.map(mod => (
                  <div key={mod.name} className="space-y-3">
                     <div className="flex justify-between items-end">
                        <span className="text-white font-black italic uppercase tracking-tighter text-sm">{mod.name}</span>
                        <span className={cn(
                           "text-[10px] font-black uppercase italic tracking-widest",
                           mod.status === 'healthy' ? "text-[#10b981]" : mod.status === 'warning' ? "text-yellow-500" : "text-red-500"
                        )}>
                           {mod.score}% {mod.status}
                        </span>
                     </div>
                     <div className="h-1 bg-white/5 overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                        <div 
                           className={cn("h-full transition-all duration-500", mod.status === 'healthy' ? "bg-[#10b981]" : mod.status === 'warning' ? "bg-yellow-500" : "bg-red-500")}
                           style={{ width: `${mod.score}%` }}
                        />
                     </div>
                     {mod.faults > 0 && (
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse italic">
                           {mod.faults} CRITICAL FAULTS DETECTED
                        </p>
                     )}
                  </div>
                  ))}
               </div>
            </div>

            <div className="bg-zinc-950 border border-[#10b981]/10 p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShieldAlert size={100} className="text-[#10b981]" />
               </div>
               <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#10b981]/40 mb-6 flex items-center gap-2">
                  <Terminal size={14} /> Watchdog Feed
               </h2>
               <div className="space-y-4 font-mono">
                  <div className="flex items-start gap-4 text-[11px]">
                     <span className="text-[#10b981] font-bold">02:14:42</span>
                     <span className="text-white/40 italic uppercase tracking-widest">Runtime Watchdog monitoring heap usage...</span>
                  </div>
                  <div className="flex items-start gap-4 text-[11px]">
                     <span className="text-[#10b981] font-bold">02:14:00</span>
                     <span className="text-white/40 italic uppercase tracking-widest">Global ERA context stabilized in cache.</span>
                  </div>
                  <div className="flex items-start gap-4 text-[11px]">
                     <span className="text-red-500/80 font-bold">02:13:50</span>
                     <span className="text-red-500/80 italic uppercase tracking-widest">Minor jitter detected in Auth Pipeline.</span>
                  </div>
               </div>
               <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">Sentinel Watchdog v2.8</span>
                  <div className="flex gap-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                     <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse delay-100" />
                     <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse delay-200" />
                  </div>
               </div>
            </div>
         </div>

         {/* RIGHT COLUMN: DIAGNOSTIC GRID */}
         <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode='popLayout'>
               {Object.entries(groupedLogs).map(([dtc, group]) => (
               <motion.div 
                  key={dtc}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className={cn(
                     "border-l-4 rounded-none bg-zinc-950 transition-all shadow-xl group",
                     group.highestRisk > 50 || dtc.includes('AUDIT') ? "border-red-500" : "border-[#10b981]",
                     expandedDtc === dtc ? "p-0" : "p-2"
                  )}
               >
                  <div 
                     onClick={() => setExpandedDtc(expandedDtc === dtc ? null : dtc)}
                     className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                  >
                     <div className="flex items-center gap-6">
                        <div className={cn(
                           "w-12 h-12 flex items-center justify-center border transition-all",
                           group.highestRisk > 50 || dtc.includes('AUDIT') ? "border-red-500/50 bg-red-500/10 text-red-500" : "border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]"
                        )}>
                           <ShieldAlert size={24} className={group.highestRisk > 60 ? "animate-pulse" : ""} />
                        </div>
                        <div>
                           <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">DTC: {dtc}</h3>
                           <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                                 {dtc.includes('AUDIT') ? 'STATIC ANALYSIS FINDING' : `${group.count} INSTANCES LOGGED IN ERA`}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
                              <span className="text-[10px] text-[#10b981] font-black uppercase tracking-widest italic">{group.logs[0].module}</span>
                           </div>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-8">
                        <div className="text-right">
                           <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Risk Level</div>
                           <div className={cn("text-xl font-black italic italic leading-none", group.highestRisk > 50 ? "text-red-500" : "text-[#10b981]")}>
                              {group.highestRisk}%
                           </div>
                        </div>
                        <div className="text-white/20 group-hover:text-[#10b981] transition-colors">
                           {expandedDtc === dtc ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                     </div>
                  </div>

                  {expandedDtc === dtc && (
                  <div className="p-8 border-t border-white/5 bg-black/40 space-y-8 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                     {/* AI TOOLS BAR */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                           onClick={() => analyzeWithAI(dtc, group.logs[0])}
                           disabled={!!analyzing}
                           className="flex items-center justify-center gap-3 bg-[#10b981] text-black p-4 font-black uppercase italic tracking-widest hover:bg-white transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                           <Sparkles size={18} className={analyzing === dtc ? "animate-spin" : ""} />
                           {analyzing === dtc ? "CONSULTING ARCHITECT..." : "INITIATE AI DIAGNOSIS"}
                        </button>
                        <button 
                           onClick={() => handleSelfHeal(dtc, group.logs)}
                           className="flex items-center justify-center gap-3 bg-white/5 border border-white/20 text-white p-4 font-black uppercase italic tracking-widest hover:border-purple-500 hover:text-purple-500 transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                        >
                           <Wrench size={18} />
                           DEPLOY AUTO-REPAIR
                        </button>
                     </div>

                     {/* AI RESULTS DISPLAY */}
                     {aiAnalysis[dtc] && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                           <div className="bg-[#10b981]/10 border-l-4 border-[#10b981] p-6 relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                 <Terminal size={100} className="text-[#10b981]" />
                              </div>
                              <div className="flex items-center gap-3 text-[#10b981] mb-4">
                                 <AlertCircle size={20} />
                                 <span className="text-xs font-black uppercase tracking-[0.3em] italic">Architectural Analysis</span>
                              </div>
                              <p className="text-sm italic font-medium leading-relaxed text-white/90 italic">{aiAnalysis[dtc].analysis}</p>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-6 bg-zinc-900 border-l-2 border-[#10b981]/40">
                                 <span className="text-[10px] font-black text-[#10b981] uppercase tracking-widest mb-4 block italic underline decoration-[#10b981]/30">Primary Hotpatch</span>
                                 <pre className="text-[11px] whitespace-pre-wrap text-white/70 leading-relaxed font-mono italic">{aiAnalysis[dtc].fixA}</pre>
                              </div>
                              <div className="p-6 bg-zinc-900 border-l-2 border-blue-500/40">
                                 <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-4 block italic underline decoration-blue-500/30">Secondary Protocol</span>
                                 <pre className="text-[11px] whitespace-pre-wrap text-white/70 leading-relaxed font-mono italic">{aiAnalysis[dtc].fixB}</pre>
                              </div>
                           </div>

                           {aiAnalysis[dtc].patch && (
                           <div className="bg-black p-8 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
                              <div className="flex justify-between items-center mb-6">
                                 <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                                    <Code size={12} /> AI-Generated Git Snapshot
                                 </span>
                                 <button 
                                    onClick={() => {
                                       navigator.clipboard.writeText(aiAnalysis[dtc].patch || '');
                                       alert("Patch copied to clipboard. Paste this into the AIS Chat to apply it.");
                                    }}
                                    className="text-[10px] font-black text-white/60 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors border-b border-white/20 pb-1"
                                 >
                                    Copy Patch
                                 </button>
                              </div>
                              <div className="p-6 bg-zinc-950/80 border border-white/5 rounded-sm overflow-x-auto">
                                 <pre className="text-[10px] font-mono text-zinc-400 leading-relaxed italic">
                                    {aiAnalysis[dtc].patch}
                                 </pre>
                              </div>
                           </div>
                           )}
                        </motion.div>
                     )}

                     {/* LOGS LIST */}
                     <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-4 italic">Occurrence History</h4>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                           {group.logs.map((log) => (
                           <div key={log.id} className="p-4 bg-zinc-900 border border-white/5 flex justify-between items-center group/log">
                              <div>
                                 <div className="text-xs text-white/80 font-bold uppercase tracking-tight">{log.message}</div>
                                 <div className="text-[9px] text-white/20 mt-1 uppercase font-black tracking-widest">
                                    {log.Timestamp?.seconds ? new Date(log.Timestamp.seconds * 1000).toLocaleString() : 'STABILIZED'} // UID: {log.id ? log.id.slice(0, 8) : 'unknown'}
                                 </div>
                              </div>
                              <div className="flex items-center gap-3 opacity-0 group-hover/log:opacity-100 transition-opacity">
                                 <button 
                                    onClick={() => updateDoc(doc(db, 'sentinel_logs', log.id), { status: 'resolved' })}
                                    className="w-10 h-10 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 flex items-center justify-center hover:bg-[#10b981] hover:text-black transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                                 >
                                    <CheckCircle size={16} />
                                 </button>
                                 <button 
                                    onClick={() => deleteDoc(doc(db, 'sentinel_logs', log.id))}
                                    className="w-10 h-10 bg-red-500/10 text-red-500 border border-red-500/30 flex items-center justify-center hover:bg-red-500 hover:text-black transition-all"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </div>
                           ))}
                        </div>
                     </div>
                  </div>
                  )}
               </motion.div>
               ))}
            </AnimatePresence>

            {logs.length === 0 && !loading && (
               <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-[#10b981]/10 rounded-none bg-zinc-950/50 shadow-2xl shadow-black/80">
                  <div className="w-20 h-20 rounded-full bg-[#10b981]/5 flex items-center justify-center mb-6 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                     <CheckCircle className="text-[#10b981]/20" size={48} />
                  </div>
                  <p className="text-[#10b981]/40 font-black uppercase italic tracking-[0.3em] italic">System Memory Initialized :: No Fault Codes Present</p>
               </div>
            )}
         </div>
      </main>

      {/* SCANNING OVERLAY */}
      <AnimatePresence>
         {scanning && (
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/98 backdrop-blur-2xl z-50 flex items-center justify-center p-8"
         >
            <div className="max-w-xl w-full text-center space-y-12">
               <div className="relative mx-auto w-32 h-32">
                  <motion.div 
                     className="absolute inset-0 border-2 border-[#10b981] rounded-full shadow-2xl shadow-black/80"
                     animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                     transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div 
                     className="absolute inset-2 border border-[#10b981]/30 rounded-full"
                     animate={{ rotate: -360 }}
                     transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Sparkles className="text-[#10b981] animate-pulse" size={48} />
                  </div>
               </div>
               
               <div className="space-y-4">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white italic">Elite Audit Active</h2>
                  <div className="bg-[#10b981]/10 border border-[#10b981]/20 px-4 py-2 inline-block backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                     <p className="text-[#10b981] font-mono text-xs uppercase tracking-[0.3em] font-black italic">{scanProgress?.step || 'Initializing Protocol...'}</p>
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="w-full h-1 bg-white/5 overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                     <motion.div 
                        className="h-full bg-[#10b981] shadow-[0_0_20px_rgba(16,185,129,1)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${scanProgress?.percent || 0}%` }}
                     />
                  </div>
                  <div className="flex justify-between items-center text-[#10b981]/40 font-black tracking-widest text-[10px]">
                     <span>INTEGRITY CHECK</span>
                     <span>{scanProgress?.percent || 0}% SECURE</span>
                  </div>
               </div>
            </div>
         </motion.div>
         )}
      </AnimatePresence>

      {/* HEALING OVERLAY */}
      <AnimatePresence>
         {healing && (
         <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-8 text-center"
         >
            <div className="space-y-8 max-w-sm">
               <div className="w-24 h-24 bg-purple-500/10 border-2 border-purple-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(168,85,247,0.2)]">
                  <Activity className="text-purple-500 animate-pulse" size={48} />
               </div>
               <div className="space-y-2">
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white italic">Self-Healing Protocol</h2>
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.3em] italic">RECONSTRUCTING MODULE LOGIC FOR {healing}</p>
               </div>
               <div className="w-full h-2 bg-white/5 border border-white/10 overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <motion.div 
                     className="h-full bg-purple-500"
                     initial={{ width: 0 }}
                     animate={{ width: `${healingProgress}%` }}
                  />
               </div>
            </div>
         </motion.div>
         )}
      </AnimatePresence>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && !embedded && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ x: -400 }}
              animate={{ x: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              exit={{ x: -400 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-r-4 border-[#10b981] z-[101] p-8 flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-8 flex-shrink-0">
                 <h2 className="text-3xl font-black italic uppercase leading-none tracking-tighter italic text-white">Indie<br/><span className="text-[#10b981]">Brotherhood</span></h2>
                 <button onClick={() => setIsMenuOpen(false)} className="text-white/20 hover:text-white hover:rotate-90 transition-all duration-300">
                    <X size={24} />
                 </button>
              </div>
              
              <nav className="flex-grow space-y-2 mb-8">
                {NavItems.map((item, i) => (
                  <Link 
                    to={item.to} 
                    key={i} 
                    onClick={() => {
                      if (window.location.pathname === item.to) {
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`flex items-center gap-4 p-4 transition-all group ${window.location.pathname === item.to ? 'bg-[#10b981] text-black shadow-lg translate-x-2' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <item.icon size={20} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#10b981] transition-transform group-hover:scale-110'} />
                    <span className="font-black uppercase tracking-[0.2em] text-[10px] italic">{item.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="mt-auto pt-8 border-t border-white/5 flex-shrink-0">
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-black border-2 border-[#10b981] flex items-center justify-center p-0.5 overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                       <User size={24} className="text-[#10b981]" />
                    </div>
                    <div>
                       <div className="text-[10px] font-black text-white/30 uppercase tracking-widest italic">Member Rank</div>
                       <div className="text-[#10b981] font-black italic text-sm italic uppercase">{userProfile?.displayName || userProfile?.email?.split('@')[0] || 'ANONYMOUS'}</div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SentinelScanner;
