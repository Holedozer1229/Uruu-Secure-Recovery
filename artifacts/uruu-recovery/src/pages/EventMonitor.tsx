import React, { useState } from 'react';
import { useListEvents } from '@workspace/api-client-react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell, Badge, Input, Button } from '@/components/ui/core';
import { HashChip } from '@/components/ui/chip';
import { formatDate } from '@/lib/utils';
import { Activity, Download } from 'lucide-react';

export default function EventMonitor() {
  const [filterType, setFilterType] = useState('');
  
  const { data } = useListEvents(
    { limit: 100, eventType: filterType || undefined }, 
    { query: { refetchInterval: 5000 } }
  );

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uruu-events-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Event Monitor</h1>
            <p className="text-muted-foreground mt-1">Real-time cryptographic audit log.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Input 
            placeholder="Filter by Type..." 
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full md:w-64"
          />
          <Button variant="outline" onClick={handleDownload} className="gap-2 shrink-0">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      <Card>
        <div className="max-h-[70vh] overflow-auto relative rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead className="w-[150px]">Event Type</TableHead>
                <TableHead className="w-[150px]">Request ID</TableHead>
                <TableHead>Data Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map(ev => (
                <TableRow key={ev.id} className="hover:bg-primary/5">
                  <TableCell className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDate(ev.timestamp)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] bg-background">
                      {ev.eventType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ev.requestId ? <HashChip hash={ev.requestId} /> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground max-w-xl truncate">
                    {ev.dataJson}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.items.length && (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No events found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
