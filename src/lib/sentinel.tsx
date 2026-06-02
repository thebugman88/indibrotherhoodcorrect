import React, { Component, ErrorInfo, ReactNode } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AlertTriangle, RefreshCw, Wrench } from 'lucide-react';

/**
 * [SENTINEL OBD-II] Core Diagnostic Logic
 * Mission: Capture "Freeze Frames" of system failures and provide Elite DTC tracking.
 */

export const userBreadcrumbs: string[] = [];

/**
 * Logs a user action or system event to the diagnostic trail.
 */
export const logBreadcrumb = (action: string) => {
  const timestamp = new Date().toLocaleTimeString();
  userBreadcrumbs.push(`[${timestamp}] ${action}`);
  if (userBreadcrumbs.length > 20) {
    userBreadcrumbs.shift(); 
  }
};

const DTC_PREFIX: Record<string, string> = {
  'Arcade': 'A',
  'Mall': 'M',
  'Soul': 'S',
  'Hub': 'H',
  'Core': 'C',
  'Meeting': 'M',
  'Lounge': 'L',
  'Judgment': 'J',
  'Store': 'T',
  'ML': 'M',
  'Semantic': 'S'
};

/**
 * Generates an Elite DTC (Diagnostic Trouble Code) based on module and error context.
 */
export const generateDTC = (moduleName: string, errorMsg: string): string => {
  const prefix = DTC_PREFIX[moduleName] || 'C';
  const msg = errorMsg.toLowerCase();
  let code = '099'; // General Failure
  
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('offline') || msg.includes('load')) code = '010';
  else if (msg.includes('null') || msg.includes('undefined')) code = '020';
  else if (msg.includes('render') || msg.includes('react')) code = '030';
  else if (msg.includes('permission') || msg.includes('auth') || msg.includes('forbidden')) code = '040';
  else if (msg.includes('timeout') || msg.includes('exceeded')) code = '050';
  else if (msg.includes('firebase') || msg.includes('firestore') || msg.includes('quota')) code = '070';
  
  return `${prefix}-${code}`;
};

/**
 * Captures a "Freeze Frame" of the application state and sends it to Firestore.
 */
export const captureFreezeFrame = async (dtc: string, context: any) => {
  try {
    const nav = window.navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    let normalizedPlatform = navigator.platform;
    
    // Normalize platform for Elite Analytics
    if (normalizedPlatform.includes('armv8') || normalizedPlatform.includes('aarch64')) normalizedPlatform = 'Android (ARM64)';
    else if (normalizedPlatform.includes('arm')) normalizedPlatform = 'Android (ARM)';
    
    const payload = {
      DTC_Code: dtc,
      Device_Profile: {
        userAgent: navigator.userAgent,
        platform: normalizedPlatform,
        connection: connection ? connection.effectiveType : 'unknown',
        screen: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language
      },
      User_Breadcrumbs: [...userBreadcrumbs],
      Timestamp: serverTimestamp(),
      Stack_Trace: context.stack || context.componentStack || 'No stack trace available',
      message: context.message || 'Manual diagnostic trigger',
      module: context.moduleName || 'Global',
      status: 'unresolved',
      severity: dtc.endsWith('040') || dtc.endsWith('070') ? 'critical' : 'warning'
    };
    
    await addDoc(collection(db, 'sentinel_logs'), payload);
    console.warn(`[SENTINEL OBD-II] FREEZE FRAME CAPTURED: ${dtc}`);
  } catch (e) {
    console.error("[SENTINEL OBD-II] CRITICAL FAILURE IN DIAGNOSTIC ENGINE", e);
  }
};

