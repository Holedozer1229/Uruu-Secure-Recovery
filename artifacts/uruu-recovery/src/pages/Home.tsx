import React from 'react';
import { Link } from 'wouter';
import { useGetStats } from '@workspace/api-client-react';
import { Button } from '@/components/ui/core';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Shield, Key, Fingerprint, Lock, Zap, ChevronRight, Activity } from 'lucide-react';

const FLOW_STEPS = [
  { icon: Key, label: "Initiate", desc: "Commit new key & policy" },
  { icon: Fingerprint, label: "Generate Proof", desc: "ZK synthetic proof generation" },
  { icon: Shield, label: "Verify", desc: "Cryptographic validation" },
  { icon: Lock, label: "Guardian Quorum", desc: "Multi-sig approval" },
  { icon: Zap, label: "Finalize", desc: "Timelock expiration & reset" },
];

export default function Home() {
  const { data: stats, isLoading } = useGetStats();

  return (
    <div className="space-y-12 pb-12">
      {/* Hero */}
      <section className="relative py-16 lg:py-24 flex flex-col items-center text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono mb-4 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          <Activity className="w-3 h-3 animate-pulse" />
          SYSTEM ONLINE // ZK-PROOF VERIFIER ACTIVE
        </div>
        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white drop-shadow-lg">
          ZERO-KNOWLEDGE <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
            ASSET RECOVERY
          </span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl font-light">
          Orchestrate guardian-quorum, ZK-proof-verified, timelock-enforced cryptographic key recovery operations. Absolute security, mathematically guaranteed.
        </p>
        <div className="pt-4">
          <Link href="/recovery/initiate" className="inline-block">
            <Button size="lg" className="text-base tracking-wide uppercase gap-2">
              Initiate Protocol <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-primary font-mono text-sm uppercase">Total Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono">
              {isLoading ? "..." : stats?.totalRequests ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-secondary/20 bg-secondary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-secondary font-mono text-sm uppercase">Approval Quorum Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono">
              {isLoading ? "..." : `${((stats?.approvalRate ?? 0) * 100).toFixed(1)}%`}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-mono text-sm uppercase">Recorded Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-mono">
              {isLoading ? "..." : stats?.totalEvents ?? 0}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* How It Works */}
      <section className="space-y-8 pt-8">
        <h2 className="text-2xl font-bold tracking-tight border-b border-border pb-4">Protocol Workflow</h2>
        <div className="flex flex-col md:flex-row gap-8 md:gap-4 items-center md:items-start justify-between relative">
          <div className="hidden md:block absolute top-6 left-12 right-12 h-0.5 bg-border z-0" />
          {FLOW_STEPS.map((step, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center text-center space-y-3 w-full md:w-1/5">
              <div className="w-12 h-12 rounded-full bg-background border-2 border-primary/40 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,229,255,0.1)]">
                <step.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{step.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
