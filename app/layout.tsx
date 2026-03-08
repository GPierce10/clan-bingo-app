import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "MRC Bingo",
  description: "Clan Bingo Tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white">

        {/* HEADER */}
        <header className="border-b border-zinc-800 bg-zinc-900">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">

  <Image
    src="/mrc-logo.png"
    alt="MRC"
    width={48}
    height={48}
    priority
  />

  <span className="text-xl font-bold tracking-wide">
    MRC Bingo
  </span>

</Link>

            <nav className="flex gap-6 text-sm font-semibold">
              <Link href="/" className="hover:text-green-400">
                Home
              </Link>

              
            </nav>

          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-8">
          {children}
        </main>

      </body>
    </html>
  );
}