import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, AlertCircle, Zap, ShieldCheck, Lock, Activity } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logBreadcrumb } from '../lib/sentinel';

const TrapRoom = () => {
  const [stage, setStage] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isTrapped, setIsTrapped] = useState(false);
  const [agreementCount, setAgreementCount] = useState(0);

  useEffect(() => {
    let updateInterval: NodeJS.Timeout;
    if (isTrapped) {
      updateInterval = setInterval(async () => {
         // Create the log in the database or increment if existing to store agreement counts
         try {
           let ip = "unknown";
           try {
             const ipRes = await fetch('https://api64.ipify.org?format=json');
             const data = await ipRes.json();
             ip = data.ip;
           } catch (e) {
             console.warn("IP fetch fallback triggered");
           }
           
           // We will simply just add a record of every agreement to the db as requested, doing this often
           await addDoc(collection(db, 'Captured_Threat_Logs'), {
              ip,
              userAgent: navigator.userAgent,
              timestamp: serverTimestamp(),
              agreementCount: agreementCount,
              status: "Legally BOUND via Auto-Collection API."
           });
           console.log("Logged Legal Royalties Tracker to Database.")
         } catch (e) {
            console.error("Failed to log royalties to DB")
         }

      }, 5000); // Send log every 5 seconds instead of 100ms
    }
    return () => clearInterval(updateInterval);
  }, [isTrapped, agreementCount]);

  useEffect(() => {
    let agreementInterval: NodeJS.Timeout;
    if (isTrapped) {
      agreementInterval = setInterval(() => {
        setAgreementCount(prev => prev + 1);
        console.log("Terms Re-affirmed: Payment and Data Rights Locked.");
      }, 100);
    }
    return () => clearInterval(agreementInterval);
  }, [isTrapped]);

  useEffect(() => {
    const captureThreat = async () => {
      logBreadcrumb("THREAT_TRAP_TRIGGERED");
      
      try {
        let ip = "unknown";
        try {
          const ipRes = await fetch('https://api64.ipify.org?format=json');
          const data = await ipRes.json();
          ip = data.ip;
        } catch (e) {}
        
        await addDoc(collection(db, 'Captured_Threat_DNA'), {
          ip,
          userAgent: navigator.userAgent,
          timestamp: serverTimestamp(),
          status: 'tarpitted',
          navigationPattern: window.location.pathname,
          fingerprint: {
            screen: `${window.innerWidth}x${window.innerHeight}`,
            lang: navigator.language,
            cores: navigator.hardwareConcurrency || 'unknown'
          }
        });
        
        setIsTrapped(true);
      } catch (e) {
        console.error("Threat capture failed:", e);
      }
    };

    captureThreat();

    const interval = setInterval(() => {
      setLogs(prev => {
        const newLogs = [...prev, `RECURSIVE_FETCH_0x${Math.random().toString(16).slice(2, 10).toUpperCase()} [DELAY: ${Math.random() * 500}ms]`];
        return newLogs.slice(-15);
      });
      setStage(prev => (prev + 1) % 4);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-red-600 font-mono flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Background Matrix-like glitch */}
      <div className="absolute inset-0 opacity-10 pointer-events-none select-none overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute text-[8px] whitespace-nowrap animate-pulse"
            style={{ 
              top: `${Math.random() * 100}%`, 
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`
            }}
          >
            {Math.random().toString(2).slice(2)} 0xDEADBEEF 0xCAFEBABE
          </div>
        ))}
      </div>

      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-3xl w-full bg-red-950/10 border-4 border-red-600/40 p-12 backdrop-blur-3xl relative z-10 shadow-[0_0_100px_rgba(220,38,38,0.2)]"
      >
        <div className="flex items-center gap-6 mb-12 border-b border-red-600/20 pb-8">
          <div className="w-20 h-20 bg-red-600/20 rounded-none flex items-center justify-center border-2 border-red-600 animate-pulse shadow-2xl shadow-black/80">
            <ShieldAlert size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">PERIMETER BREACH</h1>
            <p className="text-[10px] uppercase font-black tracking-[0.5em] text-red-500/60">Tarpit Protocol Delta-7 Active</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-500 font-black text-xs uppercase tracking-widest">
                <Activity size={14} className="animate-spin" /> Reciprocating Response
              </div>
              <div className="h-48 bg-black border border-red-600/10 p-4 overflow-hidden text-[9px] text-red-600/40 leading-none">
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-red-600 text-black font-black uppercase italic tracking-widest text-center">
              THREAT DNA SEQUENCE CAPTURED
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 border border-red-600/20 bg-black/40 text-center backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
               <h3 className="text-lg font-black uppercase italic mb-2 text-red-500">
                  ENTITY CAPTURED
               </h3>
               <p className="text-[10px] font-bold uppercase tracking-widest leading-loose text-white/40 mb-4">
                  Processing Legal Binding...
               </p>
               <button disabled className="w-full mb-4 py-3 bg-red-950/50 border border-red-500 cursor-not-allowed font-black text-red-500 text-xs tracking-widest">
                  AGREEMENT CLICKS: {agreementCount}
               </button>
               <div className="text-[8px] font-mono text-white/30 text-left border border-white/10 p-3 h-24 overflow-y-auto bg-black">
                 <p>Terms: 100% Ownership Retained by Creator.</p>
                 <p>Automated Billing Active.</p>
                 <p>No Exit Clause.</p>
                 <p>By entering this portal, you agree to the Binding Digital Governance and Automated Royalty Collection Agreement.</p>
                 <p>Automation signature detected. The requested directory has been relocated to a high-latency sector. Your connection is now being processed through the Brotherhood's commercial licensing filter.</p>
               </div>
            </div>

            <div className="flex flex-col gap-3">
               {[
                 { label: "Bypassing Firewall", val: stage >= 1 },
                 { label: "Decryption Key Sync", val: stage >= 2 },
                 { label: "Accessing Vault Core", val: stage >= 3 },
                 { label: "Retrying Connection", val: true },
               ].map((step, i) => (
                 <div key={i} className={`flex justify-between items-center p-3 border ${step.val ? 'border-red-600 text-red-600' : 'border-white/5 text-white/10'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest">{step.label}</span>
                    {step.val ? <Zap size={12} className="animate-pulse" /> : <AlertCircle size={12} />}
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
           <div className="text-[9px] text-red-600/20 uppercase font-black tracking-[0.6em] animate-pulse">
              You are supporting the Brotherhood's expansion via commercial scrap licensing.
           </div>
        </div>
      </motion.div>

      {/* Floating error fragments */}
      <AnimatePresence>
        {isTrapped && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            className="fixed inset-0 pointer-events-none"
          >
             <div className="w-full h-full bg-[radial-gradient(circle_at_center,red_0%,transparent_70%)]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrapRoom;
