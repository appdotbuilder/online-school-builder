import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, studentProgressTable } from '../db/schema';
import { getStudentProgress, updateStudentProgress } from '../handlers/get_student_progress';
import { eq, and } from 'drizzle-orm';

describe('getStudentProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let studentId: number;
  let course1Id: number;
  let course2Id: number;
  let lesson1Id: number;
  let lesson2Id: number;
  let lesson3Id: number;

  beforeEach(async () => {
    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = studentResult[0].id;

    // Create test instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'moderator'
      })
      .returning()
      .execute();

    // Create test courses
    const course1Result = await db.insert(coursesTable)
      .values({
        title: 'Course 1',
        description: 'First course',
        owner_id: instructorResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();
    course1Id = course1Result[0].id;

    const course2Result = await db.insert(coursesTable)
      .values({
        title: 'Course 2',
        description: 'Second course',
        owner_id: instructorResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();
    course2Id = course2Result[0].id;

    // Create test lessons
    const lesson1Result = await db.insert(lessonsTable)
      .values({
        course_id: course1Id,
        title: 'Lesson 1',
        description: 'First lesson',
        order_index: 1
      })
      .returning()
      .execute();
    lesson1Id = lesson1Result[0].id;

    const lesson2Result = await db.insert(lessonsTable)
      .values({
        course_id: course1Id,
        title: 'Lesson 2',
        description: 'Second lesson',
        order_index: 2
      })
      .returning()
      .execute();
    lesson2Id = lesson2Result[0].id;

    const lesson3Result = await db.insert(lessonsTable)
      .values({
        course_id: course2Id,
        title: 'Lesson 3',
        description: 'Third lesson',
        order_index: 1
      })
      .returning()
      .execute();
    lesson3Id = lesson3Result[0].id;
  });

  it('should return empty array when no progress exists', async () => {
    const result = await getStudentProgress(studentId);

    expect(result).toHaveLength(0);
  });

  it('should get all progress for a student', async () => {
    // Create progress records
    await db.insert(studentProgressTable)
      .values([
        {
          student_id: studentId,
          lesson_id: lesson1Id,
          completed: true,
          completion_date: new Date(),
          time_spent: 30
        },
        {
          student_id: studentId,
          lesson_id: lesson2Id,
          completed: false,
          completion_date: null,
          time_spent: 15
        },
        {
          student_id: studentId,
          lesson_id: lesson3Id,
          completed: true,
          completion_date: new Date(),
          time_spent: 45
        }
      ])
      .execute();

    const result = await getStudentProgress(studentId);

    expect(result).toHaveLength(3);
    expect(result.some(p => p.lesson_id === lesson1Id && p.completed === true)).toBe(true);
    expect(result.some(p => p.lesson_id === lesson2Id && p.completed === false)).toBe(true);
    expect(result.some(p => p.lesson_id === lesson3Id && p.completed === true)).toBe(true);
  });

  it('should filter progress by course when courseId provided', async () => {
    // Create progress records for lessons in both courses
    await db.insert(studentProgressTable)
      .values([
        {
          student_id: studentId,
          lesson_id: lesson1Id, // course1
          completed: true,
          completion_date: new Date(),
          time_spent: 30
        },
        {
          student_id: studentId,
          lesson_id: lesson2Id, // course1
          completed: false,
          completion_date: null,
          time_spent: 15
        },
        {
          student_id: studentId,
          lesson_id: lesson3Id, // course2
          completed: true,
          completion_date: new Date(),
          time_spent: 45
        }
      ])
      .execute();

    const result = await getStudentProgress(studentId, course1Id);

    expect(result).toHaveLength(2);
    expect(result.every(p => p.lesson_id === lesson1Id || p.lesson_id === lesson2Id)).toBe(true);
    expect(result.some(p => p.lesson_id === lesson3Id)).toBe(false);
  });

  it('should return correct progress data structure', async () => {
    const now = new Date();
    await db.insert(studentProgressTable)
      .values({
        student_id: studentId,
        lesson_id: lesson1Id,
        completed: true,
        completion_date: now,
        time_spent: 30
      })
      .execute();

    const result = await getStudentProgress(studentId);

    expect(result).toHaveLength(1);
    const progress = result[0];
    expect(progress.student_id).toBe(studentId);
    expect(progress.lesson_id).toBe(lesson1Id);
    expect(progress.completed).toBe(true);
    expect(progress.completion_date).toBeInstanceOf(Date);
    expect(progress.time_spent).toBe(30);
    expect(progress.id).toBeDefined();
    expect(progress.created_at).toBeInstanceOf(Date);
    expect(progress.updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array for non-existent course', async () => {
    // Create progress record
    await db.insert(studentProgressTable)
      .values({
        student_id: studentId,
        lesson_id: lesson1Id,
        completed: true,
        completion_date: new Date(),
        time_spent: 30
      })
      .execute();

    const result = await getStudentProgress(studentId, 999);

    expect(result).toHaveLength(0);
  });
});

describe('updateStudentProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let studentId: number;
  let lessonId: number;

  beforeEach(async () => {
    // Create test student
    const studentResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    studentId = studentResult[0].id;

    // Create test instructor
    const instructorResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'moderator'
      })
      .returning()
      .execute();

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: instructorResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    // Create test lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A lesson for testing',
        order_index: 1
      })
      .returning()
      .execute();
    lessonId = lessonResult[0].id;
  });

  it('should create new progress record when none exists', async () => {
    const result = await updateStudentProgress(studentId, lessonId, 30, true);

    expect(result.student_id).toBe(studentId);
    expect(result.lesson_id).toBe(lessonId);
    expect(result.time_spent).toBe(30);
    expect(result.completed).toBe(true);
    expect(result.completion_date).toBeInstanceOf(Date);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify it was saved to database
    const saved = await db.select()
      .from(studentProgressTable)
      .where(eq(studentProgressTable.id, result.id))
      .execute();

    expect(saved).toHaveLength(1);
    expect(saved[0].student_id).toBe(studentId);
    expect(saved[0].completed).toBe(true);
  });

  it('should create incomplete progress when completed not specified', async () => {
    const result = await updateStudentProgress(studentId, lessonId, 15);

    expect(result.completed).toBe(false);
    expect(result.completion_date).toBeNull();
    expect(result.time_spent).toBe(15);
  });

  it('should update existing progress record by adding time', async () => {
    // Create initial progress
    await db.insert(studentProgressTable)
      .values({
        student_id: studentId,
        lesson_id: lessonId,
        completed: false,
        completion_date: null,
        time_spent: 20
      })
      .execute();

    const result = await updateStudentProgress(studentId, lessonId, 15, true);

    expect(result.time_spent).toBe(35); // 20 + 15
    expect(result.completed).toBe(true);
    expect(result.completion_date).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify database was updated
    const saved = await db.select()
      .from(studentProgressTable)
      .where(
        and(
          eq(studentProgressTable.student_id, studentId),
          eq(studentProgressTable.lesson_id, lessonId)
        )
      )
      .execute();

    expect(saved).toHaveLength(1);
    expect(saved[0].time_spent).toBe(35);
    expect(saved[0].completed).toBe(true);
  });

  it('should preserve completion date when already completed', async () => {
    const completionDate = new Date('2023-01-01');
    
    // Create completed progress
    await db.insert(studentProgressTable)
      .values({
        student_id: studentId,
        lesson_id: lessonId,
        completed: true,
        completion_date: completionDate,
        time_spent: 30
      })
      .execute();

    const result = await updateStudentProgress(studentId, lessonId, 10);

    expect(result.time_spent).toBe(40);
    expect(result.completed).toBe(true);
    expect(result.completion_date).toEqual(completionDate);
  });

  it('should update completion status when explicitly set', async () => {
    // Create incomplete progress
    await db.insert(studentProgressTable)
      .values({
        student_id: studentId,
        lesson_id: lessonId,
        completed: false,
        completion_date: null,
        time_spent: 25
      })
      .execute();

    const result = await updateStudentProgress(studentId, lessonId, 5, true);

    expect(result.completed).toBe(true);
    expect(result.completion_date).toBeInstanceOf(Date);
    expect(result.time_spent).toBe(30);
  });

  it('should handle zero time spent correctly', async () => {
    const result = await updateStudentProgress(studentId, lessonId, 0, false);

    expect(result.time_spent).toBe(0);
    expect(result.completed).toBe(false);
    expect(result.completion_date).toBeNull();
  });
});