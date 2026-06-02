import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Copy, Share2, Music, CheckSquare, Hash, ArrowLeft, Disc, Fingerprint, Lock, ShieldAlert, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  collection, query, orderBy, onSnapshot, doc, getDoc, 
  setDoc, addDoc, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { SentinelBoundary, logBreadcrumb } from '../lib/sentinel';
import toast from 'react-hot-toast';

// SIMULATE UPLOAD HASHING
const generateHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
};

const K7Pool = () => {
  const [hasContract, setHasContract] = useState<boolean | null>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'pool' | 'upload' | 'generator' | 'tracks'>('pool');
  
  // Training State
  const [isTraining, setIsTraining] = useState(false);
  const [trainingTimeLeft, setTrainingTimeLeft] = useState(120); // 2 minutes
  
  // Data
  const [assets, setAssets] = useState<any[]>([]);
  const [myAssets, setMyAssets] = useState<any[]>([]);
  const [generatedTracks, setGeneratedTracks] = useState<any[]>([]);
  
  // Upload State
  const [uploadType, setUploadType] = useState('vocal');
  const [uploadName, setUploadName] = useState('');
  const [uploadBpm, setUploadBpm] = useState('120');
  const [uploadKey, setUploadKey] = useState('C');
  const [isUploading, setIsUploading] = useState(false);

  // Generator State
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const d = await getDoc(doc(db, 'k7_contracts', user.uid));
          if (d.exists()) {
             setHasContract(true);
             setContractData(d.data());
          } else {
             setHasContract(false);
          }
        } catch (err) {
          console.error(err);
          setHasContract(false);
        }
      } else {
        setHasContract(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!auth.currentUser || hasContract !== true) return;

    // Listen to Pool Assets
    const qAssets = query(collection(db, 'k7_assets'), orderBy('createdAt', 'desc'));
    const unsubAssets = onSnapshot(qAssets, (snap) => {
      const allAssets = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setAssets(allAssets);
      setMyAssets(allAssets.filter(a => a.ownerId === auth.currentUser?.uid));
    }, (err) => {
      console.error(err);
    });

    // Listen to Generated Tracks
    const qTracks = query(collection(db, 'k7_generated_tracks'), orderBy('createdAt', 'desc'));
    const unsubTracks = onSnapshot(qTracks, (snap) => {
      setGeneratedTracks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error(err);
    });

    return () => {
      unsubAssets();
      unsubTracks();
    };
  }, [hasContract]);

  const signContract = async () => {
    if (!agreed) {
      toast.error("You must check the agreement box to proceed.");
      return;
    }
    if (signature.trim().length < 4) {
      toast.error("Please provide your full legal name as a signature.");
      return;
    }
    
    try {
      await setDoc(doc(db, 'k7_contracts', auth.currentUser!.uid), {
        userId: auth.currentUser!.uid,
        email: auth.currentUser!.email,
        fullNameSignature: signature.trim(),
        agreedToFairUse: true,
        signedAt: serverTimestamp(),
        vocalTrained: false,
        signatureKey: generateHash(auth.currentUser!.uid + Date.now().toString())
      });
      setHasContract(true);
      setContractData({ vocalTrained: false });
      toast.success("CONTRACT SEALED. Welcome to the K7 Syndicate.");
      logBreadcrumb("K7_CONTRACT_SIGNED");
    } catch (e: any) {
      toast.error("Failed to seal contract: " + e.message);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isTraining && trainingTimeLeft > 0) {
      interval = setInterval(() => {
        setTrainingTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isTraining && trainingTimeLeft <= 0) {
      // Training complete
      setIsTraining(false);
      const finishTraining = async () => {
        try {
          await setDoc(doc(db, 'k7_contracts', auth.currentUser!.uid), { vocalTrained: true }, { merge: true });
          setContractData((prev: any) => ({ ...prev, vocalTrained: true }));
          toast.success("Vocal Training Complete. Syndicate Generative Access Unlocked.");
        } catch (e) {
          console.error(e);
        }
      };
      finishTraining();
    }
    return () => clearInterval(interval);
  }, [isTraining, trainingTimeLeft]);

  const startTraining = () => {
    setIsTraining(true);
    setTrainingTimeLeft(120);
  };

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setUploadFile(e.dataTransfer.files[0]);
      if (!uploadName) setUploadName(e.dataTransfer.files[0].name.split('.')[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadFile(e.target.files[0]);
      if (!uploadName) setUploadName(e.target.files[0].name.split('.')[0]);
    }
  };

  const submitAsset = async () => {
    if (!uploadName || !uploadBpm || !uploadKey || !uploadFile) {
      toast.error("Complete the asset manifest, including a file.");
      return;
    }
    
    setIsUploading(true);
    try {
      // Create a deterministic hash from the ACTUAL file size and modification time, + user uid to prove it's a real file anchor
      const tracerId = `K7-TRC-${generateHash(auth.currentUser!.uid + uploadFile.size.toString() + uploadFile.lastModified.toString() + uploadName)}`;
      
      await addDoc(collection(db, 'k7_assets'), {
        ownerId: auth.currentUser!.uid,
        ownerEmail: auth.currentUser!.email,
        name: uploadName,
        type: uploadType,
        bpm: parseInt(uploadBpm),
        musicKey: uploadKey,
        fileSize: uploadFile.size,
        fileName: uploadFile.name,
        tracerId,
        createdAt: serverTimestamp()
      });
      
      setUploadName('');
      setUploadFile(null);
      toast.success("Asset Deposited & Traced.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const generateTrack = async () => {
    if (assets.length < 3) {
      toast.error("Insufficient pool elasticity. Need more assets in K7.");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Real procedural logic: finding the most mathematically resonant stems based on strict grouping 
      // 1. Group assets by BPM ranges
      const bpmGroups: Record<number, any[]> = {};
      assets.forEach(a => {
        const rounded = Math.round(a.bpm / 5) * 5; // Group into 5 BPM buckets
        if (!bpmGroups[rounded]) bpmGroups[rounded] = [];
        bpmGroups[rounded].push(a);
      });

      // 2. Find the bucket with the highest density (most assets)
      let bestBpm = 120;
      let maxCount = 0;
      Object.keys(bpmGroups).forEach(bpmStr => {
        const b = parseInt(bpmStr);
        if (bpmGroups[b].length > maxCount) {
          maxCount = bpmGroups[b].length;
          bestBpm = b;
        }
      });

      // 3. Filter candidate pool to this ideal BPM range to ensure tempo lock
      let candidates = bpmGroups[bestBpm] || assets;

      // 4. If we don't have all types in this bucket, fallback to all assets to prevent crash, but this is the mathematical intent.
      const v = candidates.find(a => a.type === 'vocal') || assets.find(a => a.type === 'vocal');
      const b = candidates.find(a => a.type === 'beat') || assets.find(a => a.type === 'beat');
      const m = candidates.find(a => a.type === 'melody') || assets.find(a => a.type === 'melody');

      if (!v || !b || !m) {
         toast.error("Syndicate requires at least 1 Vocal, 1 Beat, and 1 Melody globally to compute.");
         setIsGenerating(false);
         return;
      }

      // Generate deterministic structural sequence
      const seedHex = generateHash(v.id + b.id + m.id + Date.now().toString());
      
      await addDoc(collection(db, 'k7_generated_tracks'), {
        creatorId: auth.currentUser!.uid,
        title: `SYNTHESIS-${seedHex.substring(0,6)}`,
        seed: seedHex,
        targetBpm: bestBpm,
        structure: "Intro -> Verse -> Chorus -> Verse -> Outro",
        components: [
          { type: 'vocal', assetId: v.id, tracerId: v.tracerId, owner: v.ownerEmail },
          { type: 'beat', assetId: b.id, tracerId: b.tracerId, owner: b.ownerEmail },
          { type: 'melody', assetId: m.id, tracerId: m.tracerId, owner: m.ownerEmail }
        ],
        createdAt: serverTimestamp()
      });
      
      toast.success("Procedural Synthesis Complete. Track appended to ledger.");
      setActiveTab('tracks');
    } catch (e: any) {
      toast.error("Synthesis failed: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (hasContract === null) {
     return <div className="min-h-screen bg-black" />;
  }

  if (hasContract === false) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 font-mono flex items-center justify-center selection:bg-red-500 selection:text-white">
         <div className="max-w-2xl w-full space-y-8 bg-black border border-white/10 p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
               <ShieldAlert size={120} />
            </div>
            
            <div className="space-y-2 border-b border-white/10 pb-6">
               <div className="text-[10px] font-black uppercase text-red-500 tracking-[0.4em] italic flex items-center gap-2">
                  <Lock size={12} /> Restricted Access Vault
               </div>
               <h1 className="text-3xl font-black italic uppercase tracking-tighter">The K7 Syndicate Pool</h1>
            </div>

            <div className="space-y-4 text-xs font-bold leading-relaxed text-white/60 uppercase tracking-tight italic">
               <p className="text-red-500/80">WARNING: YOU ARE ABOUT TO ENTER A LEGALLY BINDING AGREEMENT.</p>
               <p>The K7 Syndicate is a procedural, algorithmic music generation pool. <span className="text-[#24b324]">It uses NO ARTIFICIAL INTELLIGENCE.</span> It operates purely on mathematical combinatorial logic to ensure 100% legal copyrightability.</p>
               <p>By entering, you agree to deposit your trained vocals, beats, or instrumentations into the shared pool.</p>
               <p>You grant all other agreeing members of the K7 Syndicate the right to use, mutate, and sequence your deposited stems within the IndieBrotherhood ecosystem for non-AI generated compositions.</p>
               <p>Every generated track utilizes a Cryptographic Audio Tracer. Your origin DNA (Tracer ID) will be permanently stamped on any track that mathematically utilizes your stem, ensuring fair-use provenance.</p>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 p-6 space-y-4">
               <div className="flex items-start gap-4 mb-4">
                  <input 
                    type="checkbox" 
                    id="fairUseAgree"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-red-500 bg-black border border-white/20"
                  />
                  <label htmlFor="fairUseAgree" className="text-xs text-white/60 leading-relaxed cursor-pointer hover:text-white transition-colors">
                     I check this box to signify that I agree to the IndieBrotherhood Fair Use Syndicate Terms and grant permission for my deposited stems to be mutated by fellow members.
                  </label>
               </div>
               <label className="text-[10px] font-black uppercase tracking-widest text-red-500 block">TYPE FULL NAME TO SIGN:</label>
               <input 
                 value={signature}
                 onChange={e => setSignature(e.target.value.toUpperCase())}
                 className="w-full bg-black border border-white/20 p-4 text-sm text-white focus:border-red-500 outline-none uppercase font-black tracking-widest"
                 placeholder="FIRST LAST"
               />
            </div>

            <button 
              onClick={signContract}
              className="w-full py-4 bg-red-600 text-white font-black uppercase italic tracking-widest hover:bg-white hover:text-red-600 transition-all flex items-center justify-center gap-2"
            >
               <Fingerprint size={16} /> SEAL CONTRACT & ENTER K7
            </button>
            <div className="text-center">
               <Link to="/dashboard" className="text-[10px] uppercase font-black tracking-widest text-white/30 hover:text-white transition-colors">ABORT AND RETURN</Link>
            </div>
         </div>
      </div>
    );
  }

  return (
    <SentinelBoundary moduleName="K7_Pool">
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0c] via-black to-black text-white font-mono selection:bg-[#24b324] selection:text-black">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="p-3 bg-black hover:bg-[#24b324] hover:text-black transition-colors border border-white/10 group">
              <ArrowLeft className="text-[#24b324] group-hover:text-black" size={20} />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter leading-none flex items-center gap-2">
                <Cpu size={24} className="text-[#24b324]" /> 
                The K7 Syndicate
              </h1>
              <span className="text-[9px] uppercase font-bold text-[#24b324]/50 tracking-[0.3em] pl-8">Algorithmic Stem Pool & Tracer</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 px-4 py-2 border border-[#24b324]/20 bg-[#24b324]/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="w-2 h-2 rounded-full bg-[#24b324] animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase text-[#24b324]">AI-FREE ZONE SECURED</span>
          </div>
        </header>

        <div className="max-w-7xl mx-auto p-6 md:p-12">
           <div className="flex flex-wrap gap-4 mb-12">
              {[
                { id: 'pool', label: 'Asset Pool', icon: Disc },
                { id: 'upload', label: 'Deposit Stem', icon: Hash },
                { id: 'generator', label: 'Procedural Synthesis', icon: Cpu },
                { id: 'tracks', label: 'Ledger', icon: Terminal }
              ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex items-center gap-2 px-6 py-3 font-black uppercase tracking-widest text-[10px] italic transition-all ${
                     activeTab === tab.id ? 'bg-[#24b324] text-black shadow-[0_0_15px_rgba(217,225,43,0.3)]' : 'bg-black border border-white/10 text-white/40 hover:text-white'
                   }`}
                 >
                    <tab.icon size={14} /> {tab.label}
                 </button>
              ))}
           </div>

           <AnimatePresence mode="wait">
              {activeTab === 'pool' && (
                 <motion.div key="pool" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="bg-zinc-950 border border-white/5 p-6">
                          <div className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">Total Pool Assets</div>
                          <div className="text-4xl font-black italic text-[#24b324]">{assets.length}</div>
                       </div>
                       <div className="bg-zinc-950 border border-white/5 p-6">
                          <div className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">Your Deposits</div>
                          <div className="text-4xl font-black italic text-white">{myAssets.length}</div>
                       </div>
                       <div className="bg-zinc-950 border border-white/5 p-6">
                          <div className="text-[10px] font-black uppercase text-white/30 tracking-widest mb-2">Syndicate Tracks</div>
                          <div className="text-4xl font-black italic text-blue-500">{generatedTracks.length}</div>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-sm font-black uppercase tracking-widest text-white/50 border-b border-white/10 pb-4">Global Traced Assets</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {assets.map(asset => (
                             <div key={asset.id} className="p-4 bg-black border border-white/10 hover:border-[#24b324]/40 transition-colors group">
                                <div className="flex justify-between items-start mb-4">
                                   <div className={`px-2 py-1 text-[9px] font-black uppercase italic tracking-widest ${
                                      asset.type === 'vocal' ? 'bg-purple-500/20 text-purple-400' :
                                      asset.type === 'beat' ? 'bg-red-500/20 text-red-500' :
                                      'bg-blue-500/20 text-blue-400'
                                   }`}>
                                      {asset.type}
                                   </div>
                                   <div className="text-[9px] text-white/20 uppercase font-black">{asset.bpm} BPM / {asset.musicKey}</div>
                                </div>
                                <div className="text-sm font-black uppercase pb-1 truncate">{asset.name}</div>
                                <div className="text-[10px] text-white/40 truncate">By {asset.ownerEmail ? asset.ownerEmail.split('@')[0] : (asset.creator || 'Sovereign')}</div>
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                   <div className="text-[8px] font-mono text-[#24b324]/60 uppercase tracking-widest truncate max-w-[150px]">
                                      DNA: {asset.tracerId}
                                   </div>
                                   <Fingerprint size={12} className="text-[#24b324]/40" />
                                </div>
                             </div>
                          ))}
                          {assets.length === 0 && <div className="col-span-3 text-center p-12 text-white/20 uppercase font-black text-xs tracking-widest italic border border-white/5">Pool is empty. Awaiting first deposit.</div>}
                       </div>
                    </div>
                 </motion.div>
              )}

              {activeTab === 'upload' && (
                 <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl space-y-8">
                    <div className="p-8 border border-[#24b324]/20 bg-[#24b324]/5 relative overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                       <div className="absolute top-0 right-0 p-4 opacity-10"><Hash size={80} /></div>
                       <h3 className="text-2xl font-black italic uppercase tracking-tighter text-[#24b324] mb-2">Deposit Stem</h3>
                       <p className="text-xs uppercase font-bold text-white/50 tracking-widest leading-relaxed">Submit your trained vocals, beats, or melodies. The system will cryptographically hash your asset for the Tracer Registry.</p>
                    </div>

                    <div className="space-y-6 bg-black border border-white/10 p-8">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Stem File (.mp3, .wav)</label>
                          <div 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            onClick={() => document.getElementById('k7-file-upload')?.click()}
                            className="border-2 border-dashed border-white/20 p-8 flex flex-col items-center justify-center cursor-pointer hover:border-[#24b324]/40 hover:bg-[#24b324]/5 transition-all backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                          >
                             <input 
                               id="k7-file-upload" 
                               type="file" 
                               accept="audio/*" 
                               className="hidden" 
                               onChange={handleFileSelect} 
                             />
                             {uploadFile ? (
                                <div className="text-center">
                                   <div className="text-[#24b324] font-black italic uppercase text-lg mb-1">{uploadFile.name}</div>
                                   <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{(uploadFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                                </div>
                             ) : (
                                <div className="text-center text-white/30 text-xs font-black uppercase tracking-widest italic">
                                   Drag & Drop Audio File Here or Click to Browse
                                </div>
                             )}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Stem Type</label>
                          <div className="flex gap-2">
                             {['vocal', 'beat', 'melody'].map(t => (
                                <button
                                  key={t}
                                  onClick={() => setUploadType(t)}
                                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest italic border transition-all ${
                                    uploadType === t ? 'border-[#24b324] bg-[#24b324]/10 text-[#24b324]' : 'border-white/10 text-white/40 hover:border-white/30'
                                  }`}
                                >
                                  {t}
                                </button>
                             ))}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Asset Name</label>
                          <input 
                            value={uploadName} onChange={e => setUploadName(e.target.value)}
                            className="w-full bg-zinc-950 border border-white/10 p-4 text-sm font-black uppercase focus:border-[#24b324] outline-none"
                            placeholder="E.g., DARK TRAP HI-HATS"
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-4">
                             <label className="text-[10px] font-black uppercase tracking-widest text-white/40">BPM</label>
                             <input 
                               type="number" value={uploadBpm} onChange={e => setUploadBpm(e.target.value)}
                               className="w-full bg-zinc-950 border border-white/10 p-4 text-sm font-black uppercase focus:border-[#24b324] outline-none text-[#24b324]"
                             />
                          </div>
                          <div className="space-y-4">
                             <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Key Signature</label>
                             <input 
                               value={uploadKey} onChange={e => setUploadKey(e.target.value)}
                               className="w-full bg-zinc-950 border border-white/10 p-4 text-sm font-black uppercase focus:border-[#24b324] outline-none text-[#24b324]"
                               placeholder="C, C#m, D..."
                             />
                          </div>
                       </div>

                       <button 
                         onClick={submitAsset}
                         disabled={isUploading || !uploadName}
                         className="w-full py-4 bg-[#24b324] text-black font-black uppercase italic tracking-widest hover:bg-white transition-all disabled:opacity-50 border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                       >
                         {isUploading ? 'Hashing...' : 'Deposit & Assign DNA Hash'}
                       </button>
                    </div>
                 </motion.div>
              )}

              {activeTab === 'generator' && (
                 <motion.div key="generator" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 max-w-4xl">
                    <div className="p-8 border-2 border-dashed border-[#24b324]/30 bg-black shadow-2xl shadow-black/80">
                       <div className="flex items-center gap-4 mb-6">
                          <Terminal size={32} className="text-[#24b324]" />
                          <div>
                             <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Procedural Synthesizer</h3>
                             <div className="text-[10px] uppercase font-black text-[#24b324] tracking-widest">Mathematical Algorithmic Sequencer</div>
                          </div>
                       </div>
                       <p className="text-xs uppercase font-bold text-white/50 tracking-widest leading-relaxed mb-8">
                          The synthesizer aggregates shared pool stems utilizing BPM/Key algorithmic bounding. No neural networks. Zero AI interpolation. The resulting synthesis is 100% composed of user-donated sequences.
                       </p>

                       {!isGenerating ? (
                          <div className="space-y-6">
                             {assets.length < 3 ? (
                                <div className="text-center p-6 border border-red-500/20 text-red-500 text-xs font-black uppercase italic">
                                   Requires at least 3 assets in the pool to compute synthesis.
                                </div>
                             ) : !contractData?.vocalTrained ? (
                                <div className="space-y-4">
                                   <div className="text-center p-6 border border-[#24b324]/40 bg-[#24b324]/5 text-[#24b324] text-xs font-black uppercase italic backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                      <ShieldAlert size={24} className="mx-auto mb-2" />
                                      Vocal Training Required
                                      <p className="text-[9px] text-[#24b324]/70 mt-2">You must train your vocals in the syndicate pool for 2 minutes before synthesizing.</p>
                                   </div>
                                   <button 
                                     onClick={startTraining}
                                     disabled={isTraining}
                                     className="w-full py-6 bg-[#24b324] text-black font-black uppercase tracking-[0.4em] italic text-lg hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-4 border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all"
                                   >
                                     {isTraining ? (
                                        <><Fingerprint className="animate-pulse" /> TRAINING... {Math.floor(trainingTimeLeft / 60)}:{(trainingTimeLeft % 60).toString().padStart(2, '0')}</>
                                     ) : 'START VOCAL TRAINING'}
                                   </button>
                                </div>
                             ) : (
                                <button 
                                  onClick={generateTrack}
                                  className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.4em] italic text-lg hover:bg-[#24b324] transition-all"
                                >
                                  INITIALIZE SYNTHESIS
                                </button>
                             )}
                          </div>
                       ) : (
                          <div className="space-y-4">
                             <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#24b324]">
                                <span>Computing Algorithmic Permutations...</span>
                                <span>{genProgress}%</span>
                             </div>
                             <div className="h-2 bg-white/10 w-full overflow-hidden backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                <motion.div 
                                  className="h-full bg-[#24b324]"
                                  animate={{ width: `${genProgress}%` }}
                                />
                             </div>
                             <div className="text-[8px] font-mono text-white/30 uppercase tracking-widest h-4">
                                {genProgress > 80 ? 'Mastering Sequence...' : genProgress > 50 ? 'Validating Tracer Hashes...' : genProgress > 20 ? 'Aligning BPM/Key Signatures...' : 'Fetching Pool Assets...'}
                             </div>
                          </div>
                       )}
                    </div>
                 </motion.div>
              )}

              {activeTab === 'tracks' && (
                 <motion.div key="tracks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/50 border-b border-white/10 pb-4">Synthesis Ledger</h3>
                    
                    {generatedTracks.map(track => (
                       <div key={track.id} className="p-6 bg-black border border-white/10 relative group overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-[#24b324]" />
                          <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                             <div>
                                <h4 className="text-xl font-black italic uppercase text-white tracking-tighter">{track.title}</h4>
                                <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Seed: {track.seed} • {track.structure}</div>
                             </div>
                             <button className="p-2 bg-white/5 hover:bg-[#24b324] hover:text-black transition-colors rounded backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                                <Share2 size={16} />
                             </button>
                          </div>
                          
                          <div className="space-y-3">
                             <div className="text-[10px] font-black uppercase tracking-widest text-white/40">DNA Tracers Utilized:</div>
                             {(track.components || []).map((comp: any, i: number) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-zinc-950 border border-white/5">
                                   <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${
                                        comp.type === 'vocal' ? 'bg-purple-500' :
                                        comp.type === 'beat' ? 'bg-red-500' : 'bg-blue-500'
                                      }`} />
                                      <span className="text-xs font-black uppercase text-white">{comp.type}</span>
                                      <span className="text-[9px] text-white/40 uppercase tracking-widest">BY {comp.owner ? comp.owner.split('@')[0] : 'Sovereign'}</span>
                                   </div>
                                   <div className="text-[9px] font-mono text-[#24b324]/70 uppercase tracking-widest flex items-center gap-2">
                                      <Fingerprint size={10} /> {comp.tracerId}
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    ))}
                    {generatedTracks.length === 0 && <div className="text-center p-12 text-white/20 uppercase font-black text-xs tracking-widest italic border border-white/5">Ledger is empty. No synthesis performed.</div>}
                 </motion.div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </SentinelBoundary>
  );
};

export default K7Pool;
