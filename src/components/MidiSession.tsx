'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Copy, Music, Users, Wifi, WifiOff, Power } from 'lucide-react'
import { useMidiSession } from '../hooks/useMidiSession'

export default function MidiSession() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const {
    isConnected,
    participantCount,
    midiInputs,
    midiOutputs,
    selectedInput,
    selectedOutput,
    setSelectedInput,
    setSelectedOutput,
    midiActivity,
    isMidiInitialized,
    initializeMidi
  } = useMidiSession(sessionId)

  useEffect(() => {
    const sessionParam = searchParams.get('session')
    
    if (!sessionParam) {
      // 세션 ID가 없으면 새로 생성
      const newSessionId = generateSessionId()
      const newUrl = `${pathname}?session=${newSessionId}`
      router.push(newUrl)
      setSessionId(newSessionId)
    } else {
      setSessionId(sessionParam)
    }
  }, [searchParams, router, pathname])

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  const copySessionLink = async () => {
    if (!sessionId) return
    
    const sessionUrl = `${window.location.origin}${pathname}?session=${sessionId}`
    
    try {
      await navigator.clipboard.writeText(sessionUrl)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('링크 복사 실패:', err)
    }
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">세션을 생성하는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 세션 정보 헤더 */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              {isConnected ? '연결됨' : '연결 끊김'}
            </span>
            {isConnected ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">{participantCount}명 참여 중</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              세션 ID: {sessionId}
            </h2>
            <p className="text-sm text-gray-600">
              이 링크를 공유하여 다른 사용자를 초대하세요
            </p>
          </div>
          <button
            onClick={copySessionLink}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              copySuccess 
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>{copySuccess ? '복사됨!' : '링크 복사'}</span>
          </button>
        </div>
      </div>

      {/* MIDI 초기화 */}
      {!isMidiInitialized && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2 flex items-center">
                <Power className="w-5 h-5 mr-2" />
                MIDI 초기화 필요
              </h3>
              <p className="text-yellow-700">
                MIDI 장치를 사용하려면 먼저 초기화가 필요합니다. 브라우저 보안 정책에 따라 사용자 상호작용 후에만 MIDI에 접근할 수 있습니다.
              </p>
            </div>
            <button
              onClick={initializeMidi}
              className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              <Power className="w-4 h-4" />
              <span>MIDI 초기화</span>
            </button>
          </div>
        </div>
      )}

      {/* MIDI 장치 선택 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Music className="w-5 h-5 mr-2" />
            MIDI 입력 장치
          </h3>
          <select
            value={selectedInput || ''}
            onChange={(e) => setSelectedInput(e.target.value || null)}
            disabled={!isMidiInitialized}
            className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              !isMidiInitialized ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">{!isMidiInitialized ? 'MIDI를 먼저 초기화하세요' : '장치를 선택하세요'}</option>
            {midiInputs.map((input) => (
              <option key={input.id} value={input.id}>
                {input.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Music className="w-5 h-5 mr-2" />
            MIDI 출력 장치
          </h3>
          <select
            value={selectedOutput || ''}
            onChange={(e) => setSelectedOutput(e.target.value || null)}
            disabled={!isMidiInitialized}
            className={`w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              !isMidiInitialized ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
          >
            <option value="">{!isMidiInitialized ? 'MIDI를 먼저 초기화하세요' : '장치를 선택하세요'}</option>
            {midiOutputs.map((output) => (
              <option key={output.id} value={output.id}>
                {output.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MIDI 활동 표시 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🎹 MIDI 활동
        </h3>
        <div className="h-32 bg-gray-50 rounded-lg p-4 overflow-y-auto">
          {midiActivity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              MIDI 신호를 기다리는 중...
            </p>
          ) : (
            <div className="space-y-2">
              {midiActivity.slice(-10).map((activity, index) => (
                <div key={index} className="text-sm text-gray-700">
                  <span className="text-blue-600 font-mono">
                    {activity.timestamp}
                  </span>
                  {' - '}
                  <span>{activity.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}