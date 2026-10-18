
PRAGMA foreign_keys = ON;

-- Remove existing tables so the script can be rerun.
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- 1. Students
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- 2. Courses
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0)
);

-- 3. Enrolments: links students and courses.
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id),
    UNIQUE (student_id, course_id)
);

-- Sample students
INSERT INTO students (student_id, name, email) VALUES
(1, 'Abebe Kebede', 'abebe@example.com'),
(2, 'Sara Ahmed', 'sara@example.com'),
(3, 'Dawit Tesfaye', 'dawit@example.com'),
(4, 'Mekdes Alemu', 'mekdes@example.com');

-- Sample courses
INSERT INTO courses (course_id, course_name, credits) VALUES
(1, 'Database Systems', 3),
(2, 'Computer Networks', 4),
(3, 'Software Engineering', 3);

-- Sample enrolments
INSERT INTO enrolments (enrolment_id, student_id, course_id, grade) VALUES
(1, 1, 1, 'A'),
(2, 1, 2, 'B'),
(3, 2, 1, 'A'),
(4, 2, 3, 'B'),
(5, 3, 2, 'A');

-- Query 1: All courses taken by one student (by name).
SELECT s.name, c.course_name, e.grade
FROM students AS s
JOIN enrolments AS e ON s.student_id = e.student_id
JOIN courses AS c ON e.course_id = c.course_id
WHERE s.name = 'Abebe Kebede';

-- Query 2: All students enrolled in one course.
SELECT c.course_name, s.name
FROM courses AS c
JOIN enrolments AS e ON c.course_id = e.course_id
JOIN students AS s ON e.student_id = s.student_id
WHERE c.course_name = 'Database Systems';

-- Query 3: Number of students per course, including courses with zero students.
SELECT c.course_name, COUNT(e.student_id) AS student_count
FROM courses AS c
LEFT JOIN enrolments AS e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name;

-- Query 4: Students who have no enrolments.
SELECT s.student_id, s.name
FROM students AS s
LEFT JOIN enrolments AS e ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL;

-- Query 5: Update one enrolment's grade.
UPDATE enrolments
SET grade = 'A'
WHERE student_id = 1 AND course_id = 2;

-- Verify the updated grade.
SELECT s.name, c.course_name, e.grade
FROM enrolments AS e
JOIN students AS s ON e.student_id = s.student_id
JOIN courses AS c ON e.course_id = c.course_id
WHERE s.student_id = 1 AND c.course_id = 2;

-- Index to help look up enrolments by course.
CREATE INDEX idx_enrolments_course_id
ON enrolments(course_id);
