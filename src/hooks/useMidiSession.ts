'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

interface MidiDevice {
  id: string
  name: string
}

interface MidiActivity {
  timestamp: string
  message: string
}

interface MidiMessage {
  data: number[]
  timestamp: number
  userId: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export function useMidiSession(sessionId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [midiInputs, setMidiInputs] = useState<MidiDevice[]>([])
  const [midiOutputs, setMidiOutputs] = useState<MidiDevice[]>([])
  const [selectedInput, setSelectedInput] = useState<string | null>(null)
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null)
  const [midiActivity, setMidiActivity] = useState<MidiActivity[]>([])
  const [isMidiInitialized, setIsMidiInitialized] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  
  const supabaseRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const userIdRef = useRef<string>(generateUserId())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000 // 1초

  function generateUserId() {
    return 'user_' + Math.random().toString(36).substring(2, 15)
  }

  // MIDI 메시지 포맷팅
  const formatMidiMessage = (data: Uint8Array) => {
    const bytes = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')
    return `[${bytes}]`
  }

  // 활동 로그 추가
  const addActivity = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setMidiActivity(prev => [...prev, { timestamp, message }])
  }, [])

  // 연결 상태 확인
  const checkConnectionStatus = useCallback(() => {
    if (!channelRef.current) return false
    
    // Supabase 채널의 상태를 확인
    const channelState = channelRef.current.state
    return channelState === 'joined'
  }, [])

  // 자동 재연결 함수
  const attemptReconnect = useCallback(async () => {
    if (isReconnecting || reconnectAttemptsRef.current >= maxReconnectAttempts) {
      return
    }

    setIsReconnecting(true)
    reconnectAttemptsRef.current += 1
    
    // 지수 백오프로 재연결 지연 시간 계산
    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1)
    
    addActivity(`연결 재시도 중... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
    
    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        // 기존 채널 정리
        if (channelRef.current) {
          await channelRef.current.unsubscribe()
          channelRef.current = null
        }
        
        // 새로운 연결 시도
        await initializeSupabase()
        
      } catch (error) {
        console.error('재연결 실패:', error)
        addActivity('재연결 실패: ' + (error as Error).message)
        
        // 최대 재시도 횟수에 도달하지 않았다면 다시 시도
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          setTimeout(() => attemptReconnect(), delay)
        } else {
          addActivity('최대 재연결 시도 횟수에 도달했습니다. 페이지를 새로고침해주세요.')
        }
      } finally {
        setIsReconnecting(false)
      }
    }, delay)
  }, [isReconnecting, addActivity])

  // 하트비트 체크
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      const isCurrentlyConnected = checkConnectionStatus()
      
      if (!isCurrentlyConnected && isConnected) {
        // 연결이 끊어진 것을 감지
        setIsConnected(false)
        addActivity('연결이 끊어졌습니다. 재연결을 시도합니다...')
        attemptReconnect()
      }
    }, 5000) // 5초마다 체크
  }, [checkConnectionStatus, isConnected, attemptReconnect, addActivity])

  // 하트비트 중지
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  // MIDI 장치 초기화
  const initializeMidi = useCallback(async () => {
    try {
      if (!navigator.requestMIDIAccess) {
        addActivity('MIDI API를 지원하지 않는 브라우저입니다.')
        return
      }

      const midiAccess = await navigator.requestMIDIAccess()
      midiAccessRef.current = midiAccess

      // 입력 장치 목록 업데이트
      const inputs: MidiDevice[] = []
      midiAccess.inputs.forEach((input) => {
        inputs.push({ id: input.id!, name: input.name! })
      })
      setMidiInputs(inputs)

      // 출력 장치 목록 업데이트
      const outputs: MidiDevice[] = []
      midiAccess.outputs.forEach((output) => {
        outputs.push({ id: output.id!, name: output.name! })
      })
      setMidiOutputs(outputs)

      addActivity(`MIDI 초기화 완료: 입력 ${inputs.length}개, 출력 ${outputs.length}개`)

      // 장치 변경 감지
      midiAccess.onstatechange = () => {
        // 장치 목록 재갱신
        const newInputs: MidiDevice[] = []
        midiAccess.inputs.forEach((input) => {
          newInputs.push({ id: input.id!, name: input.name! })
        })
        setMidiInputs(newInputs)

        const newOutputs: MidiDevice[] = []
        midiAccess.outputs.forEach((output) => {
          newOutputs.push({ id: output.id!, name: output.name! })
        })
        setMidiOutputs(newOutputs)
      }
    } catch (error) {
      console.error('MIDI 초기화 실패:', error)
      addActivity('MIDI 초기화 실패: ' + (error as Error).message)
    }
  }, [addActivity])

  // 수신된 MIDI 메시지 처리
  const handleReceivedMidiMessage = useCallback((midiMessage: MidiMessage) => {
    if (!midiAccessRef.current || !selectedOutput) return

    const output = midiAccessRef.current.outputs.get(selectedOutput)
    if (output) {
      const data = new Uint8Array(midiMessage.data)
      output.send(data)
      addActivity(`MIDI 수신: ${formatMidiMessage(data)}`)
    }
  }, [selectedOutput, addActivity])

  // MIDI 메시지 전송
  const sendMidiMessage = useCallback((data: Uint8Array) => {
    if (!channelRef.current || !isConnected) return

    const midiMessage: MidiMessage = {
      data: Array.from(data),
      timestamp: Date.now(),
      userId: userIdRef.current
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'midi-message',
      payload: midiMessage
    })

    addActivity(`MIDI 전송: ${formatMidiMessage(data)}`)
  }, [isConnected, addActivity])

  // Supabase 초기화
  const initializeSupabase = useCallback(async () => {
    if (!sessionId || !supabaseUrl || !supabaseAnonKey) return

    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      supabaseRef.current = supabase

      const channel = supabase.channel(`midi-session-${sessionId}`)
      channelRef.current = channel

      // MIDI 메시지 수신
      channel.on('broadcast', { event: 'midi-message' }, (payload) => {
        const midiMessage = payload.payload as MidiMessage
        if (midiMessage.userId !== userIdRef.current) {
          handleReceivedMidiMessage(midiMessage)
        }
      })

      // 참여자 상태 추적
      channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState()
        const count = Object.keys(presenceState).length
        setParticipantCount(count)
        addActivity(`참여자 수: ${count}명`)
      })

      channel.on('presence', { event: 'join' }, () => {
        addActivity('새 참여자가 입장했습니다.')
      })

      channel.on('presence', { event: 'leave' }, () => {
        addActivity('참여자가 퇴장했습니다.')
      })

      // 채널 구독
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setIsReconnecting(false)
          reconnectAttemptsRef.current = 0 // 성공적으로 연결되면 재시도 횟수 리셋
          addActivity('Supabase 연결 성공')
          
          // 하트비트 시작
          startHeartbeat()
          
          // 참여자로 등록
          await channel.track({
            userId: userIdRef.current,
            joinedAt: new Date().toISOString()
          })
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false)
          addActivity('채널 연결 오류가 발생했습니다.')
          attemptReconnect()
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false)
          addActivity('연결 시간이 초과되었습니다.')
          attemptReconnect()
        }
      })

    } catch (error) {
      console.error('Supabase 초기화 실패:', error)
      addActivity('Supabase 연결 실패: ' + (error as Error).message)
      setIsConnected(false)
      attemptReconnect()
    }
  }, [sessionId, addActivity, handleReceivedMidiMessage, startHeartbeat, attemptReconnect])

  // MIDI 입력 장치 설정
  useEffect(() => {
    if (!midiAccessRef.current || !selectedInput) return

    const input = midiAccessRef.current.inputs.get(selectedInput)
    if (input) {
      input.onmidimessage = (message: MIDIMessageEvent) => {
        if (message.data) {
          sendMidiMessage(message.data)
        }
      }
      addActivity(`입력 장치 연결: ${input.name}`)
    }

    return () => {
      if (input) {
        input.onmidimessage = null
      }
    }
  }, [selectedInput, sendMidiMessage, addActivity])

  // MIDI 초기화 함수 (사용자 상호작용 후 호출)
  const handleInitializeMidi = useCallback(async () => {
    if (isMidiInitialized) return
    await initializeMidi()
    setIsMidiInitialized(true)
  }, [initializeMidi, isMidiInitialized])

  useEffect(() => {
    initializeSupabase()

    return () => {
      // 정리 작업
      stopHeartbeat()
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [initializeSupabase, stopHeartbeat])

  return {
    isConnected,
    isReconnecting,
    participantCount,
    midiInputs,
    midiOutputs,
    selectedInput,
    selectedOutput,
    setSelectedInput,
    setSelectedOutput,
    midiActivity,
    isMidiInitialized,
    initializeMidi: handleInitializeMidi
  }
}