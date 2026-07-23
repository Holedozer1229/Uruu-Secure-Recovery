import React from 'react';
import { Link, useLocation } from 'wouter';
import { Shield, Activity, List, LayoutDashboard, Microscope } from 'lucide-react';
import logo from '@assets/aetherionlogo_1784813752675.jfif';

const NAV_ITEMS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/guardian', label: 'Guardian Quorum', icon: Shield },
  { href: '/events', label: 'Event Log', icon: Activity },
  { href: '/admin', label: 'All Requests', icon: List },
  { href: '/research', label: 'Quantum Specs', icon: Microscope },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Background Effects */}
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/5 blur-[100px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJub25lIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz4KPC9zdmc+')] opacity-50" />
      </div>

      {/* Header */}
      <header className="border-b border-border/50 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img src={logo} alt="URUU" className="w-8 h-8 rounded-sm object-cover border border-primary/30 group-hover:border-primary/80 transition-colors shadow-[0_0_10px_rgba(0,229,255,0.2)]" />
            <span className="font-bold tracking-widest text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              URUU<span className="text-primary font-light ml-1">RECOVERY</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 hidden md:flex">
            {NAV_ITEMS.map((item) => {
              const active = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <span className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                    active 
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_rgba(0,229,255,0.1)]' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent'
                  }`}>
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
}
