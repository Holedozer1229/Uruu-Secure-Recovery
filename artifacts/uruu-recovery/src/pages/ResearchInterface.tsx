import React from 'react';
import { Link } from 'wouter';
import { Microscope, Beaker, Network } from 'lucide-react';
import TerminalLine from '../components/TerminalLine';

export default function ResearchInterface() {
  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <div className="border-b border-accent/50 pb-6 mb-8 text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-[0.3em] text-accent text-glow-amber font-mono uppercase">
          Quantum Spec Lab
        </h1>
        <p className="text-accent/60 font-mono tracking-widest text-sm max-w-2xl mx-auto">
          RESTRICTED AREA. EXPERIMENTAL ZK-CIRCUITS AND ADVANCED CRYPTOGRAPHIC THEOREMS.
        </p>
      </div>

      {/* Main Diagram Area */}
      <div className="matrix-card border-accent/30 bg-black p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,191,0,0.05)_0%,transparent_60%)] pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="font-mono text-accent/80 tracking-widest flex items-center gap-2">
            <Microscope className="w-5 h-5" /> SPOOKY ACTION DIAGRAM
          </div>
          <div className="text-xs border border-accent/50 text-accent px-2 py-1 font-mono animate-pulse">
            LIVE SIMULATION
          </div>
        </div>

        <div className="h-64 border border-accent/20 bg-accent/5 flex items-center justify-center relative z-10 overflow-hidden">
          {/* Mock abstract geometric representation of ZK circuits */}
          <div className="absolute w-48 h-48 border border-accent/40 rounded-full animate-[spin_10s_linear_infinite]" />
          <div className="absolute w-32 h-32 border-2 border-accent/60 rounded-full border-dashed animate-[spin_7s_linear_infinite_reverse]" />
          <div className="absolute w-16 h-16 bg-accent/20 rounded-full shadow-[0_0_30px_rgba(255,191,0,0.8)]" />
          
          {/* Connections */}
          <svg className="absolute inset-0 w-full h-full opacity-30">
             <line x1="0" y1="0" x2="50%" y2="50%" stroke="var(--color-accent)" strokeWidth="1" />
             <line x1="100%" y1="0" x2="50%" y2="50%" stroke="var(--color-accent)" strokeWidth="1" />
             <line x1="0" y1="100%" x2="50%" y2="50%" stroke="var(--color-accent)" strokeWidth="1" />
             <line x1="100%" y1="100%" x2="50%" y2="50%" stroke="var(--color-accent)" strokeWidth="1" />
          </svg>

          <div className="absolute bottom-4 left-4 text-xs font-mono text-accent/50">
            ENTANGLEMENT RATIO: 0.9984
          </div>
        </div>
      </div>

      {/* Experimental Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="matrix-card border-accent/30 p-6 space-y-4">
          <h3 className="font-mono text-accent tracking-widest flex items-center gap-2 border-b border-accent/20 pb-2">
            <Beaker className="w-4 h-4" /> NOVEL PROVERS
          </h3>
          <div className="space-y-2 text-sm text-accent/70 font-mono">
            <TerminalLine prompt="TST" text="Compiling Plonky3 backend..." variant="gold" />
            <TerminalLine prompt="SYS" text="Warning: Circuit complexity exceeds safe limits." variant="red" />
            <TerminalLine prompt="OPT" text="Optimizing constraint polynomials..." variant="gold" />
            <div className="cursor-blink mt-2" />
          </div>
        </div>

        <div className="matrix-card border-accent/30 p-6 space-y-4">
          <h3 className="font-mono text-accent tracking-widest flex items-center gap-2 border-b border-accent/20 pb-2">
            <Network className="w-4 h-4" /> CROSS-CHAIN BRIDGES
          </h3>
          <div className="space-y-4 font-mono text-sm text-accent/70">
            <div className="flex justify-between items-center bg-accent/5 p-2 border border-accent/20">
               <span>EVM --&gt; SOLANA</span>
               <span className="text-secondary neon-flicker text-xs">UNSTABLE</span>
            </div>
            <div className="flex justify-between items-center bg-accent/5 p-2 border border-accent/20">
               <span>EVM --&gt; STARKNET</span>
               <span className="text-accent text-xs">TESTING</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
