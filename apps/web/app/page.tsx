'use client';

import { useState } from 'react';

type ServiceId = 'fastapi' | 'flask' | 'express';

interface ServiceDef {
  id: ServiceId;
  label: string;
  color: string;
  endpoint: string;
}

const isDev = process.env.NODE_ENV === 'development';

const SERVICES: ServiceDef[] = [
  { id: 'fastapi', label: 'FastAPI', color: 'teal', endpoint: '/_/service-fastapi' },
  { id: 'flask', label: 'Flask', color: 'sky', endpoint: '/_/service-flask' },
  { id: 'express', label: 'Express', color: 'orange', endpoint: '/_/service-express' },
];

const COLORS: Record<string, { border: string; bg: string; text: string; badge: string; button: string }> = {
  teal: {
    border: 'border-teal-500/40',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    badge: 'bg-teal-500',
    button: 'bg-teal-600 hover:bg-teal-500',
  },
  sky: {
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    badge: 'bg-sky-500',
    button: 'bg-sky-600 hover:bg-sky-500',
  },
  orange: {
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    badge: 'bg-orange-500',
    button: 'bg-orange-600 hover:bg-orange-500',
  },
  purple: {
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    badge: 'bg-purple-500',
    button: 'bg-purple-600 hover:bg-purple-500',
  },
};

