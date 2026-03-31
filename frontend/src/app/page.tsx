'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Fingerprint, Loader2, CheckCircle2, Upload, RefreshCcw, ShieldAlert, ShieldCheck, Zap, Layers } from 'lucide-react';

export default function Home() {
  const [isStarted, setIsStarted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [showSeparation, setShowSeparation] = useState(false); // New state for Step B

  const formatConfidence = (val: any) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "0.00";
    return (num * 100).toFixed(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      setResult(null);
      setShowSeparation(false);
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
    setShowSeparation(false);
  };

  return (
    <div className="relative min-h-screen pt-24 pb-12 px-6 flex items-center justify-center">
      {/* Background */}
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg')` }}>
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        {!isStarted ? (
          /* PHASE 0: LANDING */
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-1000">
            <div className="relative group mb-8">
              <div className="absolute -inset-1 bg-cyan-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
              <div className="relative flex items-center justify-center w-32 h-32 bg-black border border-white/10 rounded-full">
                <span className="text-4xl font-black text-white tracking-tighter">F<span className="text-cyan-500 text-5xl">C</span></span>
              </div>
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-4 tracking-tighter text-white uppercase italic text-center">Fing<span className="text-cyan-500">Check</span></h1>
            <button onClick={() => setIsStarted(true)} className="px-12 py-5 bg-white text-black rounded-full font-black text-xl hover:scale-105 transition-all shadow-2xl uppercase tracking-widest">Initialize System</button>
          </div>
        ) : (
          <>
            {/* PHASE 1: UPLOAD */}
            {!isProcessing && !result && (
              <div className="flex flex-col items-center animate-in fade-in duration-700 w-full max-w-sm">
                <h2 className="text-3xl font-black mb-8 text-white italic uppercase tracking-widest text-center">Scanner <span className="text-cyan-500">Ready</span></h2>
                <div className="w-full p-10 rounded-[2.5rem] border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl flex flex-col items-center">
                  <div className="w-full aspect-[3/4] mb-8 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden">
                    {preview ? <img src={preview} className="w-full h-full object-cover" /> : <Fingerprint size={64} className="text-white/20 animate-pulse" />}
                  </div>
                  <label className="w-full mb-4 cursor-pointer bg-white text-black py-4 rounded-xl font-black text-center uppercase text-sm hover:bg-cyan-400 transition-all">
                    {file ? "Change Sample" : "Select Fingerprint"}
                    <input type="file" hidden onChange={handleFileChange} accept="image/*" />
                  </label>
                  {file && (
                    <button onClick={handleProcess} className="w-full bg-cyan-600 text-white py-4 rounded-xl font-black text-lg hover:bg-cyan-500 transition-all flex items-center justify-center gap-2">
                      <Zap size={20} /> Detect Overlap
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* PHASE 2: PROCESSING */}
            {isProcessing && (
              <div className="flex flex-col items-center py-20 animate-in fade-in">
                <div className="relative w-48 h-48 mb-8">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={502} strokeDashoffset={502 - (502 * progress) / 100} className="text-cyan-500 transition-all duration-300" />
                  </svg>
                  <div className="absolute inset-0 flex flex-center items-center justify-center font-black text-4xl text-white italic">{progress}%</div>
                </div>
                <p className="text-cyan-400 font-mono tracking-widest uppercase animate-pulse">Running Neural Scan...</p>
              </div>
            )}

            {/* PHASE 3: RESULTS */}
            {result && (
              <div className="w-full max-w-5xl animate-in zoom-in-95 duration-500">
                {result.status === "warning" ? (
                  /* WARNING UI */
                  <div className="bg-black/60 border border-red-500/30 rounded-[3rem] p-12 text-center backdrop-blur-3xl">
                    <div className="inline-flex p-6 bg-red-500/10 rounded-full mb-6">
                      <ShieldAlert size={64} className="text-red-500" />
                    </div>
                    <h2 className="text-4xl font-black text-white mb-4 uppercase italic">Analysis Warning</h2>
                    <p className="text-xl text-gray-400 mb-10 font-medium">"{result.message}"</p>
                    <button onClick={resetScanner} className="px-10 py-4 bg-white text-black rounded-full font-black uppercase hover:bg-red-500 hover:text-white transition-all">Reset Scanner</button>
                  </div>
                ) : (
                  /* SUCCESS UI */
                  <div className="space-y-6">
                    {!showSeparation ? (
                      /* STEP A: OVERLAP VIEW */
                      <div className="bg-black/60 border border-cyan-500/20 rounded-[3rem] p-10 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                          <div className="flex items-center gap-4">
                            <CheckCircle2 className="text-green-500" size={32} />
                            <h2 className="text-3xl font-black text-white uppercase italic">Overlap Detected</h2>
                          </div>
                          <span className="bg-green-500/20 text-green-400 px-4 py-1 rounded-full text-xs font-bold border border-green-500/30">System Success</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-4">
                            <p className="text-cyan-500 text-xs font-bold uppercase tracking-widest">Overlap Region Mapping</p>
                            <div className="aspect-square bg-gray-900 rounded-3xl border border-white/10 overflow-hidden group relative">
                              {/* Assuming backend returns result.overlap_base64 */}
                              <img src={result.overlap_base64 || result.fp1_base64} className="w-full h-full object-contain" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                            </div>
                          </div>
                          <div className="flex flex-col justify-center">
                            <p className="text-2xl font-bold text-white mb-6">"{result.message}"</p>
                            <div className="flex flex-col gap-4">
                              <button onClick={() => setShowSeparation(true)} className="w-full py-5 bg-cyan-500 text-white rounded-2xl font-black text-lg hover:bg-cyan-400 transition-all flex items-center justify-center gap-3">
                                <Layers size={24} /> Generate Separate Layers
                              </button>
                              <button onClick={resetScanner} className="w-full py-4 bg-white/5 text-white rounded-2xl font-bold hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2">
                                <RefreshCcw size={18} /> New Scan
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* STEP B: SEPARATED RESULTS */
                      <div className="bg-black/60 border border-green-500/20 rounded-[3rem] p-10 backdrop-blur-3xl animate-in zoom-in-95 duration-700">
                        <div className="flex justify-between items-end mb-10">
                          <div>
                            <h2 className="text-4xl font-black text-white uppercase italic mb-2 tracking-tighter">Layer Separation</h2>
                            <p className="text-gray-500 font-mono text-sm tracking-[0.3em]">Neural Link: Stable</p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Confidence Score</p>
                            <p className="text-5xl font-black text-cyan-500 italic tracking-tighter">{formatConfidence(result.confidence)}%</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center">
                            <p className="text-xs uppercase font-bold text-cyan-500 mb-4 tracking-widest">Isolated Layer Alpha</p>
                            <div className="aspect-[3/4] bg-black rounded-xl overflow-hidden border border-white/10">
                              <img src={result.fp1_base64} className="w-full h-full object-contain" />
                            </div>
                          </div>
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/5 text-center">
                            <p className="text-xs uppercase font-bold text-cyan-500 mb-4 tracking-widest">Isolated Layer Beta</p>
                            <div className="aspect-[3/4] bg-black rounded-xl overflow-hidden border border-white/10">
                              <img src={result.fp2_base64} className="w-full h-full object-contain" />
                            </div>
                          </div>
                        </div>

                        <button onClick={resetScanner} className="w-full py-5 bg-white text-black rounded-2xl font-black text-xl hover:scale-[1.01] transition-all uppercase tracking-tighter flex items-center justify-center gap-3">
                          <RefreshCcw size={24} /> Reset Diagnostic System
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}