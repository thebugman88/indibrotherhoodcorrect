import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const variants = {
    primary: 'bg-[#24b324] text-black hover:bg-[#1d8f1d] border-none shadow-[0_4px_0_rgb(0,0,0,0.2)] active:translate-y-0.5 active:shadow-none',
    outline: 'bg-transparent border-2 border-white/20 text-white hover:border-[#24b324] hover:text-[#24b324]',
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
  <div className="mb-12 text-center">
    <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-2">{children}</h2>
    {slogan && <p className="text-[#24b324] font-bold uppercase tracking-[0.3em] text-[10px]">{slogan}</p>}
  </div>
);

const TeaserPage = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#1a1a1b] via-[#111] to-black flex flex-col items-center justify-center p-8 text-center">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl"
    >
      <SectionTitle slogan="Teaser - Join the brotherhood for full access">{title}</SectionTitle>
      <div className="max-w-2xl text-white/60 mb-12 italic text-lg mx-auto">
        This page is currently locked. You are skimming an inactive view. To interact with our {title.toLowerCase()} and start your era, you must be a member.
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/"><Button variant="outline">Back to Landing</Button></Link>
        <Link to="/dashboard"><Button variant="primary">Access Dashboard</Button></Link>
      </div>
    </motion.div>
  </div>
);

export default TeaserPage;
