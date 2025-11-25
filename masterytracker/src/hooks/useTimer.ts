import { useEffect, useMemo, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useQuery } from '@tanstack/react-query'
import { fetchActiveSession, startTimer, stopTimer } from '../api/tauri'
import type { ReflectionInput, TimerStatusPayload, TimerTickPayload } from '../types'

export const useTimer = () => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [running, setRunning] = useState(false)

  const activeQuery = useQuery({
    queryKey: ['active-session'],
    queryFn: fetchActiveSession,
    staleTime: 1000 * 5,
  })

  const { refetch } = activeQuery

  useEffect(() => {
    let unsubscribeTick: (() => void) | undefined
    let unsubscribeStatus: (() => void) | undefined

    const register = async () => {
      unsubscribeTick = await listen<TimerTickPayload>('timer://tick', (event) => {
        setElapsedSeconds(event.payload.elapsed_seconds)
      })
      unsubscribeStatus = await listen<TimerStatusPayload>('timer://status', async (event) => {
        setRunning(event.payload.running)
        if (!event.payload.running) {
          setElapsedSeconds(0)
        } else if (event.payload.started_at) {
          const started = new Date(event.payload.started_at).getTime()
          setElapsedSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)))
        }
        await refetch()
      })
    }

    register()

    return () => {
      unsubscribeTick?.()
      unsubscribeStatus?.()
    }
  }, [refetch])

  useEffect(() => {
    if (activeQuery.data?.start_time) {
      const startTime = new Date(activeQuery.data.start_time).getTime()
      const initial = Math.max(0, Math.floor((Date.now() - startTime) / 1000))
      setElapsedSeconds(initial)
      setRunning(true)
    } else {
      setElapsedSeconds(0)
      setRunning(false)
    }
  }, [activeQuery.data])

  const start = async (skillName?: string) => {
    await startTimer(skillName)
    await activeQuery.refetch()
  }

  const stop = async (reflection?: ReflectionInput) => {
    const session = await stopTimer(reflection)
    await activeQuery.refetch()
    setRunning(false)
    setElapsedSeconds(0)
    return session
  }

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds - minutes * 60
  const hours = Math.floor(minutes / 60)

  const formatted = useMemo(() => {
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(
        seconds,
      ).padStart(2, '0')}`
    }
    return `${String(minutes % 60).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [hours, minutes, seconds])

  return {
    running,
    elapsedSeconds,
    formatted,
    minutes,
    hours,
    activeSession: activeQuery.data ?? null,
    start,
    stop,
    isLoading: activeQuery.isLoading,
  }
}
