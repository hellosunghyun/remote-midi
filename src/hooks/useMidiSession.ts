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
  
  const supabaseRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const userIdRef = useRef<string>(generateUserId())

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
          addActivity('Supabase 연결 성공')
          
          // 참여자로 등록
          await channel.track({
            userId: userIdRef.current,
            joinedAt: new Date().toISOString()
          })
        }
      })

    } catch (error) {
      console.error('Supabase 초기화 실패:', error)
      addActivity('Supabase 연결 실패: ' + (error as Error).message)
      setIsConnected(false)
    }
  }, [sessionId, addActivity, handleReceivedMidiMessage])

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
      if (channelRef.current) {
        channelRef.current.unsubscribe()
      }
    }
  }, [initializeSupabase])

  return {
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
    initializeMidi: handleInitializeMidi
  }
}