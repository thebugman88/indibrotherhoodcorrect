import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8 text-center font-mono selection:bg-red-500 selection:text-white">
          <div className="max-w-xl w-full space-y-12">
            <div className="relative inline-block">
               <ShieldAlert className="text-red-600 animate-pulse" size={120} />
               <div className="absolute -top-4 -right-4 bg-red-600 text-black font-black px-3 py-1 text-[10px] uppercase tracking-widest italic">
                  Critical Fault
               </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">System Breach</h1>
              <p className="text-red-500/60 font-black uppercase tracking-[0.3em] text-xs">
                Local rendering failure detected. Module logic corrupted.
              </p>
            </div>

            <div className="p-8 bg-white/5 border border-red-900/30 text-left space-y-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
               <div className="text-[10px] uppercase font-black text-white/20 tracking-widest">Stack Trace Diagnostic</div>
               <div className="bg-black p-4 text-[10px] text-red-400/80 overflow-x-auto whitespace-pre-wrap font-mono border-l-4 border-red-600 leading-relaxed">
                  {this.state.error?.message || "Unknown DTC Execution Error"}
               </div>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-3 mx-auto px-10 py-4 bg-red-600 text-black font-black uppercase italic text-sm tracking-widest hover:bg-white hover:text-black transition-all group"
            >
              <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
              Re-Initiate Era
            </button>
            
            <div className="text-[10px] text-white/5 uppercase font-black tracking-widest italic">
               Sentinel Watchdog v4.0 Active // Brotherhood Diagnostic Port 0
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
