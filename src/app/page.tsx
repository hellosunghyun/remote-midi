'use client'

import { Suspense } from 'react'
import MidiSession from '../components/MidiSession'

function MidiSessionWrapper() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎵 Remote MIDI Session
          </h1>
          <p className="text-lg text-gray-600">
            실시간 MIDI 협업 플랫폼
          </p>
        </header>
        <MidiSession />
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">세션을 초기화하는 중...</p>
        </div>
      </div>
    }>
      <MidiSessionWrapper />
    </Suspense>
  )
}