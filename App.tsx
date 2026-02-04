import React, { useState } from 'react';
import { Button } from './components/ui/Button';
import { ExplanationFeed } from './components/ExplanationFeed';
import { GeminiTutor } from './components/GeminiTutor';
import { aesEncrypt, aesDecrypt, generateLog, generateRSAKeys, hybridEncrypt, hybridDecrypt } from './services/cryptoService';
import { ExplanationStep, ProcessingResult, RSAKeyPair } from './types';

type AlgoMode = 'aes' | 'hybrid';

function App() {
  const [isExplainMode, setIsExplainMode] = useState(false);
  const [inputData, setInputData] = useState('');
  const [logs, setLogs] = useState<ExplanationStep[]>([]);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [algoMode, setAlgoMode] = useState<AlgoMode>('aes');
  
  // AES State
  const [password, setPassword] = useState('');

  // Hybrid State
  const [generatedKeys, setGeneratedKeys] = useState<RSAKeyPair | null>(null);
  const [recipientPubKey, setRecipientPubKey] = useState(''); // For Encrypt
  const [userPrivKey, setUserPrivKey] = useState(''); // For Decrypt
  
  // Context for AI Tutor
  const [lastActionContext, setLastActionContext] = useState('');

  // --- HANDLERS ---

  const handleGenerateKeys = async () => {
    setIsProcessing(true);
    try {
      const keys = await generateRSAKeys();
      setGeneratedKeys(keys);
      // Auto-fill for convenience
      setRecipientPubKey(keys.publicKey);
      setUserPrivKey(keys.privateKey);
      setLastActionContext('User generated a new 2048-bit RSA Key Pair.');
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async (action: 'encrypt' | 'decrypt') => {
    if (!inputData.trim()) {
      setResult({ success: false, error: 'Input data cannot be empty.' });
      return;
    }

    // Validation
    if (algoMode === 'aes' && !password) {
      setResult({ success: false, error: 'Password is required for AES operations.' });
      return;
    }
    if (algoMode === 'hybrid') {
      if (action === 'encrypt' && !recipientPubKey) {
        setResult({ success: false, error: 'Recipient Public Key is required to encrypt.' });
        return;
      }
      if (action === 'decrypt' && !userPrivKey) {
        setResult({ success: false, error: 'Private Key is required to decrypt.' });
        return;
      }
    }

    setIsProcessing(true);
    setResult(null);
    const newLogs: ExplanationStep[] = [];
    const logCallback = (title: string, desc: string) => {
      newLogs.push(generateLog(title, desc));
    };

    try {
      let output = '';
      if (algoMode === 'aes') {
        if (action === 'encrypt') {
          output = await aesEncrypt(inputData, password, logCallback);
          setLastActionContext(`User encrypted message with AES-256-GCM.`);
        } else {
          output = await aesDecrypt(inputData, password, logCallback);
          setLastActionContext(`User decrypted AES payload.`);
        }
      } else {
        // Hybrid
        if (action === 'encrypt') {
          output = await hybridEncrypt(inputData, recipientPubKey, logCallback);
          setLastActionContext(`User performed Hybrid Encryption. Data encrypted with AES, AES key encrypted with RSA Public Key.`);
        } else {
          output = await hybridDecrypt(inputData, userPrivKey, logCallback);
          setLastActionContext(`User performed Hybrid Decryption using RSA Private Key.`);
        }
      }
      
      setLogs(isExplainMode ? newLogs : []);
      setResult({ success: true, output });
    } catch (error: any) {
      setResult({ success: false, error: error.message });
      setLastActionContext(`User attempted ${action} (${algoMode}) but failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat">
      
      {/* HEADER */}
      <header className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-cyber-text tracking-tighter flex items-center gap-3">
            <div className="w-3 h-8 bg-cyber-primary"></div>
            CryptoLearn <span className="text-cyber-primary text-sm font-mono border border-cyber-primary/30 px-2 py-0.5 rounded ml-2">v2.0</span>
          </h1>
          <p className="text-cyber-muted text-sm mt-1 ml-6 font-mono">
             Secure Client-Side Cryptography Lab
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center cursor-pointer gap-3 text-sm font-mono text-cyber-muted hover:text-cyber-text transition-colors">
            <span>EXPLAIN_MODE</span>
            <div className="relative inline-block w-10 h-5 align-middle select-none">
              <input 
                type="checkbox" 
                checked={isExplainMode}
                onChange={(e) => setIsExplainMode(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-cyber-panel border border-cyber-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-primary"></div>
            </div>
          </label>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COL: CONFIGURATION */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-cyber-panel/50 glass-panel border border-cyber-border rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-primary to-transparent opacity-50"></div>
            
            <h2 className="text-sm font-bold text-cyber-muted uppercase tracking-widest mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              Configuration
            </h2>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-cyber-input p-1 rounded-lg mb-6">
              <button 
                onClick={() => setAlgoMode('aes')}
                className={`text-sm py-2 rounded-md font-medium transition-all ${algoMode === 'aes' ? 'bg-cyber-panel text-cyber-primary shadow' : 'text-cyber-muted hover:text-cyber-text'}`}
              >
                AES-GCM
              </button>
              <button 
                onClick={() => setAlgoMode('hybrid')}
                className={`text-sm py-2 rounded-md font-medium transition-all ${algoMode === 'hybrid' ? 'bg-cyber-panel text-cyber-primary shadow' : 'text-cyber-muted hover:text-cyber-text'}`}
              >
                Hybrid RSA
              </button>
            </div>

            {/* AES Config */}
            {algoMode === 'aes' && (
              <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                <div>
                  <label className="block text-xs font-mono text-cyber-primary mb-2">SHARED_SECRET (PASSWORD)</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter passphrase..."
                    className="w-full bg-cyber-input border border-cyber-border text-cyber-text rounded p-3 text-sm focus:outline-none focus:border-cyber-primary transition-colors font-mono"
                  />
                  <p className="text-[10px] text-cyber-muted mt-2">
                    Key derived via PBKDF2-SHA256 (100k iterations).
                  </p>
                </div>
              </div>
            )}

            {/* Hybrid Config */}
            {algoMode === 'hybrid' && (
              <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                
                {/* Key Gen Section */}
                <div className="p-4 bg-cyber-input/50 rounded-lg border border-cyber-border border-dashed">
                  <div className="flex justify-between items-center mb-3">
                     <span className="text-xs font-bold text-cyber-text">RSA Keys (2048-bit)</span>
                     <Button variant="ghost" className="!py-1 !px-2 text-[10px]" onClick={handleGenerateKeys} isLoading={isProcessing}>
                       Generate New Pair
                     </Button>
                  </div>
                  {generatedKeys && (
                    <div className="text-[10px] text-cyber-success font-mono bg-cyber-success/10 p-2 rounded border border-cyber-success/20">
                      Keys Generated Successfully!
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyber-primary mb-2">RECIPIENT_PUBLIC_KEY (For Encrypt)</label>
                  <textarea 
                    value={recipientPubKey}
                    onChange={(e) => setRecipientPubKey(e.target.value)}
                    placeholder="-----BEGIN PUBLIC KEY-----"
                    className="w-full h-24 bg-cyber-input border border-cyber-border text-cyber-muted text-[10px] rounded p-2 font-mono focus:outline-none focus:border-cyber-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-cyber-primary mb-2">YOUR_PRIVATE_KEY (For Decrypt)</label>
                  <textarea 
                    value={userPrivKey}
                    onChange={(e) => setUserPrivKey(e.target.value)}
                    placeholder="-----BEGIN PRIVATE KEY-----"
                    className="w-full h-24 bg-cyber-input border border-cyber-border text-cyber-muted text-[10px] rounded p-2 font-mono focus:outline-none focus:border-cyber-primary resize-none"
                  />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COL: WORKSPACE */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Data Input */}
          <section className="bg-cyber-panel/50 glass-panel border border-cyber-border rounded-xl p-6 shadow-xl">
            <h2 className="text-sm font-bold text-cyber-muted uppercase tracking-widest mb-4 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
               Input Stream
            </h2>
            <textarea 
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              placeholder={algoMode === 'aes' ? "Enter text..." : "Enter text to encrypt OR JSON payload to decrypt..."}
              className="w-full h-32 bg-cyber-input border border-cyber-border rounded-lg p-4 text-cyber-text font-mono text-sm focus:outline-none focus:border-cyber-primary transition-all shadow-inner"
            />
            
            <div className="flex gap-4 mt-6">
              <Button 
                className="flex-1 py-4" 
                onClick={() => handleProcess('encrypt')}
                isLoading={isProcessing}
              >
                <span className="flex flex-col items-center leading-none gap-1">
                  <span>ENCRYPT</span>
                  <span className="text-[10px] opacity-60 font-normal">LOCK DATA</span>
                </span>
              </Button>
              <Button 
                className="flex-1" 
                variant="secondary" 
                onClick={() => handleProcess('decrypt')}
                isLoading={isProcessing}
              >
                <span className="flex flex-col items-center leading-none gap-1">
                  <span>DECRYPT</span>
                  <span className="text-[10px] opacity-60 font-normal">UNLOCK DATA</span>
                </span>
              </Button>
            </div>
          </section>

          {/* Output */}
          <section className="bg-cyber-panel/50 glass-panel border border-cyber-border rounded-xl p-6 shadow-xl relative min-h-[200px]">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-cyber-muted uppercase tracking-widest flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Output Buffer
                </h2>
                {result && (
                  <span className={`text-[10px] px-2 py-1 rounded border uppercase font-bold tracking-wider ${result.success ? 'border-cyber-success text-cyber-success bg-cyber-success/10' : 'border-cyber-error text-cyber-error bg-cyber-error/10'}`}>
                    {result.success ? 'Operation Successful' : 'Operation Failed'}
                  </span>
                )}
             </div>

             <div className="relative group">
                <textarea 
                  readOnly 
                  value={result?.success ? result.output : result?.error || ''}
                  placeholder="// Waiting for operation..."
                  className={`w-full h-40 bg-cyber-input border rounded-lg p-4 text-cyber-text font-mono text-xs focus:outline-none shadow-inner resize-y ${
                    result?.error ? 'border-cyber-error text-cyber-error' : 'border-cyber-border'
                  }`}
                />
                {result?.success && (
                  <button 
                    onClick={() => copyToClipboard(result.output!)}
                    className="absolute top-2 right-2 bg-cyber-panel border border-cyber-border text-cyber-muted hover:text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    COPY
                  </button>
                )}
             </div>

             <ExplanationFeed logs={logs} visible={isExplainMode} />
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-12 text-center text-cyber-muted text-xs font-mono opacity-50">
        NO SERVER-SIDE PROCESSING. ALL OPERATIONS ARE LOCAL.
      </footer>

      <GeminiTutor context={lastActionContext} />
    </div>
  );
}

export default App;