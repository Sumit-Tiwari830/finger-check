'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Fingerprint, Loader2, CheckCircle2, Upload, RefreshCcw, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  // Helper to safely format confidence score
  const formatConfidence = (val: any) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "0.00";
    return (num * 100).toFixed(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Generate a persistent URL for the preview
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + 5));
    }, 150);

    try {
      // Pointing to your FastAPI endpoint
      const res = await axios.post('http://127.0.0.1:8000/api/separate-fingerprints', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        setResult(res.data);
        setIsProcessing(false);
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setIsProcessing(false);
      alert("System Error: Ensure backend server is running.");
    }
  };

  const resetScanner = () => {
    setResult(null);
    setFile(null);
    setPreview(null);
    setProgress(0);
  };

  return (
    <div className="relative min-h-screen pt-24 pb-12 px-6 flex items-center justify-center">
      {/* Background Layer */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg')` }}
      >
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">

        {/* PHASE 1: INITIAL UPLOAD VIEW */}
        {!isProcessing && !result && (
          <div className="flex flex-col items-center animate-in fade-in duration-700">
            <h1 className="text-5xl font-black mb-8 tracking-tighter italic text-white text-center uppercase">
              System <span className="text-cyan-500">Scanner</span>
            </h1>

            <div className="w-full max-w-sm min-h-[550px] p-10 rounded-[2.5rem] border-2 border-dashed border-white/10 bg-black/50 backdrop-blur-xl flex flex-col items-center justify-between shadow-2xl">
              <div className="w-full flex flex-col items-center">
                {preview ? (
                  <div className="relative w-full aspect-[3/4] group">
                    <img src={preview} className="w-full h-full object-cover rounded-2xl border border-cyan-500/50 shadow-2xl" alt="Preview" />
                    <div className="absolute inset-0 scanner-laser rounded-2xl"></div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-20">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                      <Fingerprint size={48} className="text-cyan-500/40 animate-pulse" />
                    </div>
                    <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em] text-center">Awaiting Data Input</p>
                  </div>
                )}
              </div>

              <div className="w-full space-y-4 mt-8">
                <label className="flex items-center justify-center w-full cursor-pointer bg-white text-black py-4 rounded-2xl font-black hover:bg-cyan-400 transition-all uppercase text-xs tracking-widest shadow-lg">
                  {file ? "Change Sample" : "Select Fingerprint"}
                  <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                </label>

                {file && (
                  <button onClick={handleProcess} className="w-full bg-cyan-600 hover:bg-cyan-500 py-4 rounded-2xl font-black text-lg transition-all shadow-lg text-white uppercase italic tracking-tighter">
                    Run Analysis
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: PROCESSING ANIMATION */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in">
            <div className="relative w-56 h-56 mb-12">
              <svg className="w-full h-full -rotate-90">
                <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                <circle cx="112" cy="112" r="100" stroke="currentColor" strokeWidth="8" fill="transparent"
                  strokeDasharray={628} strokeDashoffset={628 - (628 * progress) / 100}
                  className="text-cyan-500 transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black italic text-white">{progress}%</span>
                <Loader2 className="animate-spin text-cyan-400 mt-2" size={24} />
              </div>
            </div>
            <p className="text-cyan-400 font-mono tracking-[0.5em] uppercase animate-pulse text-[10px]">Processing Ridge Layers</p>
          </div>
        )}

        {/* PHASE 3: RESULT VIEW */}
        {result && (
          <div className="w-full max-w-5xl animate-in zoom-in-95 duration-500">
            {result.status === "warning" ? (
              /* --- WARNING STATE UI --- */
              <div className="glass-panel p-10 rounded-[3rem] border-amber-500/30 shadow-2xl">
                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <ShieldAlert className="text-amber-500" size={40} />
                    <div>
                      <h2 className="text-4xl font-black tracking-tighter italic text-amber-500 uppercase">Analysis Warning</h2>
                      <p className="text-gray-500 text-[10px] uppercase tracking-widest">Single Source Integrity Verified</p>
                    </div>
                  </div>
                  {/* Confidence is HIDDEN here as requested */}
                </div>

                <div className="flex flex-col md:flex-row gap-12 items-center justify-center">
                  <div className="w-64 aspect-[3/4] rounded-2xl border-2 border-white/10 overflow-hidden shadow-2xl bg-gray-900">
                    <img src={preview!} className="w-full h-full object-cover" alt="Input Sample" />
                  </div>
                  <div className="max-w-md space-y-8 text-center md:text-left">
                    <div className="p-8 bg-white/5 rounded-[2rem] border border-white/10 text-white italic">
                      <p className="text-2xl font-bold leading-tight">"{result.message}"</p>
                    </div>
                    <button onClick={resetScanner} className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-amber-500 transition-all uppercase tracking-widest text-sm shadow-xl">
                      Restart Scanner
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* --- SUCCESS STATE UI --- */
              <div className="glass-panel p-10 rounded-[3rem] border-cyan-500/20 shadow-2xl">
                <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <ShieldCheck className="text-green-500" size={40} />
                    <h2 className="text-4xl font-black tracking-tighter italic text-white uppercase">Detection Success</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Confidence</p>
                    <p className="text-3xl font-black text-cyan-400">{formatConfidence(result.confidence)}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Source Input</p>
                    <div className="w-full aspect-[3/4] rounded-3xl border border-white/10 overflow-hidden bg-gray-900">
                      <img src={preview!} className="w-full h-full object-cover grayscale opacity-40" alt="Source" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-[10px] uppercase text-cyan-500 font-bold tracking-widest">Component Alpha</p>
                    <div className="w-full aspect-[3/4] rounded-3xl border border-cyan-500/30 overflow-hidden bg-black p-4 flex items-center justify-center">
                      <img src={result.fp1_base64} className="max-h-full object-contain" alt="Fingerprint 1" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-[10px] uppercase text-cyan-500 font-bold tracking-widest">Component Beta</p>
                    <div className="w-full aspect-[3/4] rounded-3xl border border-cyan-500/30 overflow-hidden bg-black p-4 flex items-center justify-center">
                      <img src={result.fp2_base64} className="max-h-full object-contain" alt="Fingerprint 2" />
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-6">
                  <p className="text-gray-400 italic text-sm">“{result.message}”</p>
                  <button onClick={resetScanner} className="flex items-center gap-2 px-12 py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-400 transition-all uppercase text-xs tracking-widest">
                    <RefreshCcw size={16} /> New Scan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}