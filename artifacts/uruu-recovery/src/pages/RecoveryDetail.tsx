import React, { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { 
  useGetRecoveryRequest, 
  getGetRecoveryRequestQueryKey,
  useFinalizeRecovery,
  useContestRecovery,
  useListEvents
} from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button, Input, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/core';
import { HashChip } from '@/components/ui/chip';
import { formatDate } from '@/lib/utils';
import { Clock, ShieldCheck, AlertTriangle, CheckCircle2, History } from 'lucide-react';

export default function RecoveryDetail() {
  const [, params] = useRoute('/recovery/:requestId');
  const requestId = params?.requestId || '';

  const { data: req, isLoading, refetch } = useGetRecoveryRequest(requestId, {
    query: { enabled: !!requestId, queryKey: getGetRecoveryRequestQueryKey(requestId) }
  });

  const { data: eventsData } = useListEvents({ requestId, limit: 50 }, {
    query: { enabled: !!requestId }
  });

  const finalize = useFinalizeRecovery();
  const contest = useContestRecovery();

  const [contestHash, setContestHash] = useState('');

  // Auto-refresh slightly if timelock is ticking
  useEffect(() => {
    if (req?.status === 'APPROVED' && req.timelockExpiresAt) {
      const interval = setInterval(() => refetch(), 10000);
      return () => clearInterval(interval);
    }
  }, [req?.status, req?.timelockExpiresAt, refetch]);

  if (isLoading) return <div className="text-center py-20 font-mono text-primary animate-pulse">LOADING REQUEST DATA...</div>;
  if (!req) return <div className="text-center py-20 text-destructive">REQUEST NOT FOUND</div>;

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    INITIATED: "outline",
    PROOF_SUBMITTED: "secondary",
    APPROVED: "default",
    CONTESTED: "destructive",
    FINALIZED: "default"
  };

  const isTimelockExpired = req.timelockExpiresAt ? new Date(req.timelockExpiresAt).getTime() < Date.now() : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Recovery Operation</h1>
            <Badge variant={statusColors[req.status] || "outline"} className="px-3 py-1 font-mono text-[10px]">
              {req.status}
            </Badge>
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
            ID: <HashChip hash={req.requestId} />
          </div>
        </div>

        {req.status === 'INITIATED' && (
          <Link href={`/recovery/${requestId}/submit-proof`}>
            <Button>Generate & Submit ZK Proof</Button>
          </Link>
        )}
        {req.status === 'APPROVED' && (
          <Button 
            onClick={() => finalize.mutate({ requestId }, { onSuccess: () => refetch() })}
            disabled={!isTimelockExpired || finalize.isPending}
            className={isTimelockExpired ? "shadow-[0_0_20px_rgba(0,229,255,0.4)]" : "opacity-50"}
          >
            {finalize.isPending ? 'Finalizing...' : (isTimelockExpired ? 'Finalize Recovery' : 'Timelock Active')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Cryptographic Commitments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">New Key Commit</div>
                  <HashChip hash={req.newKeyCommit} className="text-sm w-full py-2 justify-center bg-background border-dashed" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Policy Commit</div>
                  <HashChip hash={req.policyCommit} className="text-sm w-full py-2 justify-center bg-background border-dashed" />
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-border flex justify-between items-center text-sm font-mono text-muted-foreground">
                <div>Created: {formatDate(req.createdAt)}</div>
                <div>Timelock: {req.requestedTimelock}s</div>
              </div>
            </CardContent>
          </Card>

          {req.proofReceipt && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm text-primary uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Proof Receipt Verified
                </CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-xs space-y-3 bg-black/40 p-4 rounded-md mx-6 mb-6 border border-primary/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <span className="text-muted-foreground">Proof Hash:</span> 
                  <HashChip hash={req.proofReceipt.proofHash} className="bg-transparent" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <span className="text-muted-foreground">Public Inputs:</span> 
                  <HashChip hash={req.proofReceipt.publicInputsHash} className="bg-transparent" />
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <span className="text-muted-foreground">Verifier Sig:</span> 
                  <HashChip hash={req.proofReceipt.verifierSig} className="bg-transparent" />
                </div>
                <div className="flex justify-between pt-2 border-t border-primary/10 mt-2">
                  <span className="text-muted-foreground">Timestamp:</span> {formatDate(req.proofReceipt.timestamp)}
                </div>
              </CardContent>
            </Card>
          )}

          {req.status === 'PROOF_SUBMITTED' && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-sm text-destructive uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Contest Operation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form 
                  className="flex gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    contest.mutate({ requestId, data: { contestHash } }, {
                      onSuccess: () => refetch()
                    });
                  }}
                >
                  <Input 
                    placeholder="Contest Proof Hash (0x...)" 
                    value={contestHash}
                    onChange={e => setContestHash(e.target.value)}
                    required
                    className="border-destructive/30 focus-visible:ring-destructive bg-background"
                  />
                  <Button type="submit" variant="destructive" disabled={contest.isPending}>Contest</Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4" /> Operation Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsData?.items.map(ev => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-mono text-[10px] whitespace-nowrap text-muted-foreground">{formatDate(ev.timestamp)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] font-mono">{ev.eventType}</Badge></TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {ev.dataJson}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!eventsData?.items.length && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No events found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Guardian Quorum</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <div className="text-5xl font-bold font-mono text-primary">{req.approvalCount} <span className="text-2xl text-muted-foreground">/ {req.quorum}</span></div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-2">Approvals</div>
                </div>
                {req.approvalCount >= req.quorum && <CheckCircle2 className="w-10 h-10 text-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]" />}
              </div>
              
              <div className="space-y-2 pt-4 border-t border-border">
                {req.guardianApprovals?.map((g, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded bg-background/50 border border-border/50 text-sm">
                    <span className="font-mono font-medium text-xs text-muted-foreground">{g.guardianId}</span>
                    <HashChip hash={g.signature} className="text-[10px] py-0.5" />
                  </div>
                ))}
                {(!req.guardianApprovals || req.guardianApprovals.length === 0) && (
                  <div className="text-sm text-muted-foreground text-center py-4 font-mono">Awaiting signatures...</div>
                )}
              </div>
            </CardContent>
          </Card>

          {req.timelockExpiresAt && req.status === 'APPROVED' && (
            <Card className="border-secondary/30 bg-secondary/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="w-24 h-24 text-secondary" />
              </div>
              <CardHeader>
                <CardTitle className="text-sm text-secondary uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Timelock Enforced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase mb-1">Expires At</div>
                    <div className="font-mono text-xl font-bold text-secondary">
                      {formatDate(req.timelockExpiresAt)}
                    </div>
                  </div>
                  <div>
                    {isTimelockExpired ? (
                      <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">EXPIRED - READY TO FINALIZE</Badge>
                    ) : (
                      <Badge variant="secondary" className="animate-pulse">LOCK ACTIVE</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
