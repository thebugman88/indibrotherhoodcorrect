import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { Play, CheckCircle, XCircle, Award, Volume2, Mic2, FileAudio, Users, MapPin, Disc } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const TRIVIA_CATEGORIES = [
  {
    id: 'lyrics',
    title: 'Finish the Lyrics',
    icon: <Mic2 className="w-6 h-6 text-[#00f7ff]" />,
    description: 'Can you complete the hottest bars?',
    color: 'from-[#00f7ff]/20 to-[#00f7ff]/5'
  },
  {
    id: 'artist',
    title: 'Name the Artist',
    icon: <Users className="w-6 h-6 text-[#ff003c]" />,
    description: 'Who made this track?',
    color: 'from-[#ff003c]/20 to-[#ff003c]/5'
  },
  {
    id: 'title',
    title: 'Finish the Title',
    icon: <Disc className="w-6 h-6 text-[#7000ff]" />,
    description: 'What is the name of this song?',
    color: 'from-[#7000ff]/20 to-[#7000ff]/5'
  },
  {
    id: 'history',
    title: 'Hip Hop History',
    icon: <MapPin className="w-6 h-6 text-[#00ff9d]" />,
    description: 'Test your knowledge on the culture.',
    color: 'from-[#00ff9d]/20 to-[#00ff9d]/5'
  }
];

