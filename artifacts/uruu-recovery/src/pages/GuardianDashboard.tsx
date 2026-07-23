import React from 'react';
import { useListRecoveryRequests, useGuardianApprove, getListRecoveryRequestsQueryKey } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Shield, ShieldAlert, Cpu } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import HashChip from '../components/HashChip';
import TerminalLine from '../components/TerminalLine';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function GuardianDashboard() {
  const { data: requestsData, isLoading } = useListRecoveryRequests({ status: 'PROOF_SUBMITTED' });
  const approveMutation = useGuardianApprove();
  const queryClient = useQueryClient();

  const requests = requestsData?.items || [];

  const handleApprove = async (requestId: string) => {
    const guardianId = prompt('Enter your Guardian ID:');
    if (!guardianId) return;
    
    // Mock signature generation
    const signature = `0x${Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

    toast.promise(
      approveMutation.mutateAsync({
        requestId,
        data: { guardianId, signature }
      }),
      {
        loading: 'Transmitting authorization signature...',
        success: () => {
          queryClient.invalidateQueries({ queryKey: getListRecoveryRequestsQueryKey({ status: 'PROOF_SUBMITTED' }) });
          return 'Authorization granted.';
        },
        error: 'Signature rejected.'
      }
    );
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-primary/30 pb-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-[0.2em] text-primary text-glow font-mono uppercase">
            Sentinel Quorum
          </h1>
          <div className="text-primary/50 font-mono tracking-widest text-sm mt-2 flex items-center gap-2">
            <Shield className="w-4 h-4" /> MULTI-SIG AUTHORIZATION CONTROL
          </div>
        </div>
        <div className="matrix-card p-4 flex items-center gap-4">
           <div className="text-right">
             <div className="text-xs text-primary/50 font-mono">PENDING AUTHORIZATIONS</div>
             <div className="text-2xl font-bold text-accent text-glow-amber">{requests.length}</div>
           </div>
           <ShieldAlert className={`w-8 h-8 ${requests.length > 0 ? 'text-accent animate-pulse' : 'text-primary/30'}`} />
        </div>
      </div>

      {isLoading ? (
        <div className="matrix-card p-12 flex justify-center">
          <TerminalLine text="Scanning network for pending recovery signals..." />
        </div>
      ) : requests.length === 0 ? (
        <div className="matrix-card p-16 flex flex-col items-center justify-center text-center border-dashed border-primary/30">
           <Cpu className="w-12 h-12 text-primary/20 mb-4" />
           <p className="text-primary/50 font-mono tracking-widest">NO PENDING REQUESTS IN QUEUE</p>
           <p className="text-xs text-primary/30 font-mono mt-2">All sectors nominal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div key={req.requestId} className="matrix-card group hover:border-primary/50 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent/50 group-hover:bg-accent transition-colors" />
              <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 pl-8">
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <Link href={`/recovery/${req.requestId}`}>
                      <span className="font-mono text-xl font-bold text-white hover:text-primary transition-colors cursor-pointer text-glow">
                        {req.requestId}
                      </span>
                    </Link>
                    <StatusBadge status={req.status} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 font-mono text-sm">
                    <div className="flex flex-col">
                      <span className="text-primary/40 text-xs">NEW KEY</span>
                      <HashChip hash={req.newKeyCommit} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-primary/40 text-xs">QUORUM</span>
                      <span className="text-primary">{req.approvalCount} / {req.quorum} SIGS</span>
                    </div>
                    <div className="flex flex-col col-span-2">
                       <span className="text-primary/40 text-xs">AGE</span>
                       <span className="text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[200px]">
                  <button
                    onClick={() => handleApprove(req.requestId)}
                    disabled={approveMutation.isPending}
                    className="w-full py-3 bg-transparent border border-accent text-accent font-mono font-bold tracking-widest hover:bg-accent/10 hover:text-glow-amber transition-all disabled:opacity-50"
                  >
                    [ AUTHORIZE ]
                  </button>
                  <Link href={`/recovery/${req.requestId}`}>
                    <button className="w-full py-2 bg-transparent border border-primary/30 text-primary/70 font-mono text-sm tracking-widest hover:border-primary hover:text-primary transition-all">
                      [ INSPECT DATA ]
                    </button>
                  </Link>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
