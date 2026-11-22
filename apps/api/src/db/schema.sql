CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE,
  obrigatoria INTEGER NOT NULL CHECK (obrigatoria >= 0),
  perfil INTEGER NOT NULL CHECK (perfil >= 0), livre INTEGER NOT NULL CHECK (livre >= 0),
  semesterLimit INTEGER NOT NULL CHECK (semesterLimit > 0)
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('aluno','secretaria')), courseId INTEGER REFERENCES courses,
  CHECK ((role='aluno' AND courseId IS NOT NULL) OR (role='secretaria' AND courseId IS NULL))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, userId INTEGER NOT NULL REFERENCES users, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL,
  hours INTEGER NOT NULL CHECK (hours BETWEEN 15 AND 120 AND hours % 15 = 0)
);
CREATE TABLE IF NOT EXISTS curriculum (
  courseId INTEGER NOT NULL REFERENCES courses, subjectId INTEGER NOT NULL REFERENCES subjects,
  category TEXT NOT NULL CHECK (category IN ('obrigatoria','perfil')), PRIMARY KEY (courseId,subjectId)
);
CREATE TABLE IF NOT EXISTS professors (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE
);
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY, subjectId INTEGER NOT NULL REFERENCES subjects, professorId INTEGER NOT NULL REFERENCES professors,
  capacity INTEGER NOT NULL CHECK (capacity >= 1)
);
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY, studentId INTEGER NOT NULL REFERENCES users, subjectId INTEGER NOT NULL REFERENCES subjects,
  result TEXT NOT NULL CHECK (result IN ('aprovada','reprovada')), hours INTEGER NOT NULL CHECK (hours BETWEEN 15 AND 120 AND hours % 15=0)
);
CREATE INDEX IF NOT EXISTS history_student ON history(studentId,result,subjectId);
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY, studentId INTEGER NOT NULL REFERENCES users, sectionId INTEGER NOT NULL REFERENCES sections,
  hours INTEGER NOT NULL CHECK (hours BETWEEN 15 AND 120 AND hours % 15=0),
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','cancelada'))
);
CREATE UNIQUE INDEX IF NOT EXISTS active_enrollment ON enrollments(studentId,sectionId) WHERE status='ativa';
CREATE INDEX IF NOT EXISTS occupied_seats ON enrollments(sectionId) WHERE status='ativa';
CREATE VIEW IF NOT EXISTS section_details AS
  SELECT s.id, d.id AS subjectId, d.code, d.name, d.hours, p.name AS professor, s.capacity,
    (SELECT count(*) FROM enrollments e WHERE e.sectionId=s.id AND e.status='ativa') AS occupied
  FROM sections s JOIN subjects d ON d.id=s.subjectId JOIN professors p ON p.id=s.professorId;
