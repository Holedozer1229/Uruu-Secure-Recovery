import React, { useEffect, useState } from 'react';
import { useGetPrometheusMetrics } from '@workspace/api-client-react';
import TerminalLine from '../components/TerminalLine';
import { Activity, Download, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function PrometheusMetrics() {
  const { data, isLoading, refetch } = useGetPrometheusMetrics();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const metrics = data?.metrics || [];

  // Group metrics conceptually by prefix
  const recoveryMetrics = metrics.filter(m => m.name.startsWith('uruu_recovery'));
  const zkMetrics = metrics.filter(m => m.name.startsWith('uruu_zkevm'));
  const apiMetrics = metrics.filter(m => m.name.startsWith('uruu_api') || m.name.startsWith('http'));
  const otherMetrics = metrics.filter(m => !m.name.startsWith('uruu_recovery') && !m.name.startsWith('uruu_zkevm') && !m.name.startsWith('uruu_api') && !m.name.startsWith('http'));

  const rawFormat = metrics.map(m => 
    `# HELP ${m.name} ${m.help}\n# TYPE ${m.name} ${m.type}\n${m.name}${m.labels} ${m.value}`
  ).join('\n\n');

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-primary/30 pb-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-[0.2em] text-primary text-glow font-mono uppercase flex items-center gap-3">
            <Activity className="w-8 h-8" /> Prometheus Telemetry
          </h1>
          <p className="text-primary/50 font-mono tracking-widest text-sm">
            SYSTEM OBSERVABILITY // TIME-SERIES DATA
          </p>
        </div>
        <div className="flex items-center gap-4">
          {data?.generatedAt && (
            <div className="text-xs font-mono text-primary/40 tracking-widest text-right">
              GENERATED AT<br/>
              {new Date(data.generatedAt).toISOString()}
            </div>
          )}
          <button 
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 border border-primary px-4 py-2 font-mono text-sm text-primary hover:bg-primary/20 transition-colors"
          >
            <Download className="w-4 h-4" /> RAW EXPORT
          </button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="matrix-card p-12 flex justify-center">
          <TerminalLine text="Connecting to metrics endpoint (/metrics)..." />
        </div>
      ) : (
        <div className="space-y-8">
          <MetricGroup title="RECOVERY PROTOCOL METRICS" metrics={recoveryMetrics} />
          <MetricGroup title="ZKEVM PIPELINE METRICS" metrics={zkMetrics} />
          <MetricGroup title="API & HTTP METRICS" metrics={apiMetrics} />
          {otherMetrics.length > 0 && <MetricGroup title="SYSTEM METRICS" metrics={otherMetrics} />}
        </div>
      )}

      {/* Raw Export Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl bg-black border border-primary text-primary p-0 gap-0">
          <DialogHeader className="p-4 border-b border-primary/30 flex flex-row items-center justify-between">
            <DialogTitle className="font-mono text-lg tracking-widest">/metrics EXPORT</DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-x-auto">
            <pre className="font-mono text-xs text-primary/70 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {rawFormat}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricGroup({ title, metrics }: { title: string, metrics: any[] }) {
  if (metrics.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-mono text-primary/50 tracking-widest border-b border-primary/20 pb-2">
        [ {title} ]
      </h2>
      <div className="matrix-card overflow-hidden">
        <table className="w-full text-left font-mono text-sm border-collapse">
          <thead>
            <tr className="border-b border-primary/20 bg-black/50 text-primary/40 text-xs tracking-widest">
              <th className="p-3 font-normal">METRIC NAME</th>
              <th className="p-3 font-normal hidden md:table-cell">TYPE</th>
              <th className="p-3 font-normal hidden lg:table-cell">HELP</th>
              <th className="p-3 font-normal text-right">VALUE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {metrics.map((m, i) => (
              <tr key={i} className="hover:bg-primary/5 transition-colors group">
                <td className="p-3">
                  <div className="text-primary group-hover:text-glow transition-all">{m.name}</div>
                  {m.labels && <div className="text-xs text-accent mt-1">{m.labels}</div>}
                  <div className="text-xs text-primary/40 mt-1 lg:hidden">{m.help}</div>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span className="px-2 py-0.5 border border-primary/30 text-primary/70 text-xs bg-black">
                    {m.type.toUpperCase()}
                  </span>
                </td>
                <td className="p-3 text-xs text-primary/40 hidden lg:table-cell w-1/3">
                  {m.help}
                </td>
                <td className="p-3 text-right">
                  <span className={`text-lg font-bold ${m.value > 0 && (m.name.includes('error') || m.name.includes('fail')) ? 'text-secondary text-glow-red neon-flicker' : 'text-primary text-glow'}`}>
                    {m.value}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
