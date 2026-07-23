import React, { useState } from 'react';
import { useGetOnchainStatus, useGetEip712Schema } from '@workspace/api-client-react';
import TerminalLine from '../components/TerminalLine';
import HashChip from '../components/HashChip';
import { AlertTriangle, Code, ChevronRight, ChevronDown } from 'lucide-react';

export default function OnchainHub() {
  const { data: statusData, isLoading: statusLoading } = useGetOnchainStatus();
  const { data: schemaData, isLoading: schemaLoading } = useGetEip712Schema();
  
  const [openSchema, setOpenSchema] = useState<string | null>('ProofReceipt');

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-primary/30 pb-6 text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-bold tracking-[0.2em] text-primary text-glow font-mono uppercase">
          On-Chain Contracts
        </h1>
        <div className="inline-flex items-center gap-3 bg-accent/10 px-4 py-2 border border-accent">
          <AlertTriangle className="w-5 h-5 text-accent" />
          <span className="text-accent font-mono tracking-widest text-sm font-bold text-glow-amber">
            AUDIT-READY SKELETON — NOT DEPLOYED ON MAINNET
          </span>
        </div>
      </div>

      {/* Contract Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ContractColumn 
          title="EVM COMPATIBLE" 
          data={statusData?.evm} 
          loading={statusLoading} 
        />
        <ContractColumn 
          title="SOLANA / ANCHOR" 
          data={statusData?.solana} 
          loading={statusLoading} 
          variant="secondary"
        />
      </div>

      {/* EIP-712 Schema Section */}
      <div className="space-y-4 pt-8">
        <h2 className="text-xl font-mono text-primary/70 tracking-widest border-b border-primary/30 pb-2 flex items-center gap-3">
          <Code className="w-5 h-5" /> [ EIP-712 TYPED DATA SCHEMA ]
        </h2>
        
        {schemaLoading ? (
          <div className="matrix-card p-8">
            <TerminalLine text="Retrieving schema definitions from registry..." />
          </div>
        ) : schemaData ? (
          <div className="matrix-card p-0 divide-y divide-primary/20">
            {/* Domain separator info */}
            <div className="p-6 bg-black/50 font-mono text-sm space-y-2">
              <div className="text-primary/50 tracking-widest mb-4">DOMAIN SEPARATOR PARAMS</div>
              <TerminalLine prompt="NAME" text={`"${schemaData.domainName}"`} />
              <TerminalLine prompt="VERS" text={`"${schemaData.version}"`} />
              <div className="pt-2 text-primary/70">
                Fields: {schemaData.domainSeparatorFields.map(f => `${f.name} (${f.type})`).join(', ')}
              </div>
            </div>

            {/* Types accordion */}
            {schemaData.types.map((typeDef) => {
              const isOpen = openSchema === typeDef.typeName;
              return (
                <div key={typeDef.typeName} className="bg-background">
                  <button 
                    onClick={() => setOpenSchema(isOpen ? null : typeDef.typeName)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-primary/5 transition-colors text-left"
                  >
                    <span className="font-mono text-primary font-bold tracking-widest flex items-center gap-2">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      struct {typeDef.typeName}
                    </span>
                  </button>
                  
                  {isOpen && (
                    <div className="p-6 pt-0 border-t border-primary/10 bg-black/30 font-mono text-sm pl-12 space-y-2">
                      {typeDef.fields.map((field) => (
                        <div key={field.name} className="flex gap-4">
                          <span className="text-accent w-24">{field.type}</span>
                          <span className="text-primary/80">{field.name};</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Integration Notes */}
            <div className="p-6 bg-primary/5 font-mono text-sm space-y-3">
              <div className="text-primary/50 tracking-widest mb-2">INTEGRATION NOTES</div>
              {schemaData.integrationNotes.map((note, i) => (
                <div key={i} className="flex gap-3 text-primary/80">
                  <span className="text-primary opacity-50">&gt;</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

    </div>
  );
}

function ContractColumn({ title, data, loading, variant = 'primary' }: { title: string, data: any, loading: boolean, variant?: 'primary'|'secondary' }) {
  const colorClass = variant === 'primary' ? 'text-primary border-primary' : 'text-secondary border-secondary';
  const glowClass = variant === 'primary' ? 'text-glow' : 'text-glow-red';
  const bgClass = variant === 'primary' ? 'bg-primary/5' : 'bg-secondary/5';

  return (
    <div className={`matrix-card p-8 space-y-6 ${variant === 'secondary' ? 'border-secondary/30' : ''}`}>
      <div className="flex items-center justify-between border-b border-current/20 pb-4">
        <h3 className={`font-mono text-xl font-bold tracking-widest ${colorClass} ${glowClass}`}>
          {title}
        </h3>
        {data && (
          <span className={`text-[10px] font-mono px-2 py-1 border uppercase ${colorClass}`}>
            {data.status}
          </span>
        )}
      </div>

      {loading ? (
        <TerminalLine text="Querying RPC nodes..." />
      ) : data ? (
        <div className="space-y-6 font-mono">
          <div className="space-y-2">
            <div className="text-xs tracking-widest opacity-50">CONTRACT ADDRESS</div>
            <HashChip hash={data.address} showFull className="w-full py-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className={`p-4 border ${colorClass} ${bgClass} space-y-1`}>
               <div className="text-xs opacity-50 tracking-widest">GUARDIANS</div>
               <div className={`text-2xl font-bold ${glowClass}`}>{data.guardianCount}</div>
            </div>
            <div className={`p-4 border ${colorClass} ${bgClass} space-y-1`}>
               <div className="text-xs opacity-50 tracking-widest">QUORUM</div>
               <div className={`text-2xl font-bold ${glowClass}`}>{data.quorum}</div>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-current/20 pt-4 mt-4 opacity-70">
            <span>TOTAL REQ: {data.totalRequests}</span>
            {data.lastBlock && <span>BLOCK: {data.lastBlock}</span>}
          </div>
        </div>
      ) : (
        <TerminalLine text="Data unavailable." variant={variant === 'secondary' ? 'red' : 'green'} />
      )}
    </div>
  );
}
