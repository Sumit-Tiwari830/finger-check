import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
            <div className="flex items-center gap-1 group cursor-default">
              <span className="text-cyan-400 font-black text-2xl tracking-tighter">FING</span>
              <span className="text-white font-bold text-2xl tracking-tighter">CHECK</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Neural Link Online</span>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}