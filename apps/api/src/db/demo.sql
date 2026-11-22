INSERT INTO courses VALUES
  (1,'Ciência da Computação',240,90,60,360),(2,'Sistemas de Informação',180,120,60,300);
INSERT INTO users VALUES
  (1,'ana','Ana Lima','aluno',1),(2,'bruno','Bruno Costa','aluno',2),
  (3,'secretaria','Secretaria de Graduação','secretaria',NULL);
INSERT INTO subjects VALUES
  (1,'IF668','Introdução à Computação',60),(2,'IF669','Algoritmos e Estruturas de Dados',60),
  (3,'IF690','Banco de Dados',60),(4,'IF680','Processamento de Imagens',60),
  (5,'IF682','Computação Gráfica',60),(6,'DS101','Design de Interação',45),
  (7,'IF683','Engenharia de Software',75),(8,'IF677','Redes de Computadores',60),
  (9,'MA101','Matemática Discreta',60),(10,'IF685','Inteligência Artificial',60);
INSERT INTO curriculum VALUES
  (1,1,'obrigatoria'),(1,2,'obrigatoria'),(1,3,'obrigatoria'),(1,4,'perfil'),(1,5,'perfil'),
  (1,7,'obrigatoria'),(1,8,'perfil'),(1,9,'obrigatoria'),(1,10,'perfil'),
  (2,1,'obrigatoria'),(2,2,'perfil'),(2,3,'perfil'),(2,6,'obrigatoria'),
  (2,7,'obrigatoria'),(2,8,'obrigatoria'),(2,10,'perfil');
INSERT INTO professors VALUES
  (1,'Helena Moura','helena@example.edu'),(2,'Rafael Nunes','rafael@example.edu'),
  (3,'Lívia Andrade','livia@example.edu'),(4,'Paulo Freire Neto','paulo@example.edu');
INSERT INTO sections VALUES
  (1,3,1,1),(2,2,2,32),(3,6,3,25),(4,7,4,28),(5,8,2,30),
  (6,9,1,35),(7,10,3,20),(8,1,4,40),(9,2,1,18);
INSERT INTO history(studentId,subjectId,result,hours) VALUES
  (1,1,'aprovada',60),(1,4,'aprovada',60),(1,5,'aprovada',60),(1,2,'reprovada',60),
  (2,1,'aprovada',60),(2,2,'aprovada',60),(2,8,'reprovada',60);
