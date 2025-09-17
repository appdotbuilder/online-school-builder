import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { testsTable, usersTable, coursesTable, lessonsTable, lessonContentTable } from '../db/schema';
import { type CreateTestInput } from '../schema';
import { createTest } from '../handlers/create_test';
import { eq } from 'drizzle-orm';

describe('createTest', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create prerequisite data
  const createPrerequisites = async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: userResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    // Create lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    // Create lesson content
    const lessonContentResult = await db.insert(lessonContentTable)
      .values({
        lesson_id: lessonResult[0].id,
        content_type: 'test',
        title: 'Test Content',
        content_data: '{"instructions": "Take this test"}',
        order_index: 1
      })
      .returning()
      .execute();

    return {
      user: userResult[0],
      course: courseResult[0],
      lesson: lessonResult[0],
      lessonContent: lessonContentResult[0]
    };
  };

  const testInput: CreateTestInput = {
    lesson_content_id: 1,
    title: 'Mathematics Quiz',
    description: 'Basic algebra test',
    time_limit: 60,
    max_attempts: 3
  };

  it('should create a test with all fields', async () => {
    const prerequisites = await createPrerequisites();
    const input = {
      ...testInput,
      lesson_content_id: prerequisites.lessonContent.id
    };

    const result = await createTest(input);

    expect(result.id).toBeDefined();
    expect(result.lesson_content_id).toEqual(prerequisites.lessonContent.id);
    expect(result.title).toEqual('Mathematics Quiz');
    expect(result.description).toEqual('Basic algebra test');
    expect(result.time_limit).toEqual(60);
    expect(result.max_attempts).toEqual(3);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a test with nullable fields', async () => {
    const prerequisites = await createPrerequisites();
    const input: CreateTestInput = {
      lesson_content_id: prerequisites.lessonContent.id,
      title: 'Simple Quiz',
      description: null,
      time_limit: null,
      max_attempts: null
    };

    const result = await createTest(input);

    expect(result.id).toBeDefined();
    expect(result.lesson_content_id).toEqual(prerequisites.lessonContent.id);
    expect(result.title).toEqual('Simple Quiz');
    expect(result.description).toBeNull();
    expect(result.time_limit).toBeNull();
    expect(result.max_attempts).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save test to database', async () => {
    const prerequisites = await createPrerequisites();
    const input = {
      ...testInput,
      lesson_content_id: prerequisites.lessonContent.id
    };

    const result = await createTest(input);

    const tests = await db.select()
      .from(testsTable)
      .where(eq(testsTable.id, result.id))
      .execute();

    expect(tests).toHaveLength(1);
    expect(tests[0].title).toEqual('Mathematics Quiz');
    expect(tests[0].description).toEqual('Basic algebra test');
    expect(tests[0].time_limit).toEqual(60);
    expect(tests[0].max_attempts).toEqual(3);
    expect(tests[0].lesson_content_id).toEqual(prerequisites.lessonContent.id);
    expect(tests[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject test creation with non-existent lesson content', async () => {
    const input = {
      ...testInput,
      lesson_content_id: 999999 // Non-existent lesson content ID
    };

    await expect(createTest(input)).rejects.toThrow(/lesson content.*not found/i);
  });

  it('should create multiple tests for same lesson content', async () => {
    const prerequisites = await createPrerequisites();
    
    const input1 = {
      lesson_content_id: prerequisites.lessonContent.id,
      title: 'Quiz 1',
      description: 'First quiz',
      time_limit: 30,
      max_attempts: 2
    };

    const input2 = {
      lesson_content_id: prerequisites.lessonContent.id,
      title: 'Quiz 2',
      description: 'Second quiz',
      time_limit: 45,
      max_attempts: 1
    };

    const result1 = await createTest(input1);
    const result2 = await createTest(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Quiz 1');
    expect(result2.title).toEqual('Quiz 2');
    expect(result1.lesson_content_id).toEqual(result2.lesson_content_id);

    // Verify both are in database
    const tests = await db.select()
      .from(testsTable)
      .where(eq(testsTable.lesson_content_id, prerequisites.lessonContent.id))
      .execute();

    expect(tests).toHaveLength(2);
  });

  it('should handle tests with zero time limits and attempts', async () => {
    const prerequisites = await createPrerequisites();
    const input: CreateTestInput = {
      lesson_content_id: prerequisites.lessonContent.id,
      title: 'Unlimited Test',
      description: 'Test with no restrictions',
      time_limit: 0,
      max_attempts: 0
    };

    const result = await createTest(input);

    expect(result.time_limit).toEqual(0);
    expect(result.max_attempts).toEqual(0);

    // Verify in database
    const test = await db.select()
      .from(testsTable)
      .where(eq(testsTable.id, result.id))
      .execute();

    expect(test[0].time_limit).toEqual(0);
    expect(test[0].max_attempts).toEqual(0);
  });
});