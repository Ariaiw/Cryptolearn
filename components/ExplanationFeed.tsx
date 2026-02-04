import React, { useEffect, useRef } from 'react';
import { ExplanationStep } from '../types';

interface ExplanationFeedProps {
  logs: ExplanationStep[];
  visible: boolean;
}

export const ExplanationFeed: React.FC<ExplanationFeedProps> = ({ logs, visible }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && logs.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, visible]);

  if (!visible || logs.length === 0) return null;

  return (
    <div className="mt-6 border-t border-cyber-border pt-4 animate-fadeIn">
      <h3 className="text-xs font-bold text-cyber-primary mb-3 uppercase tracking-widest flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyber-primary animate-pulse"></span>
        Live Execution Log
      </h3>
      <div className="space-y-3 font-mono text-xs">
        {logs.map((log, index) => (
          <div 
            key={`${log.timestamp}-${index}`}
            className="bg-cyber-input/50 border-l-2 border-cyber-primary pl-3 py-2 animate-[fadeIn_0.3s_ease-in-out]"
          >
            <span className="block font-bold text-cyber-text mb-1">> {log.title}</span>
            <span className="text-cyber-muted">{log.description}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};