import type { Progress } from '@matricula/contracts'

const progressTitles = {
  obrigatoria: 'Obrigatórias',
  perfil: 'Eletivas de perfil',
  livre: 'Eletivas livres',
}
export function CourseProgress({ data }: { data: Progress }) {
  return (
    <>
      <section className="academic-history" aria-labelledby="history-title">
        <h2 id="history-title">Disciplinas cursadas</h2>
        {!Array.isArray(data.history) ? <p>O histórico está indisponível nesta versão do servidor.</p> :
          data.history.length === 0 ? <p>Nenhuma disciplina registrada no histórico.</p> :
          <ul>{data.history.map(entry => <li key={entry.id}>
            <div><strong>{entry.name}</strong><small>{entry.code} · {entry.hours}h</small></div>
            <span className={entry.result}>{entry.result === 'aprovada' ? 'Aprovada' : 'Reprovada'}</span>
          </li>)}</ul>}
      </section>
      <p className="intro">
        A carga integralizada considera as disciplinas aprovadas. Neste semestre, você tem{' '}
        <strong>{data.semesterHours}h em curso</strong> de um limite de {data.semesterLimit}h.
      </p>
      <div className="progress-list">
        {data.groups.map((row) => (
          <section key={row.group}>
            <header>
              <h2>{progressTitles[row.group]}</h2>
              <strong>{row.percent}%</strong>
            </header>
            <progress
              aria-label={'Conclusão em ' + progressTitles[row.group]}
              value={row.percent}
              max={100}
            />
            <dl>
              {[
                ['Exigida', row.required],
                ['Integralizada', row.completed],
                ['Em curso', row.ongoing],
                ['Falta concluir', row.remaining],
              ].map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}h</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <p className="footnote">
        Horas aprovadas em eletivas de perfil acima do mínimo contam como eletivas livres.
      </p>
    </>
  )
}
