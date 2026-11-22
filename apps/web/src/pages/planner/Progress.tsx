import type { Progress } from '@matricula/contracts'

const progressTitles = {
  obrigatoria: 'Obrigatórias',
  perfil: 'Eletivas de perfil',
  livre: 'Eletivas livres',
}
export function CourseProgress({ data }: { data: Progress }) {
  return (
    <>
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
