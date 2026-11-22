import { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@matricula/contracts'
import { api, ApiError } from './lib/api'
import { navigate, useLocation } from './lib/location'
import { Brand, Link, Notice, Status } from './components/shared'
import { Login } from './pages/Login'
import { CourseProgress, MyEnrollments, Offers } from './pages/Student'
import { Professors, Sections, Subjects } from './pages/Office'
import './style.css'

const studentPages = [
  ['/aluno/ofertas', 'Ofertas'],
  ['/aluno/matriculas', 'Minhas matrículas'],
  ['/aluno/progresso', 'Progresso'],
]
const officePages = [
  ['/secretaria/disciplinas', 'Disciplinas'],
  ['/secretaria/professores', 'Professores'],
  ['/secretaria/turmas', 'Turmas'],
]
function App() {
  const href = useLocation()
  const [user, setUser] = useState<Session | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const load = useCallback(async () => {
    setError('')
    try {
      setUser(await api<Session>('/sessao'))
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setUser(null)
      else setError((e as Error).message)
    }
  }, [])
  useEffect(() => {
    void load()
    const expire = () => {
      setUser(null)
      setExpired(true)
      navigate('/login', true)
    }
    addEventListener('sessao-expirada', expire)
    return () => removeEventListener('sessao-expirada', expire)
  }, [load])
  useEffect(() => {
    if (!user) return
    const expire = () => dispatchEvent(new Event('sessao-expirada'))
    const checkOnReturn = () => {
      if (Date.now() >= user.expiresAt) expire()
    }
    const timer = window.setTimeout(expire, Math.max(0, user.expiresAt - Date.now()))
    document.addEventListener('visibilitychange', checkOnReturn)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', checkOnReturn)
    }
  }, [user])
  const [path, search = ''] = href.split('?')
  const pages = user?.role === 'secretaria' ? officePages : studentPages
  useEffect(() => {
    if (user === undefined) return
    if (!user) {
      navigate('/login', true)
    } else if (!pages.some(([url]) => url === path)) {
      navigate(pages[0][0], true)
    }
  }, [user, path, pages])
  useEffect(() => {
    const label = pages.find(([url]) => path === url)?.[1] || 'Entrar'
    document.title = label + ' · Graduação'
  }, [path, pages])
  async function logout() {
    try {
      await api('/sessao', 'DELETE')
      setUser(null)
      setExpired(false)
      setError('')
      navigate('/login', true)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  if (user === undefined)
    return (
      <main className="loading-shell">
        <Brand />
        <Status error={error} retry={load} />
      </main>
    )
  if (!user)
    return (
      <Login
        expired={expired}
        onLogin={(person) => {
          setUser(person)
          setExpired(false)
          setError('')
        }}
      />
    )
  const query = search ? '?' + search : ''
  const views: Record<string, React.ReactNode> =
    user.role === 'aluno'
      ? {
          '/aluno/ofertas': <Offers query={query} />,
          '/aluno/matriculas': <MyEnrollments />,
          '/aluno/progresso': <CourseProgress />,
        }
      : {
          '/secretaria/disciplinas': <Subjects query={query} />,
          '/secretaria/professores': <Professors />,
          '/secretaria/turmas': <Sections />,
        }
  return (
    <div className="shell">
      <a className="skip" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="mast">
        <div className="mast-inner">
          <Brand />
          <div className="identity">
            <div>
              <strong>{user.name}</strong>
              <small>{user.course || 'Secretaria'}</small>
            </div>
            <button className="secondary" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <nav aria-label="Área acadêmica">
        <div>
          {pages.map(([url, label]) => (
            <Link key={url} to={url} current={url === path}>
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <main id="conteudo" className="workspace" tabIndex={-1}>
        <Notice text={error} error />
        {views[path]}
      </main>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
