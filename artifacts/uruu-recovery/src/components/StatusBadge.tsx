import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let styleClass = '';
  let dotClass = '';

  switch (status) {
    case 'INITIATED':
      styleClass = 'border-primary/50 text-primary text-glow bg-primary/5';
      dotClass = 'bg-primary shadow-[0_0_8px_rgba(0,255,65,0.8)]';
      break;
    case 'PROOF_SUBMITTED':
      styleClass = 'border-accent/50 text-accent text-glow-amber bg-accent/5';
      dotClass = 'bg-accent shadow-[0_0_8px_rgba(255,191,0,0.8)] animate-pulse';
      break;
    case 'APPROVED':
      styleClass = 'border-primary text-primary text-glow bg-primary/10 status-online';
      dotClass = 'bg-primary';
      break;
    case 'CONTESTED':
      styleClass = 'border-secondary text-secondary neon-flicker bg-secondary/10';
      dotClass = 'bg-secondary';
      break;
    case 'FINALIZED':
      styleClass = 'border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.5)] bg-white/10';
      dotClass = 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]';
      break;
    default:
      styleClass = 'border-muted-foreground/30 text-muted-foreground bg-muted/20';
      dotClass = 'bg-muted-foreground';
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2 py-0.5 border uppercase tracking-widest text-[11px] font-bold ${styleClass} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {status.replace('_', ' ')}
    </div>
  );
}
