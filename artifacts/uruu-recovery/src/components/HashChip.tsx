import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface HashChipProps {
  hash: string;
  className?: string;
  showFull?: boolean;
}

export default function HashChip({ hash, className = '', showFull = false }: HashChipProps) {
  const [copied, setCopied] = useState(false);

  const displayHash = showFull 
    ? hash 
    : `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`group inline-flex items-center gap-2 px-2 py-0.5 border border-primary/30 bg-background text-primary text-xs font-mono transition-colors hover:border-primary/80 hover:bg-primary/10 ${className} relative overflow-hidden`}
    >
      <span className="text-glow truncate">{displayHash}</span>
      {copied ? (
        <Check className="w-3 h-3 text-primary text-glow shrink-0" />
      ) : (
        <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100 group-hover:text-primary transition-opacity shrink-0" />
      )}
      {copied && (
        <span className="absolute inset-0 bg-primary/20 flex items-center justify-center text-[10px] font-bold tracking-widest text-primary animate-in fade-in zoom-in duration-200">
          COPIED
        </span>
      )}
    </button>
  );
}
