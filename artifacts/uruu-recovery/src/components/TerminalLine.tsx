import React from 'react';

interface TerminalLineProps {
  prompt?: string;
  text: string;
  variant?: 'green' | 'red' | 'gold';
  className?: string;
}

export default function TerminalLine({ prompt = '>>>', text, variant = 'green', className = '' }: TerminalLineProps) {
  const colorClass = 
    variant === 'green' ? 'text-primary text-glow' :
    variant === 'red' ? 'text-secondary text-glow-red' :
    'text-accent text-glow-amber';

  return (
    <div className={`font-mono text-sm sm:text-base flex gap-3 ${className}`}>
      <span className="text-muted-foreground select-none shrink-0">{prompt}</span>
      <span className={`${colorClass} break-words`}>{text}</span>
    </div>
  );
}
