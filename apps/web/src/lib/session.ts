import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@matricula/contracts'
import { api, ApiError, setExpectedUser } from './api'
import { navigate } from './location'
import { notifyTabs } from './tabs'

const signalKey = 'matricula:session-change'

export function useSession() {
  const [user, setUser] = useState<Session | null>()
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const sequence = useRef(0)
  const apply = useCallback((person: Session | null) => {
    setExpectedUser(person?.id)
    setUser(person)
  }, [])
  const load = useCallback(async () => {
    const version = ++sequence.current
    setError('')
    try {
      const session = await api<Session>('/sessao')
      if (version === sequence.current) {
        apply(session)
        setExpired(false)
      }
    } catch (e) {
      if (version !== sequence.current) return
      if (e instanceof ApiError && e.status === 401) apply(null)
      else setError((e as Error).message)
    }
  }, [apply])
  useEffect(() => {
    const refresh = () => {
      setUser(undefined)
      setExpectedUser(undefined)
      void load()
    }
    const synchronize = (e: StorageEvent) => {
      if (e.key === signalKey) refresh()
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const expired = () => {
      sequence.current++
      setExpired(true)
      apply(null)
      navigate('/login', true)
    }
    void load()
    addEventListener('storage', synchronize)
    addEventListener('session-change', refresh)
    addEventListener('sessao-expirada', expired)
    document.addEventListener('visibilitychange', visible)
    return () => {
      removeEventListener('storage', synchronize)
      removeEventListener('session-change', refresh)
      removeEventListener('sessao-expirada', expired)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [apply, load])
  useEffect(() => {
    if (!user) return
    const timer = setTimeout(
      () => dispatchEvent(new Event('sessao-expirada')),
      Math.max(0, user.expiresAt - Date.now()),
    )
    return () => clearTimeout(timer)
  }, [user])
  function loggedIn(person: Session) {
    sequence.current++
    apply(person)
    setError('')
    setExpired(false)
    notifyTabs(signalKey)
  }
  async function logout() {
    try {
      await api('/sessao', 'DELETE')
      sequence.current++
      apply(null)
      setExpired(false)
      setError('')
      notifyTabs(signalKey)
      navigate('/login', true)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return { user, error, expired, load, loggedIn, logout }
}