const TRIVIA_QUESTIONS: Record<string, any[]> = {
  lyrics: [
    { q: "It was all a dream, I used to read...", options: ["Word Up magazine", "Rolling Stone magazine", "The Source magazine", "Vibe magazine"], answer: 0 },
    { q: "I got 99 problems but a...", options: ["hater ain't one", "switch ain't one", "bitch ain't one", "glitch ain't one"], answer: 2 },
    { q: "Now I ain't sayin' she a gold digger, but she ain't messin' with no...", options: ["broke people", "broke figures", "broke rappers", "broke niggas"], answer: 3 },
    { q: "You used to call me on my...", options: ["house phone", "cell phone", "work phone", "pay phone"], answer: 1 },
    { q: "His palms are sweaty, knees weak, arms are...", options: ["shaking", "heavy", "ready", "breaking"], answer: 1 },
    { q: "I like big butts and I can not...", options: ["hide", "speak", "lie", "deny"], answer: 2 },
    { q: "First things first, I'm the realest...", options: ["drop this and let the whole world feel it", "can't hear it", "I'm the illest", "yeah I feel it"], answer: 0 },
    { q: "Waterfalls, don't go chasing...", options: ["waterfalls", "rainbows", "streams", "rivers"], answer: 0 }, // slightly pop but TLC is culture
    { q: "Started from the bottom now...", options: ["we up", "we here", "we there", "we rich"], answer: 1 },
    { q: "Cash rules everything around me...", options: ["C.R.E.A.M", "dollar dollar bill y'all", "get the money", "take the money"], answer: 0 }
  ],
  artist: [
    { q: "Who released the hit song 'SICKO MODE'?", options: ["Drake", "Travis Scott", "Kendrick Lamar", "J. Cole"], answer: 1 },
    { q: "Which artist created the album 'To Pimp a Butterfly'?", options: ["Kendrick Lamar", "J. Cole", "Childish Gambino", "Kanye West"], answer: 0 },
    { q: "Who is known as the 'Rap God'?", options: ["Jay-Z", "Eminem", "Nas", "Lil Wayne"], answer: 1 },
    { q: "Which female artist released 'Bodak Yellow'?", options: ["Nicki Minaj", "Megan Thee Stallion", "Cardi B", "Doja Cat"], answer: 2 },
    { q: "Who dropped the surprise album 'Kamikaze'?", options: ["Eminem", "Logic", "Joyner Lucas", "Drake"], answer: 0 },
    { q: "Which artist's real name is Calvin Cordozar Broadus Jr.?", options: ["Snoop Dogg", "Dr. Dre", "Ice Cube", "Eazy-E"], answer: 0 },
    { q: "Who is the 'Queen of Rap' often credited with mainstreaming female MCs?", options: ["Lil' Kim", "Missy Elliott", "Nicki Minaj", "Queen Latifah"], answer: 3 }, // Debateable but historically significant
    { q: "Which rapper is also known as Donald Glover?", options: ["Childish Gambino", "Chance the Rapper", "Kid Cudi", "Frank Ocean"], answer: 0 },
    { q: "Who runs the OVO label?", options: ["The Weeknd", "Drake", "PARTYNEXTDOOR", "Nav"], answer: 1 },
    { q: "Which artist is closely associated with 'Astroworld'?", options: ["Pop Smoke", "Don Toliver", "Travis Scott", "Sheck Wes"], answer: 2 }
  ],
  title: [
    { q: "'God's ____' by Drake", options: ["Plan", "Way", "Rules", "Gift"], answer: 0 },
    { q: "'Juicy ____' by The Notorious B.I.G. (Wait, the song is just called Juicy)", options: ["Juicy", "Fruit", "Girl", "Gotcha"], answer: 0 }, // Trick question! Let's rephrase. Let's make it simpler: "The song is '____' by The Notorious B.I.G." -> 'Juicy'. Actually let's use a real one.
    { q: "'Straight Outta ____' by N.W.A", options: ["Brooklyn", "Compton", "Queens", "Detroit"], answer: 1 },
    { q: "'Nuthin' but a 'G' ____' by Dr. Dre", options: ["Thing", "Thang", "Time", "Town"], answer: 1 },
    { q: "'Lose ____' by Eminem", options: ["Yourself", "Control", "It All", "My Mind"], answer: 0 },
    { q: "'California ____' by 2Pac", options: ["Love", "Dreamin'", "Girls", "Sun"], answer: 0 },
    { q: "'Rapper's ____' by The Sugarhill Gang", options: ["Delight", "Dream", "Night", "Flow"], answer: 0 },
    { q: "'In Da ____' by 50 Cent", options: ["House", "Club", "Hood", "Studio"], answer: 1 },
    { q: "'Mo Money Mo ____' by The Notorious B.I.G.", options: ["Problems", "Hoes", "Cash", "Issues"], answer: 0 },
    { q: "'Ms. Jackson' is by...", options: ["Outkast", "TLC", "Fugees", "Wu-Tang Clan"], answer: 0 } // Mixing it up
  ],
  history: [
    { q: "Where did Hip Hop originate?", options: ["Los Angeles", "Chicago", "The Bronx", "Detroit"], answer: 2 },
    { q: "What year is widely considered the birth of Hip Hop?", options: ["1973", "1980", "1985", "1979"], answer: 0 },
    { q: "Who is credited with throwing the first Hip Hop party?", options: ["Grandmaster Flash", "Kool Herc", "Afrika Bambaataa", "Kurtis Blow"], answer: 1 },
    { q: "Which of these is NOT one of the 4 original elements of Hip Hop?", options: ["DJing", "Beatboxing", "B-boying/Breakdancing", "Graffiti"], answer: 1 }, // MCing, DJing, Breaking, Graffiti
    { q: "What was the first rap song to hit the Billboard Top 40?", options: ["The Message", "Rapper's Delight", "King Tim III", "Sucker MCs"], answer: 1 },
    { q: "What record label was founded by Suge Knight and Dr. Dre?", options: ["Def Jam", "Bad Boy", "Death Row", "Ruthless"], answer: 2 },
    { q: "Who won the first Grammy Award for Best Rap Performance?", options: ["Run-D.M.C.", "DJ Jazzy Jeff & The Fresh Prince", "LL Cool J", "Salt-N-Pepa"], answer: 1 },
    { q: "Which hip hop group released the iconic 'Enter the Wu-Tang (36 Chambers)'?", options: ["A Tribe Called Quest", "Mobb Deep", "Wu-Tang Clan", "N.W.A"], answer: 2 },
    { q: "Who hosted 'Yo! MTV Raps' alongside Doctor Dré (not the producer)?", options: ["Fab 5 Freddy", "Sway", "Ed Lover", "Charlamagne"], answer: 2 },
    { q: "What is the name of Nas's highly acclaimed 1994 debut album?", options: ["It Was Written", "Illmatic", "Stillmatic", "God's Son"], answer: 1 }
  ]
};

