import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@matricula/contracts'
import { api } from '../lib/api'
import { Brand, Notice } from '../components/shared'

const accounts = [
  { username: 'ana', name: 'Ana Lima', role: 'Ciência da Computação' },
  { username: 'bruno', name: 'Bruno Costa', role: 'Sistemas de Informação' },
  { username: 'secretaria', name: 'Secretaria', role: 'Gestão de turmas' },
]
export function Login({ onLogin, expired }: { onLogin: (user: Session) => void; expired: boolean }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      onLogin(await api<Session>('/sessao', 'POST', { username }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="login-layout">
      <section className="cover" aria-label="Portal de Graduação">
        <Brand />
        <div className="cover-title">
          <p className="eyebrow">Centro de Informática · UFPE</p>
          <h1>
            Portal de
            <br />
            <em>Matrícula</em>
          </h1>
        </div>
        <div className="book-art" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((n) => (
            <i key={n} style={{ left: n * 14, top: n * -8 }} />
          ))}
        </div>
      </section>
      <main className="access">
        <div className="access-inner">
          <p className="eyebrow">Acesso ao portal</p>
          <h2>Entrar</h2>
          <p className="muted">Use seu nome de usuário para acessar sua área.</p>
          <form className="form-stack login-form" onSubmit={submit}>
            <label>
              Nome de usuário
              <input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                placeholder="Seu usuário"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('')
                }}
              />
            </label>
            <Notice text={error || (expired ? 'Sua sessão expirou. Entre novamente.' : '')} error />
            <button className="primary" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar no portal'} <span aria-hidden="true">→</span>
            </button>
          </form>
          <div className="demo">
            <h3>Contas de demonstração</h3>
            {accounts.map((account) => (
              <button
                key={account.username}
                className="account"
                type="button"
                aria-pressed={username === account.username}
                onClick={() => {
                  setUsername(account.username)
                  setError('')
                }}
              >
                <span className="initial">{account.name[0]}</span>
                <span>
                  <strong>{account.name}</strong>
                  <small>{account.role}</small>
                </span>
                <span className="account-end">{username === account.username ? '✓' : '↗'}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
