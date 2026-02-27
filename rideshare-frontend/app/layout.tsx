import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/src/components/Navbar'
import { WebSocketProvider } from '@/hooks/WebsocketProvider'
import 'mapbox-gl/dist/mapbox-gl.css';


export const metadata: Metadata = {
  title: 'SwiftRide - Seamless Urban Transportation',
  description: 'Book rides instantly with SwiftRide - Your reliable urban mobility partner',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
       <body className="font-sans antialiased">
          <div className="min-h-screen bg-gray-50">
            <WebSocketProvider>
            <Navbar />
            {children}
            </WebSocketProvider>
          </div>
      </body>
    </html>
  )
}