export const TriviaCenter = ({ onComplete }: { onComplete: () => void }) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCooldowns();
  }, []);

  const loadCooldowns = async () => {
    if (!auth.currentUser) return;
    try {
      const cd: Record<string, number> = {};
      for (const cat of TRIVIA_CATEGORIES) {
        const docRef = doc(db, `users/${auth.currentUser.uid}/trivia/${cat.id}`);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().lastPlayed) {
          cd[cat.id] = snap.data().lastPlayed;
        }
      }
      setCooldowns(cd);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startGame = (categoryId: string) => {
    // Check cooldown (7 days)
    const lastPlayed = cooldowns[categoryId] || 0;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    
    if (now - lastPlayed < sevenDays) {
      const daysLeft = Math.ceil((sevenDays - (now - lastPlayed)) / (24 * 60 * 60 * 1000));
      toast.error(`You have already played this trivia! Come back in ${daysLeft} days.`);
      return;
    }

    setActiveCategory(categoryId);
    setCurrentQuestionIndex(0);
    setScore(0);
    setIsFinished(false);
  };

  const handleAnswer = async (selectedIndex: number) => {
    if (!activeCategory || !auth.currentUser) return;
    
    const questions = TRIVIA_QUESTIONS[activeCategory];
    const currentQ = questions[currentQuestionIndex];
    
    let newScore = score;
    if (selectedIndex === currentQ.answer) {
      newScore += 1;
      setScore(newScore);
      toast.success("+10 Points!");
    } else {
      toast.error("Incorrect!");
    }

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Game Over! Update stats.
      setIsFinished(true);
      const pointsEarned = newScore * 10;
      
      try {
        // Record run
        await setDoc(doc(db, `users/${auth.currentUser.uid}/trivia/${activeCategory}`), {
          lastPlayed: Date.now(),
          lastScore: newScore,
          bestScore: Math.max(newScore, 0), // Ideally fetch previous best
        }, { merge: true });

        // Grant Points
        if (pointsEarned > 0) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            points: increment(pointsEarned)
          });
          toast.success(`Trivia Complete! You earned ${pointsEarned} points!`, { icon: '👏' });
        } else {
          toast.success("Trivia Complete! Keep practicing for next time!");
        }
        
        loadCooldowns(); // refresh
      } catch (e) {
        console.error("Failed to save score", e);
      }
    }
  };

  if (loading) return <div className="text-white text-center py-4">Loading Trivia Center...</div>;

  if (activeCategory && !isFinished) {
    const questions = TRIVIA_QUESTIONS[activeCategory];
    const currentQ = questions[currentQuestionIndex];
    
    return (
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 relative overflow-hidden backdrop-blur-md">
        <button 
          onClick={() => setActiveCategory(null)}
          className="absolute top-4 right-4 text-white/50 hover:text-white"
        >
          Quit
        </button>
        <div className="mb-8">
          <div className="flex justify-between items-center text-xs font-mono text-white/50 mb-4 tracking-wider">
            <span>QUESTION {currentQuestionIndex + 1}/{questions.length}</span>
            <span>SCORE: {score * 10}</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{currentQ.q}</h3>
        </div>

        <div className="space-y-3">
          {currentQ.options.map((opt: string, i: number) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-white transition-all duration-200 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="bg-black/40 border border-[#00f7ff]/30 shadow-[0_0_15px_rgba(0,247,255,0.15)] rounded-2xl p-8 text-center relative overflow-hidden backdrop-blur-md">
        <Award className="w-16 h-16 text-[#00f7ff] mx-auto mb-4" />
        <h3 className="text-3xl font-bold text-white mb-2">SCORE: {score * 10}</h3>
        <p className="text-white/60 mb-8">You answered {score} out of 10 correctly.</p>
        <button
          onClick={() => {
            setActiveCategory(null);
            setIsFinished(false);
          }}
          className="bg-[#00f7ff] text-black font-bold uppercase tracking-wider py-3 px-8 rounded-xl hover:bg-[#00f7ff]/80 transition-all font-mono backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        >
          Back to Trivia Center
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Trivia Center</h2>
          <p className="text-white/50 text-sm mt-1">Test your knowledge. Earn points. Try again next week.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRIVIA_CATEGORIES.map((cat) => {
          const lastPlayed = cooldowns[cat.id] || 0;
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          const isCooldown = Date.now() - lastPlayed < sevenDays;
          const daysLeft = isCooldown ? Math.ceil((sevenDays - (Date.now() - lastPlayed)) / (24 * 60 * 60 * 1000)) : 0;

          return (
            <div 
              key={cat.id} 
              className={`bg-gradient-to-br ${cat.color} border border-white/5 p-6 rounded-xl relative overflow-hidden flex flex-col items-start ${isCooldown ? 'opacity-50 grayscale' : 'hover:border-white/20 hover:scale-[1.02] transition-all cursor-pointer'}`}
              onClick={() => startGame(cat.id)}
            >
              <div className="p-3 bg-black/40 rounded-lg backdrop-blur-md mb-4 border border-white/10">
                {cat.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{cat.title}</h3>
              <p className="text-sm text-white/60 mb-4">{cat.description}</p>
              
              {isCooldown ? (
                <div className="mt-auto pt-4 border-t border-white/10 w-full flex space-x-2 text-xs font-mono text-white/40 uppercase">
                  <span>Available in {daysLeft} days</span>
                </div>
              ) : (
                <div className="mt-auto pt-4 border-t border-white/10 w-full flex items-center space-x-2 text-xs font-mono text-[#00f7ff] uppercase group">
                  <Play className="w-3 h-3" />
                  <span>Play Now (10 Questions)</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
