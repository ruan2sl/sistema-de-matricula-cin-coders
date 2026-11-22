WITH demo(sectionId, subjectId, professorId, day, start, end) AS (VALUES
  (1,3,1,1,480,600),(1,3,1,3,480,600),
  (2,2,2,2,600,720),(2,2,2,4,600,720),
  (3,6,3,1,540,660),(3,6,3,5,540,660),
  (4,7,4,2,840,960),(4,7,4,4,840,960),
  (5,8,2,3,840,960),(5,8,2,5,840,960),
  (6,9,1,1,600,720),(6,9,1,4,480,600),
  (7,10,3,2,960,1080),(7,10,3,5,960,1080),
  (8,1,4,3,600,720),(8,1,4,5,600,720),
  (9,2,1,1,840,960),(9,2,1,3,840,960))
INSERT INTO meetings(sectionId,day,start,end)
SELECT d.sectionId,d.day,d.start,d.end FROM demo d
JOIN sections s ON s.id=d.sectionId AND s.subjectId=d.subjectId AND s.professorId=d.professorId;
