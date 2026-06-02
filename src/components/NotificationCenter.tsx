import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Info, Zap, Trophy, MessageSquare, X, Trash2, CheckCircle } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'reward' | 'alert' | 'message';
  read: boolean;
  timestamp: string;
}

const NotificationCenter = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, `users/${auth.currentUser.uid}/notifications`),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
      setLoading(false);
    }, (err) => {
      console.error("Notifications center snapshot error:", err);
      setLoading(false);
    });

    return unsub;
  }, []);

  const markAsRead = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, `users/${auth.currentUser.uid}/notifications`, id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/notifications`, id));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    if (!auth.currentUser) return;
    const unread = notifications.filter(n => !n.read);
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, `users/${auth.currentUser!.uid}/notifications`, n.id), { read: true });
    });
    await batch.commit();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'reward': return <Trophy className="text-[#24b324]" size={16} />;
      case 'alert': return <Zap className="text-red-500" size={16} />;
      case 'message': return <MessageSquare className="text-blue-500" size={16} />;
      default: return <Info className="text-white/40" size={16} />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
          />
          <motion.div 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-96 bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black border-l-4 border-[#24b324] z-[151] flex flex-col shadow-2xl"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-3">
                <Bell className="text-[#24b324]" size={24} />
                <h2 className="text-xl font-black italic uppercase italic">Era Comms</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 transition-colors backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <X size={24} className="text-white/40" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4 no-scrollbar">
              {loading ? (
                <div className="flex justify-center p-12">
                   <div className="w-8 h-8 border-2 border-[#24b324] border-t-transparent rounded-full animate-spin shadow-2xl shadow-black/80" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 opacity-20 text-center space-y-4">
                  <Bell size={48} />
                  <p className="text-[10px] uppercase font-black tracking-widest leading-relaxed">No new signals from the brotherhood core.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div 
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 border-l-4 relative group transition-all ${n.read ? 'bg-white/2 border-white/10' : 'bg-[#24b324]/5 border-[#24b324]'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {getIcon(n.type)}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${n.read ? 'text-white/30' : 'text-[#24b324]'}`}>{n.title}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {!n.read && (
                           <button onClick={() => markAsRead(n.id)} className="text-white/20 hover:text-[#24b324]">
                              <CheckCircle size={14} />
                           </button>
                         )}
                         <button onClick={() => deleteNotification(n.id)} className="text-white/20 hover:text-red-500">
                            <Trash2 size={14} />
                         </button>
                      </div>
                    </div>
                    <p className="text-xs text-white/70 font-medium leading-relaxed italic">{n.message}</p>
                    <div className="mt-2 text-[8px] font-bold text-white/20 uppercase tracking-widest">
                       {new Date(n.timestamp).toLocaleString()}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <button 
                  onClick={markAllRead}
                  className="w-full py-4 border-2 border-white/5 font-black uppercase italic text-[10px] tracking-widest hover:border-[#24b324] hover:text-[#24b324] transition-all shadow-2xl shadow-black/80"
                >
                  Clear All Signal Pings
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationCenter;
