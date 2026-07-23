import React from 'react';
import { Link } from 'wouter';
import { useListPendingApprovals, useGuardianApprove } from '@workspace/api-client-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Button } from '@/components/ui/core';
import { HashChip } from '@/components/ui/chip';
import { Shield, Fingerprint } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function GuardianDashboard() {
  const { data, isLoading, refetch } = useListPendingApprovals();
  const approve = useGuardianApprove();

  const handleApprove = (requestId: string) => {
    approve.mutate({
      requestId,
      data: {
        guardianId: `guardian-sim-${Math.floor(Math.random() * 1000)}`,
        signature: '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')
      }
    }, {
      onSuccess: () => refetch()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-6">
        <div className="p-3 bg-secondary/10 text-secondary rounded-xl">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Guardian Quorum Interface</h1>
          <p className="text-muted-foreground mt-1">Pending operations requiring multi-sig authorization.</p>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>New Key Commit</TableHead>
              <TableHead>Quorum Status</TableHead>
              <TableHead>Age</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center py-8 font-mono text-primary animate-pulse">Scanning pool...</TableCell></TableRow>
            )}
            {data?.items.map(req => (
              <TableRow key={req.requestId}>
                <TableCell>
                  <Link href={`/recovery/${req.requestId}`} className="font-mono text-primary hover:underline">
                    {req.requestId.slice(0,8)}...
                  </Link>
                </TableCell>
                <TableCell><HashChip hash={req.newKeyCommit} /></TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-background rounded-full overflow-hidden border border-border">
                      <div 
                        className="h-full bg-secondary transition-all" 
                        style={{ width: `${Math.min(100, (req.approvalCount / req.quorum) * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs">{req.approvalCount}/{req.quorum}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{formatDate(req.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => handleApprove(req.requestId)}
                    disabled={approve.isPending}
                  >
                    <Fingerprint className="w-4 h-4" /> Sign
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data?.items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-16 font-mono text-sm">No pending approvals requiring your signature.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
