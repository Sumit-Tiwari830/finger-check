'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, CheckCircle2, RefreshCcw, ShieldAlert, Zap, Layers, UploadCloud, Activity, Loader2 } from 'lucide-react';

export default function Home() {
  const [isStarted, setIsStarted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [showSeparation, setShowSeparation] = useState(false);

  const formatConfidence = (val: any) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "0.00";
    return (num * 100).toFixed(2);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setShowSeparation(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProgress(0);
    const formData = new FormData();
    formData.append('file', file);

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + Math.floor(Math.random() * 10)));
    }, 200);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
      const res = await axios.post(`${apiUrl}/api/separate-fingerprints`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setResult(res.data);
        setIsProcessing(false);
      }, 800);
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
    <div className="relative min-h-screen text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden font-sans flex flex-col">

      {/* Top Navbar */}
      <header className="absolute top-0 left-0 w-full px-8 py-6 flex justify-between items-center z-50">
        <div className="text-2xl font-black text-white tracking-tighter">
          FING<span className="text-cyan-400">CHECK</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] md:text-xs font-mono tracking-widest text-slate-400 uppercase">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
          Neural Link Online
        </div>
      </header>

      {/* Premium Dark Mesh Background */}
      <div className="fixed inset-0 z-0 bg-[#050505] pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-6xl mx-auto px-6 py-28">
        <AnimatePresence mode="wait">
          {!isStarted ? (
            /* PHASE 0: LANDING */
            <motion.div
              key="landing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative group mb-10 mt-8">
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative flex items-center justify-center w-40 h-40 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
                  <Fingerprint className="text-cyan-400 w-20 h-20" strokeWidth={1.5} />
                </div>
              </div>

              <h1 className="text-7xl md:text-8xl font-black mb-6 tracking-tighter text-white drop-shadow-md">
                Fing<span className="text-cyan-400">Check</span>
              </h1>

              <p className="text-slate-400 mb-12 text-lg tracking-widest uppercase font-medium text-center">Neural Overlap Detection Engine</p>
              <button
                onClick={() => setIsStarted(true)}
                className="group relative px-12 py-5 bg-white text-black rounded-full font-bold text-lg overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
              >
                <span className="relative z-10 flex items-center gap-2 uppercase tracking-widest">
                  Initialize System <Zap size={18} className="group-hover:text-cyan-500 transition-colors" />
                </span>
              </button>
            </motion.div>
          ) : (
            <>
              {/* PHASE 1: UPLOAD */}
              {!isProcessing && !result && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40, filter: 'blur(10px)' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="w-full max-w-md flex flex-col items-center mt-8"
                >
                  <div className="w-full p-1 rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent shadow-2xl">
                    <div className="w-full p-8 rounded-[2.4rem] bg-[#0a0a0a]/90 backdrop-blur-3xl border border-white/5 flex flex-col items-center">
                      <div className="w-full flex justify-between items-center mb-8 px-2">
                        <h2 className="text-xl font-bold text-white tracking-wide">Input Scanner</h2>
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-full">
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div> Ready
                        </span>
                      </div>

                      <div
                        {...getRootProps()}
                        className={`w-full aspect-[3/4] mb-6 rounded-3xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group
                          ${isDragActive ? 'border-cyan-400 bg-cyan-400/5' : 'border-white/10 hover:border-cyan-500/50 hover:bg-white/[0.02]'}`}
                      >
                        <input {...getInputProps()} />
                        {preview ? (
                          <>
                            <img src={preview} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Preview" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                              <span className="bg-black/50 text-white backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium border border-white/10 flex items-center gap-2">
                                <RefreshCcw size={14} /> Replace Image
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-4 text-slate-400 group-hover:text-cyan-400 transition-colors">
                            <UploadCloud size={48} strokeWidth={1} />
                            <p className="text-sm font-medium tracking-wide">Drag & Drop or Click to Select</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProcess();
                        }}
                        disabled={!file}
                        className={`w-full py-5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all duration-300
                          ${file ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)]' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                      >
                        <Activity size={20} /> Run Neural Diagnostics
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PHASE 2: PROCESSING */}
              {isProcessing && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex flex-col items-center py-20"
                >
                  <div className="relative w-64 h-64 mb-12 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                      <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/5" />
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="transparent"
                        strokeLinecap="round"
                        strokeDasharray={754}
                        strokeDashoffset={754 - (754 * progress) / 100}
                        className="text-cyan-400 transition-all duration-300 ease-out"
                      />
                    </svg>
                    <div className="flex flex-col items-center">
                      <span className="text-6xl font-black text-white">{progress}</span>
                      <span className="text-cyan-500 font-bold text-sm tracking-[0.2em]">%</span>
                    </div>
                  </div>
                  <p className="text-cyan-400 font-mono tracking-[0.3em] uppercase text-sm animate-pulse flex items-center gap-3">
                    <Loader2 size={16} className="animate-spin" /> Analyzing Biometric Data
                  </p>
                </motion.div>
              )}

              {/* PHASE 3: RESULTS */}
              {result && !isProcessing && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-5xl"
                >
                  {result.status === "warning" ? (
                    /* WARNING UI */
                    <div className="bg-red-950/20 border border-red-500/20 rounded-[2rem] p-12 text-center backdrop-blur-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                      <div className="inline-flex p-5 bg-red-500/10 rounded-full mb-6 border border-red-500/20">
                        <ShieldAlert size={48} className="text-red-400" />
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Analysis Warning</h2>
                      <p className="text-lg text-slate-400 mb-10 max-w-lg mx-auto">"{result.message}"</p>
                      <button onClick={resetScanner} className="px-8 py-4 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all border border-white/5">
                        Acknowledge & Reset
                      </button>
                    </div>
                  ) : (
                    /* SUCCESS UI */
                    <div className="space-y-6 w-full">
                      <AnimatePresence mode="wait">
                        {!showSeparation ? (
                          /* STEP A: OVERLAP VIEW */
                          <motion.div
                            key="stepA"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-[#0a0a0a]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-2xl shadow-2xl"
                          >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-white/5 gap-4">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                                  <CheckCircle2 className="text-cyan-400" size={28} />
                                </div>
                                <div>
                                  <h2 className="text-2xl font-bold text-white tracking-tight">Overlap Detected</h2>
                                  <p className="text-slate-500 text-sm mt-1">Initial diagnostic scan complete.</p>
                                </div>
                              </div>
                              <span className="bg-cyan-500/10 text-cyan-400 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase border border-cyan-500/20">
                                System Status: Optimal
                              </span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                              <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                  <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Base Scan Map</p>
                                </div>
                                <div className="aspect-square bg-black/50 rounded-3xl border border-white/5 overflow-hidden relative shadow-inner p-4">
                                  <img src={result.overlap_base64 || result.fp1_base64} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]" />
                                </div>
                              </div>
                              <div className="flex flex-col justify-center space-y-8">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                  <p className="text-sm text-slate-400 uppercase tracking-widest mb-2 font-bold">Diagnostic Output</p>
                                  <p className="text-xl font-medium text-white leading-relaxed">"{result.message}"</p>
                                </div>
                                <div className="flex flex-col gap-4">
                                  <button
                                    onClick={() => setShowSeparation(true)}
                                    className="w-full py-5 bg-cyan-500 text-black rounded-xl font-bold text-lg hover:bg-cyan-400 transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]"
                                  >
                                    <Layers size={22} /> Isolate Individual Layers
                                  </button>
                                  <button
                                    onClick={resetScanner}
                                    className="w-full py-5 bg-transparent text-slate-300 rounded-xl font-bold hover:bg-white/5 transition-all border border-white/10 flex items-center justify-center gap-2"
                                  >
                                    <RefreshCcw size={18} /> Run New Scan
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          /* STEP B: SEPARATED RESULTS */
                          <motion.div
                            key="stepB"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[#0a0a0a]/80 border border-cyan-500/20 rounded-[2.5rem] p-8 md:p-12 backdrop-blur-2xl shadow-[0_0_50px_rgba(34,211,238,0.05)]"
                          >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                              <div>
                                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Isolated Signatures</h2>
                                <p className="text-cyan-500 font-mono text-sm tracking-[0.2em] uppercase">Neural Extraction Successful</p>
                              </div>
                              <div className="md:text-right bg-white/5 px-6 py-4 rounded-2xl border border-white/5">
                                <p className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-1">Model Confidence</p>
                                <p className="text-4xl font-black text-white tracking-tighter">
                                  {formatConfidence(result.confidence)}<span className="text-cyan-500 text-2xl">%</span>
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-2 bg-white/[0.02] rounded-3xl border border-white/5">
                                <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                                  <p className="text-sm font-bold text-slate-300 tracking-wide">Primary Subject</p>
                                  <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,1)]"></span>
                                </div>
                                <div className="aspect-[3/4] bg-black/40 rounded-b-[1.3rem] overflow-hidden p-6 relative">
                                  <img src={result.fp1_base64} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                                </div>
                              </motion.div>

                              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-2 bg-white/[0.02] rounded-3xl border border-white/5">
                                <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                                  <p className="text-sm font-bold text-slate-300 tracking-wide">Secondary Subject</p>
                                  <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)]"></span>
                                </div>
                                <div className="aspect-[3/4] bg-black/40 rounded-b-[1.3rem] overflow-hidden p-6 relative">
                                  <img src={result.fp2_base64} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                                </div>
                              </motion.div>
                            </div>

                            <button
                              onClick={resetScanner}
                              className="w-full py-5 bg-white/5 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-3"
                            >
                              <RefreshCcw size={20} /> Initialize New Diagnostics
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}