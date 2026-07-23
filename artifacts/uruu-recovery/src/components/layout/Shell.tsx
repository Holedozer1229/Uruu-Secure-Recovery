import React from 'react';
import { Link, useLocation } from 'wouter';
import logo from '@assets/aetherionlogo_1784813752675.jfif';
import MatrixRain from '../MatrixRain';

const NAV_ITEMS = [
  { href: '/', label: 'OVERVIEW' },
  { href: '/guardian', label: 'GUARDIAN' },
  { href: '/events', label: 'EVENTS' },
  { href: '/zkevm', label: 'ZKEVM' },
  { href: '/onchain', label: 'ONCHAIN' },
  { href: '/prometheus', label: 'METRICS' },
  { href: '/admin', label: 'ADMIN' },
  { href: '/research', label: 'RESEARCH' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans relative">
      <MatrixRain />
      
      {/* Header */}
      <header className="border-b border-primary/30 bg-background/90 backdrop-blur-md sticky top-0 z-50 shadow-[0_4px_20px_rgba(0,255,65,0.05)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img 
              src={logo} 
              alt="URUU" 
              className="w-8 h-8 rounded-none object-cover border border-primary/50 group-hover:border-primary transition-colors shadow-[0_0_10px_rgba(0,255,65,0.3)] filter sepia hue-rotate-[100deg] saturate-[200%] brightness-[80%] contrast-[150%]" 
            />
            <span className="font-bold tracking-widest text-lg text-primary glitch-text">
              URUU<span className="opacity-70 ml-1">RECOVERY</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 hidden md:flex overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const active = location === item.href || (item.href !== '/' && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`font-mono text-sm tracking-wider px-3 py-1 transition-all cursor-pointer select-none ${
                    active 
                      ? 'bg-primary text-primary-foreground font-bold shadow-[0_0_15px_rgba(0,255,65,0.5)]' 
                      : 'text-primary/70 hover:text-primary hover:text-glow hover:bg-primary/10'
                  }`}>
                    [{item.label}]
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="hyper-line" />
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 z-10 animate-in fade-in duration-700 relative">
        {children}
      </main>
    </div>
  );
}
