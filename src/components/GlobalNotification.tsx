import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Info, AlertTriangle, Sparkles } from 'lucide-react';

interface Notification {
  id: string;
  text: string;
  title: string;
  type: 'alert' | 'info' | 'promo';
  createdAt: any;
  active: boolean;
}

const GlobalNotification = () => {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = snap.docs[0].data() as Notification;
        setNotification({ id: snap.docs[0].id, ...data });
        setDismissed(false); // Reset dismissal for new notifications
      } else {
        setNotification(null);
      }
    }, (err) => {
      console.error("Global Notification sync error:", err);
    });

    return () => unsubscribe();
  }, []);

  if (!notification || dismissed) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'alert': return <AlertTriangle className="text-red-500" size={24} />;
      case 'promo': return <Sparkles className="text-[#24b324]" size={24} />;
      default: return <Info className="text-blue-500" size={24} />;
    }
  };

  const getBg = () => {
    switch (notification.type) {
      case 'alert': return 'bg-red-500/10 border-red-500/30';
      case 'promo': return 'bg-[#24b324]/10 border-[#24b324]/30';
      default: return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4"
      >
        <div className={`p-6 rounded-sm border-2 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-start gap-4 ${getBg()}`}>
          <div className="flex-shrink-0 mt-1">
            {getIcon()}
          </div>
          <div className="flex-grow space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 italic">System Broadcast</h4>
            <div className="text-lg font-black italic uppercase italic leading-none text-white">{notification.title}</div>
            <p className="text-sm font-medium text-white/70 leading-relaxed italic">{notification.text}</p>
          </div>
          <button 
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors self-start backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
          >
            <X size={16} className="text-white/40" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalNotification;
