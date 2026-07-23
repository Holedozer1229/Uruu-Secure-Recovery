import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/core';
import diagram from '@assets/spooky_action_in_math_1784813752682.png';
import { Microscope, AlertTriangle } from 'lucide-react';

export default function ResearchInterface() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Microscope className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Quantum Circuit Interface Spec</h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm">URUU Protocol v0.9.4-alpha</p>
          </div>
        </div>
        <Badge variant="destructive" className="flex items-center gap-1 uppercase tracking-widest text-[10px] px-3 py-1 shadow-[0_0_15px_rgba(239,68,68,0.3)] border-destructive">
          <AlertTriangle className="w-3 h-3" />
          Research Only — Not Executable
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-purple-500/20 bg-purple-500/5 col-span-1 lg:col-span-2 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center gap-8 p-8">
            <div className="w-full md:w-1/2">
              <img src={diagram} alt="Spooky Action in Mathematics" className="w-full rounded-lg border border-purple-500/30 mix-blend-screen shadow-[0_0_30px_rgba(168,85,247,0.15)]" />
            </div>
            <div className="w-full md:w-1/2 space-y-4 relative z-10">
              <h3 className="text-2xl font-bold text-purple-300">Spooky Action in Mathematics</h3>
              <p className="text-purple-200/70 leading-relaxed text-sm">
                The URUU protocol leverages entanglement-like properties in highly structured ZK proof circuits to achieve O(1) state resolution over N disparate oracle networks. The mathematical fixed point enforces consensus without communication.
              </p>
              <div className="bg-black/50 p-5 rounded-md border border-purple-500/30 font-mono text-center text-xl text-purple-200 shadow-inner">
                P(s<sub>i+1</sub>) = f(P(s<sub>i+1</sub>)) <br/>
                <span className="text-xs text-purple-400/50 mt-2 block">with h* = 0.869, asym = 0.502</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary text-sm uppercase tracking-wider">Measurement API Spec</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-xs text-muted-foreground">
            <p className="font-sans text-sm">The verifier acts as a quantum measurement apparatus, collapsing the superimposed proof states into a single boolean validation receipt.</p>
            <div className="bg-black/50 p-4 rounded border border-border overflow-x-auto">
              <pre className="text-green-400 leading-loose">
{`interface IOracleMeasurement {
  function collapse(
    bytes32 stateRoot,
    bytes calldata zkProof
  ) external returns (bool isValid);
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-primary text-sm uppercase tracking-wider">Canonical Serialization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 font-mono text-xs text-muted-foreground">
            <p className="font-sans text-sm">All inputs must be strictly ordered and padded to 32-byte boundaries before commitment generation.</p>
            <ul className="list-none space-y-2">
              <li className="flex gap-4"><span className="text-primary w-24">accountId</span> <span>pad-right</span></li>
              <li className="flex gap-4"><span className="text-primary w-24">requestId</span> <span>hex, exactly 64 chars</span></li>
              <li className="flex gap-4"><span className="text-primary w-24">newKeyCommit</span> <span>32 bytes</span></li>
              <li className="flex gap-4"><span className="text-primary w-24">policyCommit</span> <span>32 bytes</span></li>
              <li className="flex gap-4"><span className="text-primary w-24">proofNonce</span> <span>uint256 BE</span></li>
            </ul>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase text-muted-foreground tracking-wider">Synthetic Test Vectors</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>New Key Commit</TableHead>
                  <TableHead>Proof Nonce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="font-mono text-xs">
                <TableRow>
                  <TableCell>acc_alpha_01</TableCell>
                  <TableCell className="text-primary truncate max-w-[100px]">req_8f72c1...</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[100px]">0x4b2a...</TableCell>
                  <TableCell>1459023</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>acc_beta_09</TableCell>
                  <TableCell className="text-primary truncate max-w-[100px]">req_3e91a4...</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[100px]">0x9c3f...</TableCell>
                  <TableCell>8841294</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>acc_gamma_42</TableCell>
                  <TableCell className="text-primary truncate max-w-[100px]">req_1d55b8...</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[100px]">0x1a7e...</TableCell>
                  <TableCell>3301928</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
