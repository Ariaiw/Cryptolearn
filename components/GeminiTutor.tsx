import React, { useState } from 'react';
import { askCryptoTutor } from '../services/geminiService';
import { Button } from './ui/Button';

interface GeminiTutorProps {
  context: string;
}

export const GeminiTutor: React.FC<GeminiTutorProps> = ({ context }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setAnswer('');
    try {
      const result = await askCryptoTutor(question, context);
      setAnswer(result);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-cyber-panel border border-cyber-primary/50 text-cyber-primary p-3 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all z-50 flex items-center gap-2 group"
        title="Ask AI Tutor"
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-primary"></span>
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-48px)] bg-cyber-panel/95 backdrop-blur-md border border-cyber-border rounded-xl shadow-2xl z-50 flex flex-col max-h-[600px] animate-[fadeIn_0.2s_ease-out] overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-cyber-border bg-cyber-bg/50">
        <h3 className="font-bold text-cyber-primary flex items-center gap-2 font-mono text-sm">
          <span className="text-xl">AI_TUTOR</span> v1.0
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-cyber-muted hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-grow space-y-4">
        {!answer && !loading && (
          <div className="text-cyber-muted text-sm text-center py-4 font-mono">
            // Awaiting query...<br/>
            // Context loaded.
          </div>
        )}
        
        {answer && (
          <div className="bg-cyber-input/80 p-3 rounded border border-cyber-border text-sm text-cyber-text leading-relaxed">
             <div className="font-bold text-[10px] text-cyber-primary mb-2 uppercase tracking-wider">Analysis Result</div>
             {answer}
          </div>
        )}

        {loading && (
           <div className="flex justify-center py-4">
             <div className="animate-pulse text-cyber-primary text-sm font-mono">> Processing Query...</div>
           </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="p-3 border-t border-cyber-border bg-cyber-bg/50 flex gap-2">
        <input 
          type="text" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a crypto question..."
          className="flex-grow bg-cyber-input border border-cyber-border text-cyber-text text-sm rounded px-3 py-2 focus:outline-none focus:border-cyber-primary font-mono placeholder-cyber-muted/50"
        />
        <Button type="submit" variant="primary" disabled={loading} className="!py-2 !px-3 text-xs">
          SEND
        </Button>
      </form>
    </div>
  );
};