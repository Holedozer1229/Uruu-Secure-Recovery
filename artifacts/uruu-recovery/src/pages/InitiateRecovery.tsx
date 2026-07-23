import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useInitiateRecovery } from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/core';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export default function InitiateRecovery() {
  const [, setLocation] = useLocation();
  const initiateRecovery = useInitiateRecovery();

  const [form, setForm] = useState({
    newKeyCommit: '',
    policyCommit: '',
    requestedTimelock: '3600', // 1 hour default
    metadata: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    initiateRecovery.mutate({
      data: {
        newKeyCommit: form.newKeyCommit,
        policyCommit: form.policyCommit,
        requestedTimelock: Number(form.requestedTimelock),
        metadata: form.metadata || undefined
      }
    }, {
      onSuccess: (data) => {
        setLocation(`/recovery/${data.requestId}`);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Initiate Protocol</h1>
        <p className="text-muted-foreground mt-2">Begin a new cryptographic asset recovery operation. This action is auditable and irreversibly logs the commitment.</p>
      </div>

      <Card className="border-secondary/30 shadow-[0_0_30px_rgba(255,179,0,0.05)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-secondary uppercase text-sm tracking-wider">
            <ShieldAlert className="w-5 h-5" />
            Initialization Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newKeyCommit">New Key Commitment (Hex)</Label>
              <Input 
                id="newKeyCommit" 
                placeholder="0x..." 
                value={form.newKeyCommit}
                onChange={e => setForm(f => ({ ...f, newKeyCommit: e.target.value }))}
                required
                minLength={10}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="policyCommit">Policy Commitment (Hex)</Label>
              <Input 
                id="policyCommit" 
                placeholder="0x..." 
                value={form.policyCommit}
                onChange={e => setForm(f => ({ ...f, policyCommit: e.target.value }))}
                required
                minLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timelock">Enforced Timelock</Label>
              <select 
                id="timelock"
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono appearance-none"
                value={form.requestedTimelock}
                onChange={e => setForm(f => ({ ...f, requestedTimelock: e.target.value }))}
              >
                <option value="60">1 Minute (Test)</option>
                <option value="3600">1 Hour</option>
                <option value="86400">24 Hours</option>
                <option value="604800">7 Days</option>
                <option value="2592000">30 Days</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata">Optional Metadata</Label>
              <Input 
                id="metadata" 
                placeholder="Reason for recovery..." 
                value={form.metadata}
                onChange={e => setForm(f => ({ ...f, metadata: e.target.value }))}
                className="font-sans"
              />
            </div>

            {initiateRecovery.isError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Failed to initiate recovery. Ensure commitments are valid hex strings.</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full text-base h-12"
              disabled={initiateRecovery.isPending || !form.newKeyCommit || !form.policyCommit}
            >
              {initiateRecovery.isPending ? 'Committing to Ledger...' : 'Commit & Initialize'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