function ServicePanel({ service, blocked }: { service: ServiceDef; blocked?: boolean }) {
  const [response, setResponse] = useState<object | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const c = COLORS[service.color];

  async function send() {
    setLoading(true);
    setError(null);
    setResponse(null);
    const start = performance.now();
    try {
      const res = await fetch(`${service.endpoint}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLatency(Math.round(performance.now() - start));
      setResponse(data);
    } catch (e: unknown) {
      setLatency(Math.round(performance.now() - start));
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.badge}`} />
          <h2 className="text-sm font-semibold">{service.label}</h2>
        </div>
        <button
          onClick={send}
          disabled={loading || blocked}
          className={`${c.button} text-white text-xs font-medium px-3 py-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer`}
        >
          {blocked ? 'Busy (chain)' : loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {blocked && (
        <div className="text-[10px] text-neutral-600">
          Flask runs in a single process in dev — waiting for chain to complete
        </div>
      )}

      <div className="bg-black/30 rounded-lg p-3 font-mono text-xs">
        <span className="text-emerald-400">GET</span>{' '}
        <span className="text-neutral-300">{service.endpoint}/</span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
          {error}
        </div>
      )}

      {response && (
        <div className="flex flex-col gap-1">
          {latency !== null && (
            <span className="text-xs text-neutral-500">{latency}ms</span>
          )}
          <pre className="bg-black/30 rounded-lg p-3 text-xs overflow-auto max-h-48 text-neutral-300">
{JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

interface ChainNode {
  timestamp?: string;
  service?: string;
  next?: ChainNode | null;
  error?: string;
}

function flattenChain(node: ChainNode | null | undefined): ChainNode[] {
  const steps: ChainNode[] = [];
  let current = node;
  while (current) {
    steps.push(current);
    current = current.next;
  }
  return steps;
}

function ChainPanel({ chain, setChain, chainLoading, setChainLoading }: {
  chain: ServiceId[];
  setChain: React.Dispatch<React.SetStateAction<ServiceId[]>>;
  chainLoading: boolean;
  setChainLoading: (v: boolean) => void;
}) {
  const [response, setResponse] = useState<ChainNode | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const c = COLORS.purple;

  function addService(id: ServiceId) {
    setChain((prev) => [...prev, id]);
  }

  function removeAt(index: number) {
    setChain((prev) => prev.filter((_, i) => i !== index));
  }

  async function sendChain() {
    if (chain.length === 0) return;
    setChainLoading(true);
    setError(null);
    setResponse(null);

    const firstId = chain[0];
    const firstService = SERVICES.find((s) => s.id === firstId)!;
    const remaining = chain.slice(1);

    const start = performance.now();
    try {
      const res = await fetch(`${firstService.endpoint}/chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: remaining }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLatency(Math.round(performance.now() - start));
      setResponse(data);
    } catch (e: unknown) {
      setLatency(Math.round(performance.now() - start));
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChainLoading(false);
    }
  }

  const steps = response ? flattenChain(response) : [];

  const serviceColor = (id: string) => {
    const svc = SERVICES.find((s) => s.id === id);
    return svc ? COLORS[svc.color] : COLORS.purple;
  };

  const firstEndpoint = chain.length > 0
    ? SERVICES.find((s) => s.id === chain[0])!.endpoint
    : null;
  const requestBody = chain.length > 0 ? { services: chain.slice(1) } : null;
  const requestEndpoint = firstEndpoint ? `${firstEndpoint}/chain` : null;

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.badge}`} />
          <h2 className="text-sm font-semibold">Chain</h2>
        </div>
        <button
          onClick={sendChain}
          disabled={chainLoading || chain.length === 0}
          className={`${c.button} text-white text-xs font-medium px-3 py-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer`}
        >
          {chainLoading ? 'Sending...' : 'Send Chain'}
        </button>
      </div>

      <div className="flex gap-2">
        {SERVICES.map((svc) => {
          const sc = COLORS[svc.color];
          const flaskLimited = isDev && svc.id === 'flask' && chain.includes('flask');
          return (
            <button
              key={svc.id}
              onClick={() => addService(svc.id)}
              disabled={flaskLimited}
              title={flaskLimited ? 'Flask runs in a single process in dev' : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border bg-neutral-800 text-neutral-400 border-neutral-700 hover:${sc.text} hover:border-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              + {svc.label}
            </button>
          );
        })}
      </div>

      {chain.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          {chain.map((id, i) => {
            const svc = SERVICES.find((s) => s.id === id)!;
            const sc = COLORS[svc.color];
            return (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-neutral-600 text-xs">→</span>}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${sc.bg} ${sc.text} border ${sc.border}`}>
                  {svc.label}
                  <button
                    onClick={() => removeAt(i)}
                    className="hover:text-white ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              </div>
            );
          })}
          <button
            onClick={() => setChain([])}
            className="text-[10px] text-neutral-600 hover:text-neutral-400 ml-1 cursor-pointer"
          >
            clear
          </button>
        </div>
      )}

      <div className="bg-black/30 rounded-lg p-3 font-mono text-xs">
        {requestEndpoint ? (
          <>
            <span className="text-purple-400">POST</span>{' '}
            <span className="text-neutral-300">{requestEndpoint}</span>
            {requestBody && (
              <pre className="text-neutral-500 mt-1">
{JSON.stringify(requestBody, null, 2)}
              </pre>
            )}
          </>
        ) : (
          <span className="text-neutral-600">Click services above to build a chain</span>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">
          {error}
        </div>
      )}

      {steps.length > 0 && (
        <div className="flex flex-col gap-2">
          {latency !== null && (
            <span className="text-xs text-neutral-500">{latency}ms</span>
          )}
          <div className="flex flex-col gap-1.5">
            {steps.map((step, i) => {
              const sc = step.service ? serviceColor(step.service) : COLORS.purple;
              return (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex flex-col items-center pt-1">
                    <span className={`w-2 h-2 rounded-full ${sc.badge}`} />
                    {i < steps.length - 1 && <div className="w-px h-full bg-neutral-700 min-h-3" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${sc.text}`}>{step.service}</span>
                    {step.timestamp && (
                      <span className="text-[10px] text-neutral-600">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    )}
                    {step.error && (
                      <span className="text-[10px] text-red-400">{step.error}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <pre className="bg-black/30 rounded-lg p-3 text-xs overflow-auto max-h-64 text-neutral-300">
{JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [chain, setChain] = useState<ServiceId[]>([]);
  const [chainLoading, setChainLoading] = useState(false);

  const flaskBusy = isDev && chainLoading && chain.includes('flask');

  return (
    <main className="min-h-screen p-6 md:p-10 font-sans max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Service Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SERVICES.map((svc) => (
          <ServicePanel key={svc.id} service={svc} blocked={svc.id === 'flask' && flaskBusy} />
        ))}
      </div>
      <div className="mt-4">
        <ChainPanel chain={chain} setChain={setChain} chainLoading={chainLoading} setChainLoading={setChainLoading} />
      </div>
    </main>
  );
}
