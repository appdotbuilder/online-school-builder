import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, courseEnrollmentsTable } from '../db/schema';
import { enrollStudent } from '../handlers/enroll_student';
import { eq, and } from 'drizzle-orm';

describe('enrollStudent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testStudent: { id: number };
  let testCourse: { id: number };
  let testModerator: { id: number };

  beforeEach(async () => {
    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    testStudent = studentResult[0];

    // Create test moderator (for course owner)
    const moderatorResult = await db.insert(usersTable)
      .values({
        email: 'moderator@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Moderator',
        role: 'moderator'
      })
      .returning()
      .execute();
    testModerator = moderatorResult[0];

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: testModerator.id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();
    testCourse = courseResult[0];
  });

  it('should successfully enroll a student in a course', async () => {
    const result = await enrollStudent(testCourse.id, testStudent.id);

    // Verify enrollment fields
    expect(result.course_id).toBe(testCourse.id);
    expect(result.student_id).toBe(testStudent.id);
    expect(result.progress_percentage).toBe(0);
    expect(result.id).toBeDefined();
    expect(result.enrolled_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should save enrollment to database', async () => {
    const result = await enrollStudent(testCourse.id, testStudent.id);

    // Verify enrollment was saved to database
    const enrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(eq(courseEnrollmentsTable.id, result.id))
      .execute();

    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].course_id).toBe(testCourse.id);
    expect(enrollments[0].student_id).toBe(testStudent.id);
    expect(enrollments[0].progress_percentage).toBe(0);
    expect(enrollments[0].enrolled_at).toBeInstanceOf(Date);
  });

  it('should throw error if student does not exist', async () => {
    const nonExistentStudentId = 99999;

    await expect(enrollStudent(testCourse.id, nonExistentStudentId))
      .rejects.toThrow(/Student with ID 99999 not found/i);
  });

  it('should throw error if course does not exist', async () => {
    const nonExistentCourseId = 99999;

    await expect(enrollStudent(nonExistentCourseId, testStudent.id))
      .rejects.toThrow(/Course with ID 99999 not found/i);
  });

  it('should throw error if user is not a student', async () => {
    await expect(enrollStudent(testCourse.id, testModerator.id))
      .rejects.toThrow(/User with ID .+ is not a student/i);
  });

  it('should throw error if course is not active', async () => {
    // Update course to inactive
    await db.update(coursesTable)
      .set({ is_active: false })
      .where(eq(coursesTable.id, testCourse.id))
      .execute();

    await expect(enrollStudent(testCourse.id, testStudent.id))
      .rejects.toThrow(/Course with ID .+ is not active/i);
  });

  it('should throw error if student is already enrolled', async () => {
    // First enrollment should succeed
    await enrollStudent(testCourse.id, testStudent.id);

    // Second enrollment should fail
    await expect(enrollStudent(testCourse.id, testStudent.id))
      .rejects.toThrow(/Student with ID .+ is already enrolled in course/i);
  });

  it('should allow same student to enroll in different courses', async () => {
    // Create another course
    const anotherCourseResult = await db.insert(coursesTable)
      .values({
        title: 'Another Course',
        description: 'Another course for testing',
        owner_id: testModerator.id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();
    const anotherCourse = anotherCourseResult[0];

    // Enroll in first course
    const firstEnrollment = await enrollStudent(testCourse.id, testStudent.id);

    // Enroll in second course should succeed
    const secondEnrollment = await enrollStudent(anotherCourse.id, testStudent.id);

    expect(firstEnrollment.course_id).toBe(testCourse.id);
    expect(secondEnrollment.course_id).toBe(anotherCourse.id);
    expect(firstEnrollment.student_id).toBe(testStudent.id);
    expect(secondEnrollment.student_id).toBe(testStudent.id);

    // Verify both enrollments exist in database
    const enrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(eq(courseEnrollmentsTable.student_id, testStudent.id))
      .execute();

    expect(enrollments).toHaveLength(2);
  });

  it('should allow different students to enroll in same course', async () => {
    // Create another student
    const anotherStudentResult = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Student2',
        role: 'student'
      })
      .returning()
      .execute();
    const anotherStudent = anotherStudentResult[0];

    // Enroll first student
    const firstEnrollment = await enrollStudent(testCourse.id, testStudent.id);

    // Enroll second student should succeed
    const secondEnrollment = await enrollStudent(testCourse.id, anotherStudent.id);

    expect(firstEnrollment.student_id).toBe(testStudent.id);
    expect(secondEnrollment.student_id).toBe(anotherStudent.id);
    expect(firstEnrollment.course_id).toBe(testCourse.id);
    expect(secondEnrollment.course_id).toBe(testCourse.id);

    // Verify both enrollments exist in database
    const enrollments = await db.select()
      .from(courseEnrollmentsTable)
      .where(eq(courseEnrollmentsTable.course_id, testCourse.id))
      .execute();

    expect(enrollments).toHaveLength(2);
  });
});