/**
 * Global Listeners for Uncaught Success/Failure
 */
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    const dtc = generateDTC('Global', String(message));
    captureFreezeFrame(dtc, {
      stack: error?.stack || `At ${source}:${lineno}:${colno}`,
      message: String(message),
      moduleName: 'Global'
    });
  };

  window.onunhandledrejection = (event) => {
    const message = event.reason?.message || String(event.reason);
    const dtc = generateDTC('Global', message);
    captureFreezeFrame(dtc, {
      stack: event.reason?.stack || 'Unhandled Promise Rejection',
      message: `Unhandled Rejection: ${message}`,
      moduleName: 'Global'
    });
  };

  /**
   * Performance & Memory Watchdog
   * Alerts the brotherhood if the era-system is under heavy pressure.
   */
  const checkHeuristicHealth = () => {
    const perf = window.performance as any;
    if (perf && perf.memory) {
      const { usedJSHeapSize, jsHeapSizeLimit } = perf.memory;
      const usage = (usedJSHeapSize / jsHeapSizeLimit) * 100;
      if (usage > 85) {
        captureFreezeFrame('C-060', {
          message: `High Memory Pressure Detected: ${usage.toFixed(2)}%`,
          stack: `JS Heap: ${usedJSHeapSize} / ${jsHeapSizeLimit}`,
          moduleName: 'Core Engine'
        });
      }
    }
  };
  setInterval(checkHeuristicHealth, 60000);
}

interface SentinelProps { children: React.ReactNode; moduleName: string; }
interface SentinelState { hasError: boolean; dtc: string | null; retryCount: number; errorMsg?: string; }

/**
 * SentinelBoundary Component
 * Wraps critical Era-Modules to prevent total system collapse.
 */
export class SentinelBoundary extends Component<SentinelProps, SentinelState> {
  constructor(props: SentinelProps) {
    super(props);
    this.state = { hasError: false, dtc: null, retryCount: 0, errorMsg: undefined };
  }

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const dtc = generateDTC(this.props.moduleName, error.message);
    const errorMsg = `${error.message}\n\n${errorInfo.componentStack}`;
    captureFreezeFrame(dtc, {
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      message: error.message,
      moduleName: this.props.moduleName
    });
    
    // Auto-Recovery attempted twice before hard-lock
    if (this.state.retryCount < 2) {
      this.setState(prev => ({ retryCount: prev.retryCount + 1, dtc, errorMsg }));
      
      // AUTO CORRECT LOGIC
      if (typeof window !== 'undefined') {
        try {
           if (error.message.toLowerCase().includes('storage') || error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('localstorage')) {
              localStorage.clear();
              sessionStorage.clear();
           }
        } catch(e) {}
      }

      setTimeout(() => this.setState({ hasError: false }), 2000);
      logBreadcrumb(`SENTINEL RECOVERING FROM ${dtc} (ATTEMPT ${this.state.retryCount + 1})`);
    } else {
      this.setState({ dtc, errorMsg });
      logBreadcrumb(`SENTINEL HARD-LOCK: ${dtc}`);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-black/60 backdrop-blur-xl border-4 border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/30 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-black/80">
               <Wrench className="text-red-500 animate-pulse" size={48} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-red-500 uppercase italic tracking-tighter italic">Limp Mode Engaged</h2>
              <div className="inline-block px-3 py-1 bg-red-500 text-black text-[10px] font-black uppercase tracking-widest italic">
                DTC: {this.state.dtc || 'SYSTEM-REBOOT'}
              </div>
            </div>

            <p className="text-white/40 font-bold uppercase tracking-widest text-[10px] max-w-sm mx-auto leading-relaxed">
              {this.state.retryCount < 2 
                ? `AUTO-CORRECT ACTIVE... ATTEMPTING RECOVERY (${this.state.retryCount + 1}/2)`
                : "Diagnostic data successfully transmitted to brotherhood leaders. Automatic recovery exhausted. Manual override required."
              }
            </p>

            <div className="bg-black border border-red-500/30 p-4 max-w-lg mx-auto overflow-auto text-left">
              <div className="text-red-500 font-mono text-[10px] mb-2 font-black">RAW ERROR LOG:</div>
              <pre className="text-white/80 font-mono text-[9px] break-all whitespace-pre-wrap">{this.state.errorMsg || 'Unknown error'}</pre>
            </div>

            {this.state.retryCount >= 2 && (
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-white/5 border border-white/10 hover:border-white hover:text-white transition-all font-black uppercase italic text-xs tracking-widest flex items-center gap-2 mx-auto mt-4 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              >
                <RefreshCw size={14} /> RE-FLASH SYSTEM
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
