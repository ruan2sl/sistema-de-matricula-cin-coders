import './style.css'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useSession } from './lib/session'
import { navigate, useLocation } from './lib/location'
import { Brand, Link, Notice, Status } from './components/shared'
import { Login } from './pages/Login'
import { PlannerPage } from './pages/planner/PlannerPage'
import { Professors, Sections, Subjects } from './pages/Office'

const studentPages = [
  ['/aluno/ofertas', 'Planejamento'],
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
  const { user, error, expired, load, loggedIn, logout } = useSession()
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
  if (user === undefined)
    return (
      <main className="loading-shell">
        <Brand />
        <Status error={error} retry={load} />
      </main>
    )
  if (!user) return <Login expired={expired} onLogin={loggedIn} />
  const query = search ? '?' + search : ''
  const officeViews: Record<string, React.ReactNode> = {
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
      <nav className="rail" aria-label="Área acadêmica">
        <Brand />
        <div>
          {pages.map(([url, label]) => (
            <Link key={url} to={url + (user.role === 'aluno' ? query : '')} current={url === path}>
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <main id="conteudo" className="workspace" tabIndex={-1}>
        <Notice text={error} error />
        {user.role === 'aluno' ? (
          <PlannerPage key={user.id} query={query} destination={path} />
        ) : (
          officeViews[path]
        )}
      </main>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
