import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'STR Analyzer — Short-Term Rental Underwriting',
  description: 'Analyze Airbnb/VRBO investment properties with AI-powered deal summaries',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-[#0f1117] text-[#f9fafb] min-h-dvh">
        <header className="sticky top-0 z-50 border-b border-[#1f2937] bg-[#0f1117]/95 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-[#3b82f6] rounded-full" />
              <span className="font-mono font-bold text-sm tracking-wider text-white">
                STR<span className="text-[#3b82f6]">Analyzer</span>
              </span>
            </div>
            <nav className="flex gap-1">
              <NavLink href="/">Analyzer</NavLink>
              <NavLink href="/history">Deal History</NavLink>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6 pb-16">{children}</main>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#6b7280] hover:text-white hover:bg-[#161b27] rounded transition-colors"
    >
      {children}
    </Link>
  )
}
