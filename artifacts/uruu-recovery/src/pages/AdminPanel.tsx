import React, { useState } from 'react';
import { Link } from 'wouter';
import { useListRecoveryRequests, useGetStats } from '@workspace/api-client-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge } from '@/components/ui/core';
import { formatDate } from '@/lib/utils';
import { List } from 'lucide-react';

const TABS = ['ALL', 'INITIATED', 'PROOF_SUBMITTED', 'APPROVED', 'CONTESTED', 'FINALIZED'] as const;

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>('ALL');
  const { data: stats } = useGetStats();
  
  const { data, isLoading } = useListRecoveryRequests(
    { status: activeTab === 'ALL' ? undefined : (activeTab as any) }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2">
        <div className="p-3 bg-muted text-foreground rounded-xl">
          <List className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Registry</h1>
          <p className="text-muted-foreground mt-1">Global view of all recovery operations.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b border-border pb-px gap-8 no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 uppercase tracking-wider ${
              activeTab === tab 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
            {tab !== 'ALL' && stats?.byStatus.find(s => s.status === tab) && (
              <span className="ml-2 inline-flex items-center justify-center bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-mono">
                {stats.byStatus.find(s => s.status === tab)?.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quorum</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-mono">Querying registry...</TableCell></TableRow>
            )}
            {data?.items.map(req => (
              <TableRow key={req.requestId}>
                <TableCell>
                  <Link href={`/recovery/${req.requestId}`} className="font-mono text-primary hover:underline font-medium">
                    {req.requestId}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === 'FINALIZED' ? 'default' : req.status === 'CONTESTED' ? 'destructive' : req.status === 'APPROVED' ? 'default' : 'outline'} className="font-mono text-[10px]">
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {req.approvalCount} / {req.quorum}
                </TableCell>
                <TableCell className="text-[11px] font-mono text-muted-foreground">{formatDate(req.createdAt)}</TableCell>
                <TableCell className="text-[11px] font-mono text-muted-foreground">{formatDate(req.updatedAt)}</TableCell>
              </TableRow>
            ))}
            {data?.items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-12">No requests found for this filter.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
