import React from 'react';
import { useGetRecoveryRequest, useContestRecovery, getGetRecoveryRequestQueryKey } from '@workspace/api-client-react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, AlertTriangle, ShieldCheck, Clock, ShieldX } from 'lucide-react';
import TerminalLine from '../components/TerminalLine';
import HashChip from '../components/HashChip';
import StatusBadge from '../components/StatusBadge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function RecoveryDetail() {
  const { requestId } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: request, isLoading, error } = useGetRecoveryRequest(requestId || '');
  const contestMutation = useContestRecovery();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,65,0.5)]" />
        <TerminalLine text="Fetching cryptographic state from the grid..." />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-6">
        <button onClick={() => setLocation('/')} className="flex items-center gap-2 text-primary hover:text-glow font-mono transition-all">
          <ArrowLeft className="w-4 h-4" /> [ RETURN TO BASE ]
        </button>
        <div className="matrix-card p-8 border-secondary flex flex-col items-center justify-center gap-4 text-center">
          <ShieldX className="w-16 h-16 text-secondary neon-flicker" />
          <h2 className="text-2xl font-bold text-secondary text-glow-red tracking-widest">SIGNAL LOST</h2>
          <TerminalLine prompt="ERR" text="Failed to retrieve recovery record. Entity may not exist." variant="red" />
        </div>
      </div>
    );
  }

  const isContested = request.status === 'CONTESTED';
  const cardBorderClass = isContested ? 'border-secondary shadow-[0_0_20px_rgba(255,0,50,0.2)]' : 'border-primary/50';

  const handleContest = async () => {
    if (!requestId) return;
    const contestHash = prompt('Enter override hash to contest this recovery:');
    if (!contestHash || contestHash.length < 10) {
      toast.error('Invalid contest hash provided.');
      return;
    }

    toast.promise(
      contestMutation.mutateAsync({
        requestId,
        data: { contestHash }
      }),
      {
        loading: 'Broadcasting contest signal...',
        success: () => {
          queryClient.invalidateQueries({ queryKey: getGetRecoveryRequestQueryKey(requestId) });
          return 'Recovery successfully contested.';
        },
        error: 'Contest broadcast failed.'
      }
    );
  };

  return (
    <div className="space-y-8 pb-12 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={() => window.history.back()} className="flex items-center gap-2 text-primary/70 hover:text-primary hover:text-glow font-mono transition-all text-sm tracking-wider">
          <ArrowLeft className="w-4 h-4" /> [ ABORT VIEW ]
        </button>
        <StatusBadge status={request.status} className="scale-125 origin-right" />
      </div>

      <div className={`matrix-card p-6 md:p-10 transition-all duration-500 ${cardBorderClass}`}>
        {/* Status Header */}
        <div className="border-b border-primary/20 pb-8 mb-8 text-center space-y-4">
          <div className="font-mono text-primary/50 tracking-widest text-sm">TARGET ENTITY</div>
          <div className="text-3xl md:text-5xl font-mono text-white tracking-wider break-all text-glow">
            {request.requestId}
          </div>
          {isContested && (
            <div className="inline-flex items-center gap-3 bg-secondary/20 px-6 py-2 border border-secondary mt-4 neon-flicker">
              <AlertTriangle className="w-6 h-6 text-secondary" />
              <span className="text-secondary font-bold tracking-widest">PROTOCOL OVERRIDDEN: CONTESTED</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Data Columns */}
          <div className="space-y-8 font-mono">
            <div className="space-y-2">
              <div className="text-primary/50 tracking-widest text-xs">[ NEW KEY COMMITMENT ]</div>
              <HashChip hash={request.newKeyCommit} showFull className="w-full justify-between py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <div className="text-primary/50 tracking-widest text-xs">[ POLICY COMMITMENT ]</div>
              <HashChip hash={request.policyCommit} showFull className="w-full justify-between py-2 text-sm" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-primary/50 tracking-widest text-xs">[ CREATED ]</div>
                <div className="text-sm">{new Date(request.createdAt).toLocaleString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-primary/50 tracking-widest text-xs">[ TIMELOCK ]</div>
                <div className="text-sm flex items-center gap-2 text-accent">
                  <Clock className="w-3 h-3" /> {request.requestedTimelock / 3600} HRS
                </div>
              </div>
            </div>

            {/* Proof Receipt */}
            <div className="space-y-2 pt-4">
              <div className="text-primary/50 tracking-widest text-xs flex items-center justify-between border-b border-primary/20 pb-2">
                <span>[ ZERO-KNOWLEDGE PROOF ]</span>
                {request.proofReceipt ? (
                  <span className="text-primary text-glow flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> VALIDATED</span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1"><ShieldX className="w-3 h-3"/> PENDING</span>
                )}
              </div>
              {request.proofReceipt && (
                <div className="bg-black/50 p-4 border border-primary/20 text-xs text-primary/80 break-all space-y-2 max-h-40 overflow-y-auto mt-2">
                  <TerminalLine prompt="PHSH" text={request.proofReceipt.proofHash} />
                  <TerminalLine prompt="PIPT" text={request.proofReceipt.publicInputsHash} />
                  <TerminalLine prompt="VSIG" text={request.proofReceipt.verifierSig} />
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Guardians */}
          <div className="space-y-8">
             <div className="space-y-4">
              <div className="text-primary/50 tracking-widest text-xs font-mono border-b border-primary/20 pb-2">
                [ GUARDIAN MULTISIG QUORUM: {request.approvalCount} / {request.quorum} ]
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: request.quorum }).map((_, i) => (
                  <div key={i} className={`h-12 border flex items-center justify-center transition-all ${
                    i < request.approvalCount 
                      ? 'border-primary bg-primary/20 text-primary shadow-[0_0_10px_rgba(0,255,65,0.3)]' 
                      : 'border-muted-foreground/30 bg-muted/10 text-muted-foreground/30'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${i < request.approvalCount ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  </div>
                ))}
              </div>
             </div>

             <div className="matrix-card p-4 min-h-[200px] flex flex-col justify-end relative">
               <div className="absolute top-2 left-4 text-xs font-mono text-primary/30 tracking-widest">SYSTEM_LOG</div>
               <div className="space-y-2 pt-6">
                 <TerminalLine prompt="SYS" text={`Recovery entity initialized.`} />
                 {request.proofReceipt && <TerminalLine prompt="SYS" text="zkEVM proof accepted." variant="gold" />}
                 {request.approvalCount > 0 && <TerminalLine prompt="SYS" text={`${request.approvalCount} guardian signatures aggregated.`} />}
                 {request.status === 'APPROVED' && <TerminalLine prompt="SYS" text="Quorum reached. Timelock counting down." />}
                 {isContested && <TerminalLine prompt="ERR" text="CONTEST HASH RECEIVED. ABORTING." variant="red" />}
                 {request.status === 'FINALIZED' && <TerminalLine prompt="SYS" text="STATE FINALIZED ON CHAIN." />}
                 <div className="cursor-blink h-4 mt-2" />
               </div>
             </div>

             {/* Actions */}
             <div className="pt-4 flex gap-4">
               {request.status !== 'FINALIZED' && request.status !== 'CONTESTED' && (
                 <button
                   onClick={handleContest}
                   disabled={contestMutation.isPending}
                   className="flex-1 py-3 border border-secondary text-secondary font-mono tracking-widest font-bold hover:bg-secondary/10 hover:shadow-[0_0_15px_rgba(255,0,50,0.4)] transition-all disabled:opacity-50"
                 >
                   [ OVERRIDE // CONTEST ]
                 </button>
               )}
               {request.status === 'INITIATED' && !request.proofReceipt && (
                 <button
                   onClick={() => setLocation(`/recovery/${requestId}/submit-proof`)}
                   className="flex-1 py-3 border border-primary text-primary font-mono tracking-widest font-bold hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(0,255,65,0.6)] transition-all"
                 >
                   [ EXECUTE PROOF ]
                 </button>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
