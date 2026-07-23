import React, { useState } from 'react';
import { useRoute, Link, useLocation } from 'wouter';
import { useVerifyProof, useSubmitProof, useGetRecoveryRequest, getGetRecoveryRequestQueryKey } from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button, Input, Label } from '@/components/ui/core';
import { HashChip } from '@/components/ui/chip';
import { Terminal, Shield, ArrowRight } from 'lucide-react';

export default function SubmitProof() {
  const [, params] = useRoute('/recovery/:requestId/submit-proof');
  const [, setLocation] = useLocation();
  const requestId = params?.requestId || '';

  const { data: req } = useGetRecoveryRequest(requestId, {
    query: { enabled: !!requestId, queryKey: getGetRecoveryRequestQueryKey(requestId) }
  });

  const verifyProof = useVerifyProof();
  const submitProof = useSubmitProof();

  const [form, setForm] = useState({
    accountId: 'acc_12345',
    proofNonce: 'nonce_' + Math.floor(Math.random() * 10000),
    proofBlob: ''
  });

  const [receipt, setReceipt] = useState<any>(null);

  const handleGenerateSynthetic = () => {
    setForm(f => ({
      ...f,
      proofBlob: btoa(JSON.stringify({ 
        type: 'synthetic_zk_proof', 
        timestamp: Date.now(), 
        valid: true 
      }))
    }));
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!req) return;
    
    verifyProof.mutate({
      requestId,
      data: {
        proofBlob: form.proofBlob,
        publicInputs: {
          accountId: form.accountId,
          requestId: req.requestId,
          newKeyCommit: req.newKeyCommit,
          policyCommit: req.policyCommit,
          proofNonce: form.proofNonce
        }
      }
    }, {
      onSuccess: (data) => {
        setReceipt(data);
      }
    });
  };

  const handleSubmitReceipt = () => {
    if (!receipt) return;
    submitProof.mutate({
      requestId,
      data: { proofReceipt: receipt }
    }, {
      onSuccess: () => {
        setLocation(`/recovery/${requestId}`);
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Link href={`/recovery/${requestId}`}>
          <Button variant="outline" size="sm" className="h-8">Back</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zero-Knowledge Proof Submission</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">REQ: {requestId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground tracking-wider">Step 1: Local Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="space-y-2">
                <Label>Account ID</Label>
                <Input value={form.accountId} onChange={e => setForm(f => ({...f, accountId: e.target.value}))} required />
              </div>
              <div className="space-y-2">
                <Label>Proof Nonce</Label>
                <Input value={form.proofNonce} onChange={e => setForm(f => ({...f, proofNonce: e.target.value}))} required />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Proof Blob (Base64)</Label>
                  <button type="button" onClick={handleGenerateSynthetic} className="text-[10px] uppercase text-primary hover:underline font-mono">
                    Generate Synthetic
                  </button>
                </div>
                <textarea 
                  className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono h-32 resize-none"
                  value={form.proofBlob}
                  onChange={e => setForm(f => ({...f, proofBlob: e.target.value}))}
                  required
                  placeholder="eyJ0eXBlIjoic3ludGhldGlj..."
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={verifyProof.isPending || !form.proofBlob}>
                <Shield className="w-4 h-4" />
                {verifyProof.isPending ? 'Verifying...' : 'Verify Proof'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className={receipt ? "border-primary/50 shadow-[0_0_30px_rgba(0,229,255,0.1)] transition-all" : "opacity-50 pointer-events-none transition-all"}>
          <CardHeader>
            <CardTitle className="text-sm uppercase text-primary flex items-center gap-2 tracking-wider">
              <Terminal className="w-4 h-4" /> Step 2: Submit Receipt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {receipt ? (
              <>
                <div className="bg-black/50 p-5 rounded-md border border-primary/20 font-mono text-xs space-y-4 overflow-hidden">
                  <div className="text-green-400 mb-2 border-b border-green-400/20 pb-2">✓ VERIFICATION SUCCESSFUL</div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Proof Hash:</span> 
                    <HashChip hash={receipt.proofHash} className="w-full justify-start bg-background" />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Public Inputs Hash:</span> 
                    <HashChip hash={receipt.publicInputsHash} className="w-full justify-start bg-background" />
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Verifier Sig:</span> 
                    <HashChip hash={receipt.verifierSig} className="w-full justify-start bg-background" />
                  </div>
                </div>
                <Button 
                  onClick={handleSubmitReceipt} 
                  className="w-full text-base h-12 gap-2"
                  disabled={submitProof.isPending}
                >
                  {submitProof.isPending ? 'Submitting to Quorum...' : 'Submit to Quorum'} <ArrowRight className="w-5 h-5" />
                </Button>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-16 font-mono text-sm border border-dashed border-border rounded-md bg-background/50">
                Awaiting valid proof verification...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
