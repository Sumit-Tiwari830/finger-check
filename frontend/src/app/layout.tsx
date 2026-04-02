import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {/* We removed the <header> from here so it doesn't clash with page.tsx */}
        <main>{children}</main>
      </body>
    </html>
  );
}