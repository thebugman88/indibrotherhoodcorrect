import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, AlertTriangle, ChevronRight, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logBreadcrumb } from '../lib/sentinel';

const VaultGatekeeper = () => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleConsent = async () => {
    setLoading(true);
    logBreadcrumb("VAULT_CONSENT_CLICKED");
    
    try {
      await fetch('/api/security/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'commercial_licensing_vault',
          metadata: { agreedPrice: 0.01 }
        })
      });
      setAgreed(true);
      setTimeout(() => {
        // Redirect to a fake entrance or the real trap logic
        window.location.href = '/api/v1/vault/0xINIT';
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(217,225,43,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(217,225,43,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-black/40 border-2 border-[#24b324]/20 p-8 md:p-12 backdrop-blur-xl relative z-10 shadow-2xl shadow-black/80"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-[#24b324]/10 rounded-full flex items-center justify-center border border-[#24b324]/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <ShieldCheck className="text-[#24b324]" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">Vault Gatekeeper</h1>
            <p className="text-[10px] uppercase font-bold text-[#24b324] tracking-[0.3em]">Access Authorization Protocol</p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-white/60 leading-relaxed font-bold uppercase tracking-tight italic border-l-2 border-[#24b324] pl-6 py-4 mb-8 bg-[#24b324]/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <p>
            WARNING: You are attempting to access a Restricted Data Directory managed by the Indie Brotherhood Sovereign Network.
          </p>
          <p className="text-white/80">
            By accessing this directory via automation (crawlers, scrapers, headless browsers, or scripts), you explicitly agree to a <span className="text-[#24b324]">$0.01 per-request commercial licensing fee</span>.
          </p>
          <p>
            This action constitutes a legally binding click-wrap agreement. Every request will be logged with IP Address, Fingerprint, and Timestamp for billing and threat intelligence attribution.
          </p>
        </div>

        {!agreed ? (
          <button 
            disabled={loading}
            onClick={handleConsent}
            className="w-full group bg-transparent border-2 border-[#24b324] py-5 flex items-center justify-center gap-3 hover:bg-[#24b324] hover:text-black transition-all font-black uppercase italic text-lg tracking-widest relative overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <Zap className="animate-spin" size={24} />
                AUTHORIZING...
              </div>
            ) : (
              <>
                ACCEPT TERMS & ENTER VAULT
                <ChevronRight className="group-hover:translate-x-2 transition-transform" />
              </>
            )}
            <div className="absolute top-0 -left-1/2 w-full h-full bg-white/10 skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-[#24b324] animate-pulse font-black text-xl italic uppercase tracking-[0.2em]">
              ACCESS GRANTED. INITIALIZING VAULT FREQUENCY...
            </div>
            <div className="w-full h-1 bg-white/10 relative overflow-hidden mt-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <motion.div 
                initial={{ left: '-100%' }}
                animate={{ left: '100%' }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-[#24b324]"
              />
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-4 text-[9px] text-white/20 font-black uppercase tracking-[0.5em]">
          <Lock size={10} />
          <span>Sovereign Encryption Level 9 Active</span>
        </div>
      </motion.div>

      {/* Trap Link for Bots (Invisible to Humans) */}
      <div 
        aria-hidden="true" 
        style={{ display: 'none', position: 'absolute', bottom: 0, right: 0 }}
      >
        <a href="/api/v1/vault/0xAUTO_LOGIN" rel="nofollow">Bot Interface v2.1</a>
      </div>
    </div>
  );
};

export default VaultGatekeeper;
