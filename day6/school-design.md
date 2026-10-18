# School Database Design

## Tables

- **Students:** Stores each student's ID, name, and email. The student ID is the primary key, and the email is unique and required.
- **Courses:** Stores each course's ID, name, and credit value. The course ID is the primary key, and the name and credits are required.
- **Enrolments:** Records which student takes which course, along with the student's grade. Its primary key identifies each enrolment, while foreign keys reference the students and courses tables. A unique constraint on the student ID and course ID prevents duplicate enrolments.

## Relationships

The relationship between students and enrolments is one-to-many because one student can enrol in several courses, while each enrolment belongs to one student. The relationship between courses and enrolments is also one-to-many because one course can have many enrolments, while each enrolment refers to one course.

Students and courses therefore have a many-to-many relationship: a student can take several courses, and a course can contain several students. The enrolments table is needed as a join table to connect these entities and store relationship-specific information, such as grades.

## Index

I would add an index on `enrolments(course_id)` to help the database find students enrolled in a particular course more efficiently. This is useful for course enrolment lists and course-level reports.

## SQL or NoSQL?

I would choose a relational SQL database for this school system. Students, courses, and enrolments have clear relationships, and foreign keys help maintain referential integrity. Constraints can prevent duplicate enrolments and invalid records. SQL joins and grouping also make it straightforward to generate course lists and enrolment statistics. A NoSQL database could be useful for flexible or document-oriented data, but its flexibility is not necessary for this structured system.
