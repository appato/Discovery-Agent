'use client';

import Image from 'next/image';
import type { AgentUiConfig } from '@/lib/agent-ui';

interface SessionSidebarProps {
  config: AgentUiConfig;
  metadata: Record<string, unknown>;
  coverage: Record<string, number>;
  status: string;
}

export function SessionSidebar({ config, metadata, coverage, status }: SessionSidebarProps) {
  const primaryMetadata = metadata[config.metadata.primaryKey];
  const secondaryMetadata = metadata[config.metadata.secondaryKey];
  const displayName = typeof primaryMetadata === 'string' && primaryMetadata.trim()
    ? primaryMetadata
    : config.metadata.primaryFallback;
  const displaySecondary = typeof secondaryMetadata === 'string' && secondaryMetadata.trim()
    ? secondaryMetadata
    : config.metadata.secondaryFallback;
  const segments = config.coverageSegments.map((segment) => ({
    ...segment,
    value: coverage[segment.key] || 0,
  }));
  const totalPct = segments.length > 0
    ? Math.round((segments.reduce((sum, segment) => sum + segment.value, 0) / segments.length) * 100)
    : 0;

  return (
    <aside className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-lg bg-gray-900 p-1 flex items-center justify-center md:w-12 md:h-12">
            <Image src="/appato-logo.png" alt={`${config.agentName} icon`} className="w-8 h-8 md:w-10 md:h-10" width={32} height={32} />
          </div>
          <div className="flex flex-col items-start">
            <h2 className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Appato</h2>
            <h2 className="text-xl font-semibold text-gray-900">{config.agentName}</h2>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          {config.welcomeCopy}
          <br />
          <br />
          You should expect to spend around 15-20 minutes providing detailed answers. The more thorough you are, the better the final brief will be!
        </p>
      </div>

      <div className="px-5 py-4 border-b border-gray-100">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">{config.metadata.primaryLabel}</div>
        <h3 className="text-base font-semibold text-gray-900 truncate">{displayName}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{displaySecondary}</p>
      </div>

      <div className="px-5 py-4 border-b border-gray-100">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">{config.coverageHeading}</div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
          {segments.map((segment) => (
            <div
              key={segment.key}
              className={`${segment.colorClass} transition-all duration-500`}
              style={{ width: `${Math.max(segment.value * 100, 2)}%` }}
            />
          ))}
        </div>
        <div className="mt-2.5 space-y-1.5">
          {segments.map((segment) => (
            <div key={segment.key} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${segment.colorClass}`} />
                <span className="text-gray-600">{segment.label}</span>
              </div>
              <span className="text-gray-400 tabular-nums">
                {Math.round(segment.value * 100)}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-600">Overall</span>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">{totalPct}%</span>
        </div>
      </div>

      <div className="px-5 py-4 flex-1">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Session Status</div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'approved'
                ? 'bg-green-500'
                : status === 'brief_ready'
                  ? 'bg-amber-400'
                  : 'bg-blue-400 animate-pulse'
            }`}
          />
          <span className="text-sm text-gray-700 capitalize">
            {status === 'in_discovery'
              ? 'In Discovery'
              : status === 'brief_ready'
                ? 'Brief Ready'
                : 'Approved'}
          </span>
        </div>
      </div>
    </aside>
  );
}
