import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'

const nunito = Nunito({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SVG Generator | Entrekids',
  description: 'Seating Map Generator for Entrekids',
  generator: 'SVG Generator | Entrekids',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={nunito.className} data-theme="cupcake">
      <body className='h-screen overflow-y-hidden'>{children}</body>
    </html>
  )
}
