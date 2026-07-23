import React, { useEffect } from 'react';
import { useGetZkEvmStatus, useGetZkEvmPipeline } from '@workspace/api-client-react';
import TerminalLine from '../components/TerminalLine';
import { Cpu, Activity, Database, Server } from 'lucide-react';

export default function ZkEvmMonitor() {
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useGetZkEvmStatus();
  const { data: pipelineData, isLoading: pipelineLoading, refetch: refetchPipeline } = useGetZkEvmPipeline();

  // Refetch every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      refetchStatus();
      refetchPipeline();
    }, 3000);
    return () => clearInterval(interval);
  }, [refetchStatus, refetchPipeline]);

  const getStatusDisplay = (status?: string) => {
    switch(status) {
      case 'online': return <span className="text-primary text-glow status-online px-3 py-1 border border-primary/50 bg-primary/10">ONLINE</span>;
      case 'degraded': return <span className="text-accent text-glow-amber px-3 py-1 border border-accent/50 bg-accent/10 animate-pulse">DEGRADED</span>;
      case 'offline': return <span className="text-secondary neon-flicker px-3 py-1 border border-secondary/50 bg-secondary/10">OFFLINE</span>;
      default: return <span className="text-muted-foreground px-3 py-1 border border-muted-foreground/30">UNKNOWN</span>;
    }
  };

  const getPhaseColor = (status: string) => {
    switch(status) {
      case 'complete': return 'border-primary text-primary bg-primary/5 shadow-[0_0_10px_rgba(0,255,65,0.2)]';
      case 'running': return 'border-accent text-accent bg-accent/5 shadow-[0_0_15px_rgba(255,191,0,0.4)] animate-pulse';
      case 'error': return 'border-secondary text-secondary bg-secondary/5 neon-flicker';
      default: return 'border-primary/20 text-primary/40 bg-black';
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-primary/30 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-[0.2em] text-primary text-glow font-mono uppercase flex items-center gap-4">
            <Cpu className="w-8 h-8" /> zkEVM Pipeline
          </h1>
          <p className="text-primary/50 font-mono tracking-widest text-sm mt-2">
            NETWORK SYNCHRONIZED // PROVER INSTANCE ACTIVE
          </p>
        </div>
        <div className="font-mono font-bold tracking-widest">
          {getStatusDisplay(statusData?.status)}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Network} label="NETWORK ID" value={statusData?.networkId} />
        <StatCard icon={Database} label="CHAIN ID" value={statusData?.chainId} />
        <StatCard icon={Server} label="BACKEND" value={statusData?.provingBackend} />
        <StatCard icon={Activity} label="AVG PROVING TIME" value={statusData?.avgProvingTimeMs ? `${statusData.avgProvingTimeMs}ms` : undefined} />
      </div>

      {/* Pipeline Diagram */}
      <div className="space-y-4 pt-6">
        <h2 className="text-xl font-mono text-primary/70 tracking-widest border-b border-primary/20 pb-2">
          [ PROOF GENERATION PHASES ]
        </h2>
        
        <div className="matrix-card p-8 overflow-x-auto">
          <div className="flex items-center min-w-[900px] py-4">
            {pipelineLoading ? (
              <TerminalLine text="Analyzing circuit states..." />
            ) : pipelineData?.phases && pipelineData.phases.length > 0 ? (
              pipelineData.phases.map((phase, index) => (
                <React.Fragment key={phase.name}>
                  {/* Phase Box */}
                  <div className={`w-48 p-4 border font-mono flex flex-col gap-2 relative transition-all duration-300 ${getPhaseColor(phase.status)}`}>
                    <div className="text-sm font-bold tracking-widest truncate">{phase.name}</div>
                    <div className="text-[10px] uppercase tracking-wider opacity-70">
                      STATUS: {phase.status}
                    </div>
                    {(phase.latencyMs !== null || phase.proofSize !== null) && (
                      <div className="border-t border-current/20 pt-2 mt-2 space-y-1 text-xs">
                        {phase.latencyMs !== null && <div>{phase.latencyMs}ms</div>}
                        {phase.proofSize !== null && <div>{phase.proofSize}</div>}
                      </div>
                    )}
                  </div>

                  {/* Connector Arrow */}
                  {index < pipelineData.phases.length - 1 && (
                    <div className="flex-1 px-2 flex items-center justify-center">
                      <div className={`h-1 w-full relative ${
                        pipelineData.phases[index].status === 'complete' || pipelineData.phases[index].status === 'running'
                          ? 'bg-gradient-to-r from-primary to-accent shadow-[0_0_8px_rgba(0,255,65,0.5)]' 
                          : 'bg-primary/20'
                      }`}>
                         {pipelineData.phases[index].status === 'running' && (
                           <div className="absolute inset-0 bg-white/50 w-1/3 animate-[slide_1s_linear_infinite]" />
                         )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TerminalLine text="Pipeline idle. No active phases." />
            )}
          </div>
        </div>
      </div>

      {/* Terminal Readouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
         <TerminalBox label="LAST BLOCK" value={pipelineData?.lastBlock} />
         <TerminalBox label="TPS" value={pipelineData?.tps} />
         <TerminalBox label="GAS USED" value={pipelineData?.gasUsed} />
         <TerminalBox label="AGGREGATION" value={pipelineData?.proofAggregation} />
      </div>

    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any, label: string, value?: string | number }) {
  return (
    <div className="matrix-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-primary/50 text-xs font-mono tracking-widest">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="font-mono text-xl text-primary break-all">
        {value !== undefined ? value : <span className="opacity-30">...</span>}
      </div>
    </div>
  );
}

function TerminalBox({ label, value }: { label: string, value?: string | number }) {
  return (
    <div className="border border-primary/30 bg-black p-4 font-mono flex flex-col justify-between h-24 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-8 h-8 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-all" />
      <div className="text-primary/50 text-xs tracking-widest">{label}</div>
      <div className="text-lg text-primary text-glow text-right">
        {value !== undefined ? value : '---'}
      </div>
    </div>
  );
}

function Network(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></svg>;
}
