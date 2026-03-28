import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {/* Unified System Header */}
        <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
            <div className="flex items-center gap-1 group cursor-default">
              <span className="text-cyan-400 font-black text-2xl tracking-tighter group-hover:text-cyan-300 transition-colors">FING</span>
              <span className="text-white font-bold text-2xl tracking-tighter">CHECK</span>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.2em]">System Online</span>
              </div>
              <span className="text-[10px] font-mono text-gray-600">v1.0.4-stable</span>
            </div>
          </div>
        </header>

        <main>{children}</main>
      </body>
    </html>
  );
}