import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { lessonsTable, coursesTable, usersTable } from '../db/schema';
import { type CreateLessonInput } from '../schema';
import { createLesson } from '../handlers/create_lesson';
import { eq } from 'drizzle-orm';

describe('createLesson', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a lesson', async () => {
    // Create prerequisite user and course
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const testInput: CreateLessonInput = {
      course_id: courseResult[0].id,
      title: 'Introduction to Testing',
      description: 'Learn the basics of software testing',
      order_index: 1
    };

    const result = await createLesson(testInput);

    // Basic field validation
    expect(result.course_id).toEqual(courseResult[0].id);
    expect(result.title).toEqual('Introduction to Testing');
    expect(result.description).toEqual('Learn the basics of software testing');
    expect(result.order_index).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save lesson to database', async () => {
    // Create prerequisite user and course
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const testInput: CreateLessonInput = {
      course_id: courseResult[0].id,
      title: 'Advanced Testing',
      description: 'Deep dive into testing strategies',
      order_index: 2
    };

    const result = await createLesson(testInput);

    // Query using proper drizzle syntax
    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, result.id))
      .execute();

    expect(lessons).toHaveLength(1);
    expect(lessons[0].course_id).toEqual(courseResult[0].id);
    expect(lessons[0].title).toEqual('Advanced Testing');
    expect(lessons[0].description).toEqual('Deep dive into testing strategies');
    expect(lessons[0].order_index).toEqual(2);
    expect(lessons[0].created_at).toBeInstanceOf(Date);
    expect(lessons[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description', async () => {
    // Create prerequisite user and course
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const testInput: CreateLessonInput = {
      course_id: courseResult[0].id,
      title: 'Lesson Without Description',
      description: null,
      order_index: 1
    };

    const result = await createLesson(testInput);

    expect(result.title).toEqual('Lesson Without Description');
    expect(result.description).toBeNull();
    expect(result.order_index).toEqual(1);
    expect(result.id).toBeDefined();
  });

  it('should reject lesson creation for non-existent course', async () => {
    const testInput: CreateLessonInput = {
      course_id: 99999, // Non-existent course ID
      title: 'Orphaned Lesson',
      description: 'This lesson has no course',
      order_index: 1
    };

    await expect(createLesson(testInput)).rejects.toThrow(/Course with id 99999 does not exist/i);
  });

  it('should create multiple lessons with different order indices', async () => {
    // Create prerequisite user and course
    const userResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const lesson1Input: CreateLessonInput = {
      course_id: courseResult[0].id,
      title: 'Lesson 1',
      description: 'First lesson',
      order_index: 1
    };

    const lesson2Input: CreateLessonInput = {
      course_id: courseResult[0].id,
      title: 'Lesson 2',
      description: 'Second lesson',
      order_index: 2
    };

    const result1 = await createLesson(lesson1Input);
    const result2 = await createLesson(lesson2Input);

    expect(result1.order_index).toEqual(1);
    expect(result2.order_index).toEqual(2);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both lessons exist in database
    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseResult[0].id))
      .execute();

    expect(lessons).toHaveLength(2);
    expect(lessons.map(l => l.order_index).sort()).toEqual([1, 2]);
  });
});