# Portal de Matrícula

Sistema de matrícula de graduação para alunos e secretaria. A aplicação React e a API Express usam TypeScript, compartilham contratos e são servidas na mesma origem. O SQLite persiste os dados em um arquivo local.

## Rodar do zero

Com Node.js 24.15 ou superior e npm instalados, clone o projeto usando uma conta com acesso ao repositório privado.

```sh
git clone https://github.com/ruan2sl/cin-coders.git
cd cin-coders
```

Na raiz do monorepo, instale as dependências, carregue os dados de demonstração e inicie o portal.

```sh
npm ci
npm run seed
npm run dev
```

Abra [o portal local](http://localhost:3000). O servidor inicia a API e o Vite na mesma porta. Para usar a versão de produção local, encerre o servidor de desenvolvimento e execute `npm run build` seguido de `npm start`. O build também verifica os tipos de toda a aplicação.

## Dados iniciais

O comando `npm run seed` carrega os cursos, as estruturas curriculares, os alunos e seus históricos a partir de [demo.sql](apps/api/src/db/demo.sql). Esses dados são definidos diretamente no banco. As contas disponíveis para entrar no portal são:

| Usuário      | Perfil     | Curso                  |
| ------------ | ---------- | ---------------------- |
| `ana`        | Aluna      | Ciência da Computação  |
| `bruno`      | Aluno      | Sistemas de Informação |
| `secretaria` | Secretaria | —                      |

Banco de Dados (`IF690`) é obrigatória para Ana e eletiva de perfil para Bruno. Redes de Computadores (`IF677`) é eletiva de perfil para Ana e obrigatória para Bruno.

| Aluno | Disciplinas aprovadas | Disciplina reprovada | CH integralizada ao abrir **Progresso** |
| --- | --- | --- | --- |
| Ana Lima | Introdução à Computação, Processamento de Imagens e Computação Gráfica | Algoritmos e Estruturas de Dados | 60h obrigatórias, 90h de perfil e 30h livres |
| Bruno Costa | Introdução à Computação e Algoritmos e Estruturas de Dados | Redes de Computadores | 60h obrigatórias, 60h de perfil e 0h livres |

Ana já cumpriu 120h em disciplinas de perfil. Como seu curso exige 90h nesse grupo, as 30h excedentes contam como livres. Bruno pode se matricular novamente em Redes de Computadores. Ao fazer isso, as 60h da turma aparecem como **em curso** e o total integralizado permanece igual.

O teste permite login somente com nome de usuário. A sessão dura oito horas. O servidor grava o hash de um identificador aleatório e o navegador recebe o identificador em um cookie HttpOnly e SameSite=Strict. O logout revoga a sessão. Para um ambiente com HTTPS, configure `COOKIE_SECURE=true`.

A carga inicial cria os dois cursos, seus currículos, usuários, professores, disciplinas, nove turmas e históricos com aprovações e reprovações. Rodar o seed novamente preserva os dados existentes. O arquivo padrão fica em `data/matricula.sqlite`. As variáveis opcionais `DB_PATH` e `PORT` alteram o banco e a porta.

## Roteiro de demonstração

1. Entre como Ana e busque `IF690`. Banco de Dados é obrigatória em Ciência da Computação. A turma começa com uma vaga.
2. Matricule Ana. Em **Progresso**, as obrigatórias passam de 0h para 60h em curso. As horas integralizadas continuam em 60h. Ana já tinha 120h aprovadas em eletivas de perfil para uma exigência de 90h. As 30h excedentes aparecem em eletivas livres.
3. Em outra sessão, entre como Bruno e busque a mesma turma. Para ele, Banco de Dados é eletiva de perfil. A oferta mostra a lotação.
4. Cancele a matrícula de Ana e atualize as ofertas de Bruno. Ele pode ocupar a vaga liberada. Para testar uma reprovação anterior, Ana pode cursar Algoritmos e Estruturas de Dados.
5. Na secretaria, cadastre uma disciplina e um professor, abra uma turma e ajuste as vagas. A listagem mostra a ocupação real.

## Planejar uma semana

O catálogo agrupa as turmas por disciplina antes de paginar. Nos cartões com múltiplas ofertas, selecione o professor para comparar horários e vagas. A cor identifica a disciplina no cartão e na grade, com variação de tom por turma.

O catálogo fica à esquerda no desktop e a grade à direita, com dias em colunas e horários em linhas. Use **Matricular-se** para ocupar uma vaga diretamente. **Ver na grade** mostra uma prévia temporária de uma única oferta junto das matrículas ativas.

Para ver um conflito, matricule Ana em Banco de Dados (T1) e consulte Design de Interação (T3) com **Ver na grade**. A sobreposição na segunda vai das 09:00 às 10:00. **Fechar prévia** limpa a consulta. O filtro de elegibilidade é aplicado antes da paginação.

Os encontros usam dia da semana (segunda = 1, domingo = 7) e minutos desde meia-noite. A grade ordena os encontros de cada dia pelo início e reutiliza a primeira linha que estiver livre. Dois encontros consecutivos podem usar a mesma linha. A interface sinaliza sobreposições entre turmas selecionadas ou confirmadas, e o aluno decide quais confirmar. Turmas com horário a definir aparecem na lista. A secretaria pode cadastrar vários encontros ao abrir uma turma ou alterá-los depois em **Editar horários**.

Na primeira abertura de uma base anterior, a aplicação cria a tabela de encontros e preenche os horários das turmas de demonstração reconhecidas. As demais aguardam cadastro pela secretaria.

## Organização e decisões

| Caminho                           | Responsabilidade                                                         |
| --------------------------------- | ------------------------------------------------------------------------ |
| `apps/api/src/db`                 | Esquema, índices, dados iniciais e consultas compartilhadas              |
| `apps/api/src/domain`             | Classificação, cálculo de progresso, matrícula, cancelamento e cadastros |
| `apps/api/src/http`               | Rotas, sessão, autorização por perfil, validação e erros HTTP            |
| `apps/web/src/pages`              | Fluxos de login, aluno e secretaria                                      |
| `apps/web/src/components` e `lib` | Formulários e estados compartilhados, chamadas HTTP e navegação          |
| `packages/contracts`              | Tipos das entidades e respostas usados pela API e pela interface         |
| `apps/api/tests`                  | Testes de domínio, integração HTTP e concorrência                        |

**Currículo.** A relação entre curso e disciplina guarda a classificação obrigatória ou de perfil. Uma disciplina fora da estrutura é eletiva livre. Ofertas e progresso chamam a mesma função de classificação. As turmas representam apenas o semestre corrente. O histórico registra a disciplina e o resultado das tentativas anteriores.

**Algoritmo de progresso.** O currículo é indexado uma vez em um `Map` pela chave da disciplina. O cálculo percorre aprovações e matrículas ativas uma vez cada. Um `Set` evita contar duas aprovações na mesma disciplina. Para C entradas de currículo, H aprovações e M matrículas ativas, o processamento em memória leva O(C + H + M) em média. O excedente de perfil aprovado é transferido uma única vez para as livres. As horas em curso ficam no grupo da oferta. Somente a carga aprovada reduz o que falta. A falta mínima é zero e a conclusão máxima é 100%. Um grupo com exigência zero já está concluído.

**Vagas.** A ocupação é a contagem das matrículas ativas, com índice por turma. O cancelamento altera o estado da matrícula. A verificação das vagas e a inscrição usam a mesma transação SQLite com `BEGIN IMMEDIATE`. A alteração de capacidade também usa transação. Assim, duas conexões disputando a última vaga produzem uma matrícula e uma recusa. O aluno vem da sessão em todas as operações. Uma segunda matrícula ativa na mesma disciplina é recusada, inclusive em outra turma.

**Alterações de carga horária.** Histórico e matrícula guardam a CH vigente quando o registro foi criado. Uma edição da disciplina vale para novas matrículas e preserva os compromissos e créditos anteriores.

**Requisito escolhido — limite de CH por semestre.** Essa regra usa o curso e as matrículas que o sistema já conhece. Cada curso tem um teto definido na carga inicial (360h em Ciência da Computação, 300h em Sistemas de Informação). A API soma as horas ativas antes de matricular. A soma pode ser igual ao teto. Se a turma exceder o saldo, a oferta informa o motivo e a API recusa a operação, mesmo quando o pedido é feito diretamente. Cancelar devolve o saldo. A tela de ofertas e a de progresso exibem o consumo atual.

**Interface.** A URL guarda a busca e a página atual, inclusive ao recarregar ou usar o botão Voltar. A busca ignora acentos e maiúsculas. As listas distinguem carregamento, ausência de dados, busca sem resultado e falha de comunicação. O aluno pode usar o portal a partir de 360px. A secretaria usa tabelas em desktop.

## API

As rotas abaixo usam o prefixo `/api`. Envie JSON nas requisições com corpo. O navegador envia o cookie de sessão nas chamadas seguintes.

| Método       | Rota                                                      | Entrada ou resultado                                                     |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| POST         | `/sessao`                                                 | `{ "username": "ana" }` cria sessão e retorna o perfil e o vencimento    |
| GET / DELETE | `/sessao`                                                 | Consultar sessão / sair                                                  |
| GET          | `/aluno/ofertas?q=IF690&page=1`                           | Ofertas classificadas, vagas, motivos de bloqueio e CH semestral         |
| GET          | `/aluno/matriculas`                                       | Matrículas ativas do usuário                                             |
| POST         | `/aluno/matriculas`                                       | `{ "sectionId": 1 }`                                                     |
| DELETE       | `/aluno/matriculas/:id`                                   | Cancelar a matrícula pelo seu identificador                              |
| GET          | `/aluno/progresso`                                        | CH exigida, integralizada, em curso, faltante e percentual de cada grupo |
| GET          | `/secretaria/disciplinas?q=IF&page=1`                     | Listagem paginada                                                        |
| POST / PUT   | `/secretaria/disciplinas` / `/secretaria/disciplinas/:id` | `{ "code": "IF710", "name": "Compiladores", "hours": 60 }`               |
| GET / POST   | `/secretaria/professores`                                 | Listar / cadastrar com `name` e `email`                                  |
| GET / POST   | `/secretaria/turmas`                                      | Listar / abrir com `subjectId`, `professorId` e `capacity`               |
| PATCH        | `/secretaria/turmas/:id`                                  | Alterar vagas com `{ "capacity": 25 }`                                   |
| GET          | `/secretaria/opcoes`                                      | Disciplinas e professores para o formulário de abertura                  |

Uma página contém `items`, `page`, `pageSize` (6) e `total`. As listagens ordenam por nome e identificador. Códigos de disciplina e e-mails de professores são únicos. A CH da disciplina aceita múltiplos de 15 entre 15h e 120h. A turma exige pelo menos uma vaga e capacidade suficiente para os alunos ativos.

Erros seguem o formato `{ "error": "Turma lotada." }`. A API usa 400 para entradas inválidas, 401 para sessão ausente ou expirada, 403 para perfil incorreto, 404 para recurso inacessível ou inexistente e 409 para conflito de negócio. Cadastros e matrículas retornam 201 com o identificador. O cancelamento retorna 204.

O planejamento completo vem de `GET /api/aluno/planejamento?q=IF690&page=1&elegiveis=1&simular=1,3`. Todos os parâmetros são opcionais. A resposta inclui a página de ofertas, os detalhes das turmas simuladas, as matrículas confirmadas e o progresso do aluno. As simuladas continuam disponíveis quando ficam fora da busca.

Ao abrir uma turma, a secretaria pode incluir `meetings` no corpo de `POST /api/secretaria/turmas`. Para substituir os encontros de uma turma, use `PUT /api/secretaria/turmas/:id/horarios` com `{"meetings":[{"day":1,"start":480,"end":600}]}`. Uma lista vazia deixa o horário a definir.

## Testes

```sh
npm test
npm run build
```

Os testes usam bancos isolados. Exercitam as regras pelo HTTP, o cálculo puro de progresso e a disputa real pela última vaga com duas conexões em threads diferentes. Os cenários incluem reprovação seguida de nova matrícula, privacidade entre alunos, alterações de capacidade, excesso de perfil e os limites exatos da CH.

Para os testes de navegador, instale o Chromium do Playwright uma vez com `npx playwright install chromium` e rode `npm run test:e2e`. Cada cenário usa um banco em memória. Há cobertura de simulação e confirmação, choques e horários consecutivos, paginação, agenda em 360px, edição pela secretaria e troca de conta entre abas.

## Com mais tempo

Automatizaria o roteiro de navegador dos dois perfis no CI do GitLab. Para uso institucional, integraria a autenticação ao provedor da universidade. Ao passar a operar vários semestres, associaria turmas a períodos e registraria a conclusão das matrículas no histórico.


