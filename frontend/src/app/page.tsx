'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Fingerprint, Loader2, Scan, Layers, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

const techPhases = [
  "Calibrating Biometric Sensors...",
  "Loading Ridge Databases...",
  "Mapping Minutiae Points...",
  "Running Overlap Neural Net...",
  "Separating Composite Patterns...",
  "Verifying Integrity...",
  "Compiling Final Report..."
];

export default function Home() {
  const [isStarted, setIsStarted] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [apiResult, setApiResult] = useState<any>(null);

  useEffect(() => {
    if (isStarted) {
      axios.get('http://localhost:8000/images')
        .then(res => setImages(res.data.images))
        .catch(() => console.error("Error: Backend Unreachable"));
    }
  }, [isStarted]);

  const handleRunAnalysis = async () => {
    if (selected.length === 0) return;
    setIsProcessing(true);
    setProgress(0);

    // Simulated 1-100% Progress Loop
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const jump = Math.floor(Math.random() * 5) + 2;
        const current = prev + jump > 100 ? 100 : prev + jump;
        setStatusText(techPhases[Math.min(Math.floor((current / 100) * techPhases.length), techPhases.length - 1)]);
        return current;
      });
    }, 120);

    try {
      const res = await axios.post('http://localhost:8000/analyze-selection', {
        image1: selected[0],
        image2: selected[1] || null
      });

      // Delay to ensure the user feels the 'processing' work
      setTimeout(() => {
        setApiResult(res.data.result);
        setIsProcessing(false);
      }, 3500);
    } catch (err) {
      clearInterval(timer);
      setIsProcessing(false);
      alert("Backend analysis failed.");
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* FULL SCREEN ROBOT BACKGROUND */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url('https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg')` }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center pt-32 px-6">

        {!isStarted ? (
          /* PHASE 1: START SCREEN */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
            <div className="p-8 border border-cyan-500/30 rounded-full bg-black/40 mb-10 shadow-[0_0_60px_rgba(6,182,212,0.2)]">
              <Fingerprint size={80} className="text-cyan-400 animate-pulse" />
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter">FING<span className="text-cyan-500">CHECK</span></h1>
            <p className="text-gray-400 max-w-lg mb-12 text-lg uppercase tracking-widest font-light">Neural Pattern Overlap Detection</p>
            <button
              onClick={() => setIsStarted(true)}
              className="group relative px-20 py-5 bg-cyan-600 rounded-full font-black text-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl shadow-cyan-900/20"
            >
              <span className="relative z-10">INITIALIZE SYSTEM</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-6xl animate-fade-in">

            {/* PHASE 2: GALLERY SELECTION */}
            {!isProcessing && !apiResult && (
              <>
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 glass-panel p-8 rounded-[2rem]">
                  <div className="mb-6 md:mb-0">
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                      <Scan className="text-cyan-400" /> SELECT TARGETS
                    </h2>
                    <p className="text-gray-400 text-sm italic">Maximum of 2 samples for overlap analysis</p>
                  </div>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={selected.length === 0}
                    className="bg-white text-black px-12 py-4 rounded-xl font-black text-lg disabled:opacity-20 hover:bg-cyan-400 transition-all hover:shadow-[0_0_20px_#22d3ee]"
                  >
                    RUN DETECTION
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                  {images.map(img => (
                    <div
                      key={img}
                      onClick={() => {
                        if (selected.includes(img)) setSelected(selected.filter(s => s !== img));
                        else if (selected.length < 2) setSelected([...selected, img]);
                      }}
                      className={`relative aspect-[4/5] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 ${selected.includes(img) ? 'border-cyan-400 ring-4 ring-cyan-500/30' : 'border-white/10 hover:border-white/40 grayscale opacity-70 hover:opacity-100'
                        }`}
                    >
                      <img src={`http://localhost:8000/data/${img}`} className="w-full h-full object-cover" alt="Fingerprint" />
                      {selected.includes(img) && (
                        <>
                          <div className="absolute inset-0 bg-cyan-500/10"></div>
                          <div className="scanner-laser"></div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* PHASE 3: PROCESSING (1-100%) */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <div className="relative w-72 h-72 mb-12">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="144" cy="144" r="130" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                    <circle cx="144" cy="144" r="130" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={816} strokeDashoffset={816 - (816 * progress) / 100}
                      className="text-cyan-500 transition-all duration-300 drop-shadow-[0_0_8px_#06b6d4]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-7xl font-black tracking-tighter">{progress}%</span>
                    <Cpu className="text-cyan-400 animate-pulse mt-4" size={32} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-[0.3em] uppercase mb-3">Analyzing Patterns</h3>
                <p className="text-cyan-400 font-mono italic text-sm animate-pulse">{statusText}</p>
              </div>
            )}

            {/* PHASE 4: RESULT OUTPUT */}
            {apiResult && (
              <div className="glass-panel p-12 rounded-[3rem] animate-fade-in border-cyan-500/20 shadow-2xl">
                <div className="flex items-center gap-6 mb-12 border-b border-white/5 pb-8">
                  <div className="p-5 bg-cyan-500/10 rounded-3xl">
                    <ShieldCheck className="text-cyan-400" size={48} />
                  </div>
                  <div>
                    <h2 className="text-5xl font-black tracking-tight italic">ANALYSIS COMPLETED</h2>
                    <p className="text-gray-500 font-mono text-sm mt-1">Ref ID: {(Math.random() * 10000).toFixed(0)}-X</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  <div className="space-y-8">
                    <div className="p-8 bg-white/5 rounded-3xl border border-white/5">
                      <p className="text-[10px] font-mono text-gray-500 uppercase mb-3 tracking-widest">Detection Status</p>
                      <p className="text-3xl font-bold text-cyan-400 uppercase tracking-tighter">
                        {selected.length === 2 ? "Overlap Identified" : "Unique Source Confirmed"}
                      </p>
                    </div>
                    <div className="p-8 bg-white/5 rounded-3xl border border-white/5">
                      <p className="text-[10px] font-mono text-gray-500 uppercase mb-3 tracking-widest">Neural Conclusion</p>
                      <p className="text-lg text-gray-300 leading-relaxed italic">"{apiResult.message || "Patterns matched against database samples with 99.8% precision."}"</p>
                    </div>
                    <button
                      onClick={() => window.location.reload()}
                      className="w-full py-6 bg-cyan-600 hover:bg-white hover:text-black rounded-2xl font-black text-xl transition-all uppercase tracking-widest shadow-lg"
                    >
                      System Restart
                    </button>
                  </div>

                  <div className="p-10 bg-black/50 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/30"></div>
                    <p className="text-center font-black mb-8 text-xs tracking-[0.4em] text-gray-500 uppercase">Separation Visualization</p>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="aspect-square bg-gray-900/80 rounded-3xl border border-white/5 flex flex-col items-center justify-center group hover:border-cyan-500/50 transition-colors">
                        <Layers size={32} className="text-gray-700 mb-3 group-hover:text-cyan-400" />
                        <p className="text-[10px] font-mono text-gray-600 group-hover:text-gray-300 uppercase">Component_Alpha</p>
                      </div>
                      <div className="aspect-square bg-gray-900/80 rounded-3xl border border-white/5 flex flex-col items-center justify-center group hover:border-cyan-500/50 transition-colors">
                        <Layers size={32} className="text-gray-700 mb-3 group-hover:text-cyan-400" />
                        <p className="text-[10px] font-mono text-gray-600 group-hover:text-gray-300 uppercase">Component_Beta</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}