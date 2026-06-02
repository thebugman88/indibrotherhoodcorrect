import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Briefcase, Calendar, ChevronRight, Zap, Target, Music } from 'lucide-react';
import { cn } from '../lib/utils';

const ArtistManager = () => {
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [goals, setGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  const generatePlan = async () => {
    if (!artistName || !goals) return;
    setLoading(true);
    try {
      const resp = await fetch('/api/artist-manager/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistName, genre, goals })
      });
      const data = await resp.json();
      setPlan(data.plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-[#24b324]/10 rounded-full flex items-center justify-center mx-auto border-2 border-[#24b324]/40"
          >
            <Briefcase className="text-[#24b324]" size={32} />
          </motion.div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter italic">Artist Assistant</h1>
          <p className="text-[#24b324] font-black uppercase tracking-[0.4em] text-xs">Powered by OpenAI // IBH Hybrid Intelligence</p>
        </div>

        {!plan ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-950 border border-white/10 p-10 space-y-8 shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                  <Target size={12} /> Artist / Stage Name
                </label>
                <input 
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full bg-black border border-white/10 p-5 font-bold uppercase italic text-[#24b324] focus:border-[#24b324]/40 outline-none"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                  <Music size={12} /> Genre / Aesthetic
                </label>
                <input 
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Hip-hop, Indie Rock, etc."
                  className="w-full bg-black border border-white/10 p-5 font-bold uppercase italic text-[#24b324] focus:border-[#24b324]/40 outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} /> Your 30-Day Goals
              </label>
              <textarea 
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="Release a single, gain 1k followers, book a show..."
                className="w-full h-32 bg-black border border-white/10 p-6 text-sm italic font-medium focus:border-[#24b324]/40 outline-none resize-none"
              />
            </div>

            <button 
              onClick={generatePlan}
              disabled={loading || !artistName || !goals}
              className="w-full py-6 bg-[#24b324] text-black font-black uppercase italic tracking-[0.3em] hover:bg-white transition-all flex items-center justify-center gap-4 disabled:opacity-30 border-b-4 border-black/40 hover:scale-[1.02] active:translate-y-[2px] active:border-b-2"
            >
              {loading ? (
                <>
                  <Zap className="animate-spin" size={20} />
                  CALCULATING ROLLOUT...
                </>
              ) : (
                <>
                  GENERATE 30-DAY STRATEGY
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="bg-[#24b324]/10 border-l-4 border-[#24b324] p-8 relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Calendar size={120} className="text-[#24b324]" />
              </div>
              <div className="flex items-center gap-3 text-[#24b324] mb-6">
                <Calendar size={20} />
                <span className="text-xs font-black uppercase tracking-[0.3em] italic">Custom Rollout Plan for {artistName}</span>
              </div>
              <div className="prose prose-invert max-w-none prose-p:text-sm prose-p:leading-relaxed prose-headings:italic prose-headings:uppercase prose-headings:tracking-tighter">
                <div className="whitespace-pre-wrap font-medium text-white/90 leading-relaxed italic">
                  {plan}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setPlan(null)}
              className="px-8 py-3 border border-white/10 text-white/40 hover:text-white transition-all font-black uppercase italic text-xs tracking-widest"
            >
              Start New Analysis
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ArtistManager;
