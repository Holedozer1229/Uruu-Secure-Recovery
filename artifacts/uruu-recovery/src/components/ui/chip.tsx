import React from 'react';
import { Copy } from 'lucide-react';
import { cn, truncateHash } from '@/lib/utils';

export function HashChip({ hash, className }: { hash: string, className?: string }) {
  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
  };
  return (
    <span 
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-xs font-medium cursor-pointer transition-colors",
        "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 shadow-[0_0_10px_rgba(0,229,255,0.05)]",
        className
      )}
    >
      {truncateHash(hash, 8)}
      <Copy className="w-3 h-3 opacity-70" />
    </span>
  );
}
