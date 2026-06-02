import React, { useState, useEffect } from 'react';
import { 
  Gavel, 
  Scale, 
  UploadCloud, 
  Check, 
  ChevronLeft, 
  AlertTriangle, 
  History, 
  Play, 
  Music,
  Zap,
  Users,
  Cpu,
  Activity,
  FileText,
  Mic,
  Star,
  User,
  Home,
  LogOut,
  Menu as MenuIcon,
  X,
  Plus,
  ArrowRight,
  Award,
  ShoppingBag,
  Tag,
  Coffee,
  LayoutDashboard,
  Feather,
  Binary,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  limit, 
  serverTimestamp, 
  increment,
  orderBy,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

const SUPER_ADMINS = ["xchristopherrayx@gmail.com", "c.e.o@indiebrotherhood.com"];
const isSuperAdmin = (email?: string | null) => email && SUPER_ADMINS.includes(email.toLowerCase());

// Reuse existing Button component style
const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const variants = {
    primary: 'bg-[#24b324] text-black hover:bg-[#1d8f1d] border-none shadow-[0_4px_0_rgb(0,0,0,0.2)] active:translate-y-0.5 active:shadow-none',
    outline: 'bg-transparent border-2 border-white/20 text-white hover:border-[#24b324] hover:text-[#24b324]',
    sexy: 'bg-white text-black hover:bg-gray-200 border-none shadow-xl',
    promo: 'bg-gradient-to-r from-[#24b324] to-[#3df53d] text-black border-none font-black italic shadow-lg hover:scale-105 transition-transform'
  };
  
  return (
    <button 
      className={`px-6 py-3 font-black uppercase tracking-widest text-xs transition-all duration-200 ${variants[variant as keyof typeof variants]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const SectionTitle = ({ children, slogan }: { children: React.ReactNode, slogan?: string }) => (
  <div className="mb-12">
    <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2">{children}</h2>
    {slogan && <p className="text-[#24b324] font-bold uppercase tracking-[0.3em] text-[10px]">{slogan}</p>}
  </div>
);

const Logo = () => (
  <Link to="/" className="flex items-center gap-2 group">
    <div className="w-10 h-10 bg-[#24b324] flex items-center justify-center rounded-sm group-hover:rotate-90 transition-transform duration-500">
      <Music className="text-black" size={24} />
    </div>
    <span className="text-xl font-black uppercase italic tracking-tighter">Indie<span className="text-[#24b324]">Brotherhood</span></span>
  </Link>
);

const NavItem = ({ to, icon: Icon, label, active }: any) => (
  <Link to={to} className={`flex items-center gap-4 p-4 transition-all group ${active ? 'bg-[#24b324] text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
    <Icon size={20} className={active ? 'text-black' : 'group-hover:text-[#24b324]'} />
    <span className="font-bold uppercase tracking-[0.2em] text-[10px]">{label}</span>
  </Link>
);

const JudgmentPage = () => {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [view, setView] = useState<'hub' | 'submit' | 'judge' | 'history'>('hub');
  const [submissionType, setSubmissionType] = useState<'url' | 'upload'>('url');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  
  // Submission Form State
  const [trackUrl, setTrackUrl] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [trackArt, setTrackArt] = useState("");
  
  // Judging State
  const [trackToJudge, setTrackToJudge] = useState<any>(null);
  const [scores, setScores] = useState({ lyrics: 5, delivery: 5, vocals: 5, quality: 5 });
  const [judgingComplete, setJudgingComplete] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);

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
      setLoading(false);

      // Realtime listener for tracks submitted by this specific user
      const q = query(
        collection(db, 'tracks'),
        where('userId', '==', user.uid)
      );

      const unsubTracks = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // InMemory sort by createdAt to avoid index requirements
        list.sort((a: any, b: any) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setUserSubmissions(list);
      }, (err) => {
        console.error("onSnapshot submissions failed:", err);
      });

      return () => {
        unsubTracks();
      };
    });
  }, [navigate]);

  const handleManualSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !trackTitle || (submissionType === 'url' && !trackUrl)) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'tracks'), {
        userId: userProfile.uid,
        artistName: userProfile.displayName || 'Anonymous Artist',
        title: trackTitle,
        externalUrl: submissionType === 'url' ? trackUrl : null,
        audioUrl: submissionType === 'upload' ? 'pending_upload' : null,
        coverArtUrl: trackArt || `https://picsum.photos/seed/${trackTitle}/400/400`,
        type: submissionType,
        status: 'pending',
        judgeCount: 0,
        createdAt: serverTimestamp(),
        scores: { lyrics: 0, delivery: 0, vocals: 0, quality: 0, overall: 0 }
      });
      setMessage("TRACK SUBMITTED TO THE BROTHERHOOD FOR JUDGMENT");
      setTimeout(() => {
        setMessage("");
        setView('hub');
        setTrackTitle("");
        setTrackUrl("");
        setTrackArt("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setMessage("SUBMISSION FAILED. CHECK SYSTEM STATUS.");
    } finally {
      setSubmitting(false);
    }
  };

  const fetchTrackToJudge = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      // Find a track that isn't the user's and hasn't had 10 judges yet
      const q = query(
        collection(db, 'tracks'), 
        where('userId', '!=', userProfile.uid),
        where('status', '==', 'pending'),
        limit(20)
      );
      const snap = await getDocs(q);
      const tracks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter out tracks already judged by this user in a real app would be better with a subcollection check
      // For now, take a random one from the results
      if (tracks.length > 0) {
        setTrackToJudge(tracks[Math.floor(Math.random() * tracks.length)]);
        setView('judge');
        setJudgingComplete(false);
        setScores({ lyrics: 5, delivery: 5, vocals: 5, quality: 5 });
      } else {
        setMessage("NO NEW TRACKS TO JUDGE. YOU'VE REACHED THE END OF THE ERA.");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitJudgment = async () => {
    if (!userProfile || !trackToJudge) return;
    setSubmitting(true);
    try {
      const overall = (scores.lyrics + scores.delivery + scores.vocals + scores.quality) / 4;
      
      // 1. Add Judgment record to subcollection
      const judgmentRef = doc(db, 'tracks', trackToJudge.id, 'judgments', userProfile.uid);
      await setDoc(judgmentRef, {
        trackId: trackToJudge.id,
        judgeId: userProfile.uid,
        metrics: { ...scores },
        overall,
        createdAt: serverTimestamp()
      });

      // 2. Update Track Stats
      const trackRef = doc(db, 'tracks', trackToJudge.id);
      const newJudgeCount = (trackToJudge.judgeCount || 0) + 1;
      
      // Calculate new averages
      const updatedScores = {
        lyrics: ((trackToJudge.scores?.lyrics || 0) * (trackToJudge.judgeCount || 0) + scores.lyrics) / newJudgeCount,
        delivery: ((trackToJudge.scores?.delivery || 0) * (trackToJudge.judgeCount || 0) + scores.delivery) / newJudgeCount,
        vocals: ((trackToJudge.scores?.vocals || 0) * (trackToJudge.judgeCount || 0) + scores.vocals) / newJudgeCount,
        quality: ((trackToJudge.scores?.quality || 0) * (trackToJudge.judgeCount || 0) + scores.quality) / newJudgeCount,
        overall: ((trackToJudge.scores?.overall || 0) * (trackToJudge.judgeCount || 0) + overall) / newJudgeCount,
      };

      await updateDoc(trackRef, {
        judgeCount: newJudgeCount,
        scores: updatedScores,
        status: newJudgeCount >= 10 ? 'judged' : 'pending'
      });

      // 3. Update User Participation and Badge logic
      const userRef = doc(db, 'users', userProfile.uid);
      const newJudgmentCount = (userProfile.judgmentsPerformed || 0) + 1;
      const updates: any = {
        judgmentsPerformed: newJudgmentCount,
        points: increment(100)
      };

      // Badge Milestones
      const currentBadges = userProfile.badges || [];
      if (newJudgmentCount >= 10 && !currentBadges.includes('Junior Judge')) {
        updates.badges = [...currentBadges, 'Junior Judge'];
        setMessage("JUDGMENT CAST. NEW BADGE EARNED: JUNIOR JUDGE.");
      } else if (newJudgmentCount >= 50 && !currentBadges.includes('Senior Judge')) {
        updates.badges = [...currentBadges, 'Senior Judge'];
        setMessage("JUDGMENT CAST. NEW BADGE EARNED: SENIOR JUDGE.");
      } else if (newJudgmentCount >= 100 && !currentBadges.includes('Supreme Justice')) {
        updates.badges = [...currentBadges, 'Supreme Justice'];
        setMessage("JUDGMENT CAST. NEW BADGE EARNED: SUPREME JUSTICE.");
      } else {
        setMessage("JUDGMENT CAST. BROTHERHOOD XP GAINED.");
      }

      await updateDoc(userRef, updates);

      setJudgingComplete(true);
      setTimeout(() => {
        setMessage("");
        setView('hub');
        setTrackToJudge(null);
      }, 3000);
    } catch (err) {
      console.error(err);
      setMessage("JUDGMENT FAILED TO RECORD. TRY AGAIN.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black flex items-center justify-center">
      <motion.div initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Music className="text-[#24b324]" size={48} />
      </motion.div>
    </div>
  );

  const NavItems = [
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
    { label: "Hit Analyzer", icon: Zap, to: "/analysis" },
    { label: "The 99¢ Store", icon: ShoppingBag, to: "/store" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black text-white flex flex-col font-sans selection:bg-[#24b324] selection:text-black">
      <div className="flex-1 overflow-x-hidden flex flex-col">
        {/* News Ticker */}
        <div className="bg-[#24b324] overflow-hidden py-2 border-y border-black/10 relative z-30 shadow-lg">
          <div className="flex whitespace-nowrap animate-ticker">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-12 px-6">
                <span className="text-black font-black uppercase italic text-sm tracking-tight">JUDGE OTHERS LIKE YOU WANT YOURS TO BE JUDGED</span>
                <span className="text-black/40 font-black">•</span>
                <span className="text-black font-black uppercase italic text-sm tracking-tight">ARTISTRY ABOVE GENRE - EVALUATE THE CRAFT</span>
                <span className="text-black/40 font-black">•</span>
                <span className="text-black font-black uppercase italic text-sm tracking-tight">TOTAL ANONYMITY - ONLY THE WORK MATTERS</span>
                <span className="text-black/40 font-black">•</span>
              </div>
            ))}
          </div>
        </div>

        <header className="p-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-6">
            <button 
              className="p-3 hover:bg-[#24b324] hover:text-black rounded-sm border border-[#24b324]/20 transition-all group" 
              onClick={() => setIsMenuOpen(true)}
            >
              <MenuIcon className="text-[#24b324] group-hover:text-black" size={20} />
            </button>
            <Logo />
            <div className="hidden md:flex items-center gap-4 border-l border-white/10 pl-6 ml-2">
              <div className="bg-[#24b324] text-black px-3 py-1 text-[10px] font-black uppercase italic border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">The Pit</div>
              <div className="text-white/20 text-[10px] uppercase font-bold tracking-widest">ANONYMOUS EVALUATION PROTOCOL</div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <div className="flex items-center justify-end gap-2">
                {userProfile?.subscriptionTier === 'legacy' && (
                  <span className="bg-[#24b324] text-black px-1.5 py-0.5 rounded-sm text-[8px] animate-pulse shadow-[0_0_10px_#24b324] font-black italic border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">LEGACY OWNER</span>
                )}
                <div className="text-[#24b324] font-black italic">{userProfile?.judgmentsPerformed || 0} JUDGMENTS CAST</div>
              </div>
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-tighter">
                {userProfile?.level === 99 ? 'IMMORTAL' : `ERA LEVEL ${userProfile?.level || 1}`}
              </div>
            </div>
            <button onClick={() => signOut(auth)} className="p-2 bg-white/5 border border-white/10 hover:bg-red-600/20 hover:border-red-600/40 transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-8 lg:p-12 overflow-y-auto bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black">
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="mb-8 p-6 bg-[#24b324] text-black font-black text-center uppercase italic border-b-4 border-black/20"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          {view === 'hub' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto"
            >
              <SectionTitle slogan="THE ULTIMATE TEST OF ARTISTRY">The Judgment</SectionTitle>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                <div 
                  className="bg-black/40 border-2 border-white/5 p-12 flex flex-col items-center justify-center text-center group hover:border-[#24b324]/30 transition-all cursor-default backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                >
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <UploadCloud className="text-white/20 group-hover:text-[#24b324] transition-colors" size={48} />
                  </div>
                  <h3 className="text-3xl font-black uppercase italic mb-4">Submit For Review</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-10 leading-relaxed max-w-xs">
                    PUT YOUR ART IN FRONT OF THE BROTHERHOOD. GET THE REAL SCORE. ANONYMOUS, BRUTAL, AND HONEST.
                  </p>
                  <Button variant="primary" onClick={() => setView('submit')} className="w-full">ENTER WORK</Button>
                </div>

                <div 
                  className="bg-black/40 border-2 border-white/5 p-12 flex flex-col items-center justify-center text-center group hover:border-[#24b324]/30 transition-all cursor-default backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                >
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <Scale className="text-white/20 group-hover:text-[#24b324] transition-colors" size={48} />
                  </div>
                  <h3 className="text-3xl font-black uppercase italic mb-4">Judge Peers</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-10 leading-relaxed max-w-xs">
                    EVALUATE YOUR BROTHERS. EARN XP. SHAPE THE SOUND OF THE ERA. REMEMBER: CRAFT ABOVE GENRE.
                  </p>
                  <Button variant="outline" onClick={fetchTrackToJudge} className="w-full">OPEN THE PIT</Button>
                </div>
              </div>

              {/* Status & History */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-black/60 border border-white/5 p-8 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                    <h4 className="text-xl font-black italic uppercase">Your Submissions</h4>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Live Feedback</span>
                  </div>
                  
                  {/* Real data mapping for user track submissions */}
                  {userSubmissions.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {userSubmissions.map((t: any) => (
                        <div key={t.id} className="p-4 bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <img src={t.coverArtUrl || `https://picsum.photos/seed/${t.title}/100/100`} className="w-12 h-12 object-cover border border-white/10" referrerPolicy="no-referrer" />
                            <div>
                              <h5 className="font-bold text-sm text-white uppercase">{t.title}</h5>
                              <p className="text-[9px] text-white/40 uppercase font-black tracking-wider">
                                STATUS: <span className={t.status === 'judged' ? 'text-[#24b324]' : 'text-yellow-500'}>{t.status.toUpperCase()}</span> | JUDGES: {t.judgeCount || 0}
                              </p>
                            </div>
                          </div>
                          
                          {/* Display overall score if judged */}
                          {t.judgeCount > 0 && t.scores ? (
                            <div className="text-right">
                              <span className="text-xs text-white/40 font-bold uppercase tracking-widest block">SCORE</span>
                              <span className="text-lg font-black text-[#24b324] italic">{(t.scores.overall || 0).toFixed(1)}</span>
                            </div>
                          ) : (
                            <div className="text-right text-white/20 italic text-[10px] uppercase font-bold">
                              {t.status === 'pending' ? 'COOKING...' : 'QUEUED'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center py-12 border-2 border-dashed border-white/5 shadow-2xl shadow-black/80">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No active tracks in the pit</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="bg-[#24b324] p-8 text-black">
                    <Award size={40} className="mb-4 opacity-20" />
                    <h4 className="text-xl font-black uppercase italic leading-none mb-2">Judge Level</h4>
                    <p className="text-[10px] font-black uppercase opacity-60 mb-6">Mastering the arts of critique</p>
                    <div className="text-4xl font-black italic border-l-4 border-black pl-4">
                      {(userProfile?.judgmentsPerformed || 0) > 100 ? 'SUPREME' : (userProfile?.judgmentsPerformed || 0) > 50 ? 'SENIOR' : 'NOVICE'}
                    </div>
                  </div>

                  <div className="bg-black/60 p-8 border border-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <h4 className="text-lg font-black uppercase italic mb-6">Badges Earned</h4>
                    <div className="flex flex-wrap gap-2">
                      {userProfile?.badges?.filter((b: string) => b.includes('Judge')).length > 0 ? (
                        userProfile.badges.filter((b: string) => b.includes('Judge')).map((badge: string, i: number) => (
                           <div key={i} className="bg-[#24b324]/10 text-[#24b324] px-3 py-1 text-[8px] font-black uppercase border border-[#24b324]/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">{badge}</div>
                        ))
                      ) : (
                        <p className="text-[10px] font-bold text-white/20 uppercase italic">No judging trophies yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'submit' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto bg-black border-2 border-[#24b324] p-12 relative overflow-hidden shadow-2xl shadow-black/80"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#24b324]/5 -mr-16 -mt-16 rotate-45 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" />
              
              <button 
                onClick={() => setView('hub')}
                className="flex items-center gap-2 text-white/40 hover:text-[#24b324] mb-12 font-black uppercase italic text-xs transition-colors"
              >
                <ChevronLeft size={16} /> Back to Hub
              </button>
              
              <SectionTitle slogan="YOUR SOUND IS NOW IN OUR HANDS">Submit Work</SectionTitle>
              
              <form onSubmit={handleManualSubmission} className="space-y-10 relative z-10">
                <div className="flex gap-2 p-1 bg-white/5 border border-white/10 mb-10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <button 
                    type="button"
                    onClick={() => setSubmissionType('url')}
                    className={`flex-1 py-4 text-[10px] font-black uppercase italic transition-all ${submissionType === 'url' ? 'bg-[#24b324] text-black shadow-lg scale-[1.02]' : 'text-white/40 hover:text-white'}`}
                  >
                    Direct Link
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSubmissionType('upload')}
                    className={`flex-1 py-4 text-[10px] font-black uppercase italic transition-all ${submissionType === 'upload' ? 'bg-[#24b324] text-black shadow-lg scale-[1.02]' : 'text-white/40 hover:text-white'}`}
                  >
                    File Upload
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 pl-1">Track Title</label>
                    <input 
                      type="text" 
                      required
                      placeholder="NAME YOUR CREATION"
                      className="w-full bg-[#111] border-2 border-white/10 p-5 text-white font-black italic outline-none focus:border-[#24b324] transition-all shadow-2xl shadow-black/80"
                      value={trackTitle}
                      onChange={(e) => setTrackTitle(e.target.value)}
                    />
                  </div>

                  {submissionType === 'url' ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 pl-1">Stream Link</label>
                      <input 
                        type="url" 
                        required
                        placeholder="SOUNDCLOUD OR STREAM URL"
                        className="w-full bg-[#111] border-2 border-white/10 p-5 text-white font-black italic outline-none focus:border-[#24b324] transition-all shadow-2xl shadow-black/80"
                        value={trackUrl}
                        onChange={(e) => setTrackUrl(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-white/10 bg-[#111] p-16 text-center group hover:border-[#24b324]/30 transition-all shadow-2xl shadow-black/80">
                      <UploadCloud className="mx-auto text-white/10 mb-4 group-hover:text-[#24b324]/40 transition-colors" size={48} />
                      <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">DRAG & DROP MASTER FILE</p>
                      <p className="text-[8px] text-white/20 mt-3 italic font-bold">WAV / MP3 - MAX 20MB</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 pl-1">Visual Art (Optional)</label>
                    <input 
                      type="url" 
                      placeholder="URL TO TRACK COVER"
                      className="w-full bg-[#111] border-2 border-white/10 p-5 text-white font-black italic outline-none focus:border-[#24b324] transition-all shadow-2xl shadow-black/80"
                      value={trackArt}
                      onChange={(e) => setTrackArt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-white/5 p-6 border-l-4 border-red-600 flex gap-5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                  <AlertTriangle className="text-red-600 shrink-0" size={24} />
                  <p className="text-[10px] font-bold text-white/50 uppercase italic leading-loose">
                    BY SUBMITTING, YOU STRIP AWAY YOUR PERSONA. THE BROTHERHOOD WILL JUDGE THE WORK, NOT THE MAN. PREPARE FOR HONESTY.
                  </p>
                </div>

                <Button variant="primary" className="w-full py-8 text-2xl" disabled={submitting}>
                  {submitting ? "UPLOADING TO THE PIT..." : "INITIALIZE JUDGMENT"}
                </Button>
              </form>
            </motion.div>
          )}

          {view === 'judge' && trackToJudge && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-6xl mx-auto"
            >
              <div className="flex justify-between items-center mb-16 px-4">
                <button 
                  onClick={() => setView('hub')}
                  className="flex items-center gap-3 text-white/20 hover:text-[#24b324] font-black uppercase italic text-xs transition-colors"
                >
                  <ChevronLeft size={20} /> RETREAT FROM THE PIT
                </button>
                <div className="bg-[#24b324] text-black px-4 py-1.5 text-[10px] font-black uppercase italic shadow-lg border-b-4 border-black/40 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(36,179,36,0.5)] active:translate-y-[2px] active:border-b-2 transition-all">ACTIVE EVALUATION PROTOCOL</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                <div className="lg:col-span-5 space-y-10">
                  <div className="aspect-square bg-black border-2 border-white/10 shadow-[20px_20px_60px_rgba(0,0,0,0.8)] overflow-hidden relative">
                    <img 
                      src={trackToJudge.coverArtUrl || "https://picsum.photos/seed/music/800/800"} 
                      alt="Track Art" 
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-10 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <div className="text-[10px] font-black uppercase text-[#24b324] tracking-[0.4em] mb-3">Track Info</div>
                      <h4 className="text-4xl lg:text-5xl font-black italic uppercase leading-none tracking-tighter">{trackToJudge.title}</h4>
                      <p className="text-white/40 font-bold text-[10px] uppercase tracking-[0.3em] mt-3">SUBMITTED BY BROTHER ANONYMOUS</p>
                    </div>
                  </div>

                  <div className="bg-black/60 p-10 border border-white/5 flex flex-col items-center backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-8 italic">PRIMARY AUDIO SOURCE</div>
                    <a 
                      href={trackToJudge.externalUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button variant="sexy" className="w-full flex items-center justify-center gap-5 py-6">
                        <Play fill="black" size={24} /> MONITOR SIGNAL
                      </Button>
                    </a>
                    <div className="mt-8 flex gap-3 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                      <p className="text-[9px] text-white/30 italic font-bold uppercase tracking-widest">
                        DO NOT SCORE UNTIL SIGNAL IS FULLY ANALYZED
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#121213] p-12 lg:p-16 border-2 border-white/5 relative shadow-2xl shadow-black/80">
                  <div className="absolute top-0 right-0 p-6">
                     <Scale size={48} className="text-white/5" />
                  </div>
                  
                  <h3 className="text-4xl font-black uppercase italic leading-none mb-16 pb-8 border-b-2 border-white/5">The Verdict</h3>
                  
                  <div className="space-y-16">
                    {[
                      { key: 'lyrics', label: 'LYRICAL CRAFT', desc: 'SUBSTANCE, SCHEMES, POETIC DEPTH' },
                      { key: 'delivery', label: 'THE DELIVERY', desc: 'SOUL, RHYTHM, CONVICTION, FLOW' },
                      { key: 'vocals', label: 'VOCAL QUALITY', desc: 'TONE, STABILITY, HARMONIC RANGE' },
                      { key: 'quality', label: 'SONIC FIDELITY', desc: 'MIX DEPTH, MASTERING CLARITY' }
                    ].map((field) => (
                      <div key={field.key} className="space-y-6">
                        <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                            <span className="text-2xl font-black italic uppercase tracking-tighter leading-none mb-1">{field.label}</span>
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{field.desc}</span>
                          </div>
                          <span className="text-4xl font-black text-[#24b324] italic leading-none">{scores[field.key as keyof typeof scores]}</span>
                        </div>
                        <div className="relative pt-2">
                          <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            step="1"
                            className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#24b324] relative z-10 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                            value={scores[field.key as keyof typeof scores]}
                            onChange={(e) => setScores({ ...scores, [field.key]: parseInt(e.target.value) })}
                          />
                          <div className="absolute top-2 left-0 h-2 bg-[#24b324]/20 rounded-full backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]" style={{ width: `${(scores[field.key as keyof typeof scores] / 10) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-20 pt-12 border-t border-white/5 flex flex-col gap-10">
                    <div className="flex justify-between items-center bg-black/40 p-10 border border-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-[0.4em] mb-1">TOTAL ART SCORE</span>
                        <span className="text-xs font-bold text-[#24b324] uppercase">BROTHERHOOD AVERAGE</span>
                      </div>
                      <div className="text-7xl font-black italic text-[#24b324] leading-none">
                        {((scores.lyrics + scores.delivery + scores.vocals + scores.quality) / 4).toFixed(1)}
                      </div>
                    </div>

                    <Button 
                      variant="primary" 
                      className="w-full py-10 text-3xl flex items-center justify-center gap-6" 
                      onClick={submitJudgment}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                            <Cpu size={32} />
                          </motion.div>
                          ENCRIYPTING VERDICT...
                        </>
                      ) : (
                        <>
                          COMMIT JUDGMENT <ArrowRight size={32} />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black z-[101] p-10 flex flex-col border-r-4 border-[#24b324] shadow-2xl overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-center mb-8 flex-shrink-0">
                <Logo />
                <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 border border-white/10 text-[#24b324] backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"><X size={24} /></button>
              </div>
              <nav className="flex-1 space-y-2 mb-8">
                {NavItems.map((item, i) => (
                  <Link 
                    to={item.to} 
                    key={i} 
                    onClick={() => {
                      if (window.location.pathname === item.to) {
                        setIsMenuOpen(false);
                      }
                    }}
                    className={`flex items-center gap-6 p-5 transition-all group ${window.location.pathname === item.to ? 'bg-[#24b324] text-black shadow-xl scale-105 translate-x-2' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                  >
                    <item.icon size={24} className={window.location.pathname === item.to ? 'text-black' : 'group-hover:text-[#24b324] transition-transform group-hover:scale-110'} />
                    <span className="font-black uppercase tracking-[0.3em] text-[11px] italic">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default JudgmentPage;
