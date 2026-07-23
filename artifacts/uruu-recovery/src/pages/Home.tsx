import React from 'react';
import { useGetStats } from '@workspace/api-client-react';
import { Activity, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import { Link } from 'wouter';
import TerminalLine from '../components/TerminalLine';
import HashChip from '../components/HashChip';

export default function Home() {
  const { data: stats, isLoading } = useGetStats();

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-12 pb-8 border-b border-primary/20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,65,0.1)_0%,transparent_70%)] pointer-events-none" />
        <h1 className="text-5xl md:text-7xl font-bold tracking-[0.2em] text-primary text-glow cursor-blink uppercase">
          Zero-Knowledge<br/>Asset Recovery
        </h1>
        <div className="inline-flex items-center gap-3 bg-secondary/10 px-4 py-2 border border-secondary/50 neon-flicker">
          <ShieldAlert className="w-5 h-5 text-secondary" />
          <span className="text-secondary font-mono tracking-widest font-bold">
            CLASSIFIED PROTOCOL // URUU-OMEGA-7
          </span>
        </div>
      </section>

      {/* Stats Readouts */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatPanel title="TOTAL REQUESTS" value={stats?.totalRequests} loading={isLoading} unit="OPs" />
        <StatPanel title="SYSTEM EVENTS" value={stats?.totalEvents} loading={isLoading} unit="LOGs" />
        <StatPanel title="APPROVAL RATE" value={stats?.approvalRate ? `${(stats.approvalRate * 100).toFixed(1)}%` : null} loading={isLoading} />
        <StatPanel title="AVG LATENCY" value={stats?.avgApprovalTime ? `${stats.avgApprovalTime.toFixed(1)}s` : null} loading={isLoading} />
      </section>

      {/* Pipeline Diagram */}
      <section className="space-y-6">
        <h2 className="text-xl font-mono text-primary/70 tracking-widest border-b border-primary/30 pb-2">
          [ RECOVERY PIPELINE SEQUENCE ]
        </h2>
        <div className="matrix-card p-6 overflow-x-auto">
          <div className="flex items-center min-w-[800px] justify-between">
            <PipelineStep num="01" label="INITIATE" desc="Commit Policy & Key" active={true} />
            <PipelineArrow />
            <PipelineStep num="02" label="PROVE" desc="zkEVM Validation" active={true} />
            <PipelineArrow />
            <PipelineStep num="03" label="QUORUM" desc="Guardian Multisig" active={false} />
            <PipelineArrow />
            <PipelineStep num="04" label="TIMELOCK" desc="Contest Window" active={false} />
            <PipelineArrow />
            <PipelineStep num="05" label="FINALIZE" desc="On-Chain State Sync" active={false} />
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-primary/30 pb-2">
          <h2 className="text-xl font-mono text-primary/70 tracking-widest">
            [ RECENT SYSTEM ACTIVITY ]
          </h2>
          <Link href="/events">
            <span className="text-xs font-mono text-primary hover:text-glow cursor-pointer transition-all">
              VIEW FULL LOG //
            </span>
          </Link>
        </div>
        <div className="matrix-card p-4 h-64 overflow-y-auto space-y-2 font-mono text-sm">
          {isLoading ? (
            <TerminalLine prompt="SYS" text="Loading telemetric data..." variant="gold" />
          ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
            stats.recentActivity.map((event) => (
              <div key={event.id} className="flex gap-4 border-b border-primary/10 pb-2 mb-2 last:border-0 hover:bg-primary/5 p-1 transition-colors">
                <span className="text-primary/50 shrink-0">
                  [{new Date(event.timestamp).toLocaleTimeString()}]
                </span>
                <span className={`shrink-0 w-32 ${event.eventType.includes('Contested') ? 'text-secondary neon-flicker' : event.eventType.includes('Approved') ? 'text-accent text-glow-amber' : 'text-primary'}`}>
                  {event.eventType}
                </span>
                {event.requestId && (
                  <span className="shrink-0 text-muted-foreground">REQ: <HashChip hash={event.requestId} /></span>
                )}
              </div>
            ))
          ) : (
            <TerminalLine prompt="SYS" text="No recent activity detected." />
          )}
        </div>
      </section>

      {/* Ticker */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-primary/30 bg-background/90 backdrop-blur-md overflow-hidden z-40">
        <div className="whitespace-nowrap py-1">
          <div className="inline-block animate-[scroll_20s_linear_infinite] font-mono text-xs text-primary/70 tracking-widest">
            VERIFIER ONLINE... QUORUM ACTIVE... TIMELOCK NOMINAL... EIP-712 BOUND... ZKEVM PROVER SYNCHRONIZED... GUARDIAN NODES SECURE... NO ANOMALIES DETECTED... 
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPanel({ title, value, loading, unit }: { title: string, value?: string | number | null, loading: boolean, unit?: string }) {
  return (
    <div className="matrix-card p-6 flex flex-col gap-2 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-xl group-hover:bg-primary/20 transition-colors" />
      <span className="text-xs font-mono text-primary/50 tracking-widest">{title}</span>
      <div className="font-mono text-3xl font-bold text-primary text-glow flex items-baseline gap-2">
        {loading ? (
          <span className="animate-pulse opacity-50">...</span>
        ) : (
          <>
            {value !== undefined && value !== null ? value : '--'}
            {unit && <span className="text-sm text-primary/40">{unit}</span>}
          </>
        )}
      </div>
      <div className="h-1 w-full bg-primary/10 mt-2 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 bg-primary/50 w-1/3 animate-[slide_2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

function PipelineStep({ num, label, desc, active }: { num: string, label: string, desc: string, active: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${active ? 'opacity-100' : 'opacity-40 grayscale'}`}>
      <div className={`w-12 h-12 rounded-none border flex items-center justify-center font-mono font-bold text-lg transition-all ${
        active 
          ? 'border-primary text-primary bg-primary/10 shadow-[0_0_15px_rgba(0,255,65,0.3)]' 
          : 'border-muted-foreground text-muted-foreground'
      }`}>
        {num}
      </div>
      <div className="text-center space-y-1">
        <div className={`font-bold tracking-widest text-sm ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</div>
        <div className="text-xs font-mono text-muted-foreground">{desc}</div>
      </div>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div className="flex-1 px-4 flex items-center justify-center">
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_10px_rgba(255,191,0,0.5)] animate-pulse" />
    </div>
  );
}
