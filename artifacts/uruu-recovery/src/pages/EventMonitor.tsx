import React, { useEffect } from 'react';
import { useListEvents } from '@workspace/api-client-react';
import TerminalLine from '../components/TerminalLine';
import HashChip from '../components/HashChip';

export default function EventMonitor() {
  const { data: eventsData, isLoading, refetch } = useListEvents({ limit: 50 });

  // Auto-refresh the feed
  useEffect(() => {
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const events = eventsData?.items || [];

  const getEventColor = (type: string) => {
    if (type.includes('Contested')) return 'text-secondary neon-flicker';
    if (type.includes('Initiated')) return 'text-accent text-glow-amber';
    if (type.includes('Approved')) return 'text-primary text-glow font-bold';
    if (type.includes('Finalized')) return 'text-white shadow-[0_0_10px_rgba(255,255,255,0.8)]';
    return 'text-primary/80';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between border-b border-primary/30 pb-4 shrink-0">
        <div>
           <h1 className="text-2xl font-mono font-bold text-primary tracking-widest">
             // SYSTEM_FEED
           </h1>
           <p className="text-primary/50 text-sm font-mono mt-1">Raw telemetry and consensus events</p>
        </div>
        <div className="flex items-center gap-3 bg-secondary/10 border border-secondary/30 px-4 py-1.5 rounded-none">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_rgba(255,0,50,0.8)]" />
          <span className="font-mono text-xs text-secondary tracking-widest font-bold">LIVE FEED</span>
        </div>
      </div>

      <div className="matrix-card flex-1 overflow-hidden flex flex-col">
        <div className="bg-black border-b border-primary/20 px-4 py-2 flex items-center justify-between text-xs font-mono text-primary/50 tracking-widest">
          <div className="w-32">TIMESTAMP</div>
          <div className="w-48">EVENT_TYPE</div>
          <div className="w-32">ENTITY_ID</div>
          <div className="flex-1">PAYLOAD</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-10" />
          
          {isLoading ? (
            <TerminalLine text="Establishing secure connection to event stream..." />
          ) : events.length === 0 ? (
            <TerminalLine text="No events detected in current window." />
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex items-start gap-4 py-2 border-b border-primary/10 hover:bg-primary/5 transition-colors relative z-20 group">
                <div className="w-32 text-primary/40 shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString(undefined, { hour12: false, fractionalSecondDigits: 3 })}
                </div>
                <div className={`w-48 shrink-0 ${getEventColor(event.eventType)}`}>
                  {event.eventType}
                </div>
                <div className="w-32 shrink-0">
                  {event.requestId ? <HashChip hash={event.requestId} /> : <span className="text-muted-foreground">-</span>}
                </div>
                <div className="flex-1 text-primary/60 truncate group-hover:text-primary/90 transition-colors">
                  {event.dataJson}
                </div>
              </div>
            ))
          )}
          <div className="pt-4"><div className="cursor-blink inline-block" /></div>
        </div>
      </div>
    </div>
  );
}
