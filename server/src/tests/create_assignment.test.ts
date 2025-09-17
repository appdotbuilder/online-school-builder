import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { assignmentsTable, usersTable, coursesTable, lessonsTable } from '../db/schema';
import { type CreateAssignmentInput } from '../schema';
import { createAssignment } from '../handlers/create_assignment';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateAssignmentInput = {
  lesson_id: 1,
  title: 'Test Assignment',
  description: 'A test assignment for students',
  evaluation_type: 'manual',
  due_date: new Date('2024-12-31T23:59:59Z'),
  max_points: 100
};

describe('createAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an assignment', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'moderator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    // Update test input with actual lesson ID
    const input = { ...testInput, lesson_id: lessonResult[0].id };

    const result = await createAssignment(input);

    // Basic field validation
    expect(result.lesson_id).toEqual(lessonResult[0].id);
    expect(result.title).toEqual('Test Assignment');
    expect(result.description).toEqual('A test assignment for students');
    expect(result.evaluation_type).toEqual('manual');
    expect(result.due_date).toEqual(new Date('2024-12-31T23:59:59Z'));
    expect(result.max_points).toEqual(100);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save assignment to database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'moderator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    // Update test input with actual lesson ID
    const input = { ...testInput, lesson_id: lessonResult[0].id };

    const result = await createAssignment(input);

    // Query database to verify assignment was saved
    const assignments = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, result.id))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].title).toEqual('Test Assignment');
    expect(assignments[0].description).toEqual('A test assignment for students');
    expect(assignments[0].evaluation_type).toEqual('manual');
    expect(assignments[0].due_date).toEqual(new Date('2024-12-31T23:59:59Z'));
    expect(assignments[0].max_points).toEqual(100);
    expect(assignments[0].lesson_id).toEqual(lessonResult[0].id);
    expect(assignments[0].created_at).toBeInstanceOf(Date);
  });

  it('should create assignment with automatic evaluation type', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'moderator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    const automaticInput: CreateAssignmentInput = {
      lesson_id: lessonResult[0].id,
      title: 'Automatic Assignment',
      description: 'An automatically graded assignment',
      evaluation_type: 'automatic',
      due_date: null,
      max_points: 50
    };

    const result = await createAssignment(automaticInput);

    expect(result.evaluation_type).toEqual('automatic');
    expect(result.due_date).toBeNull();
    expect(result.max_points).toEqual(50);
  });

  it('should create assignment with null description', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'moderator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    const nullDescriptionInput: CreateAssignmentInput = {
      lesson_id: lessonResult[0].id,
      title: 'Assignment Without Description',
      description: null,
      evaluation_type: 'manual',
      due_date: new Date('2024-06-15T12:00:00Z'),
      max_points: 75
    };

    const result = await createAssignment(nullDescriptionInput);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Assignment Without Description');
    expect(result.max_points).toEqual(75);
  });

  it('should throw error when lesson does not exist', async () => {
    const invalidInput: CreateAssignmentInput = {
      lesson_id: 999, // Non-existent lesson ID
      title: 'Invalid Assignment',
      description: 'This should fail',
      evaluation_type: 'manual',
      due_date: new Date('2024-12-31T23:59:59Z'),
      max_points: 100
    };

    await expect(createAssignment(invalidInput)).rejects.toThrow(/lesson with id 999 not found/i);
  });

  it('should handle different max_points values', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Teacher',
        role: 'moderator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: userResult[0].id
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    const lowPointsInput: CreateAssignmentInput = {
      lesson_id: lessonResult[0].id,
      title: 'Low Points Assignment',
      description: 'Assignment with low points',
      evaluation_type: 'automatic',
      due_date: null,
      max_points: 10
    };

    const result = await createAssignment(lowPointsInput);

    expect(result.max_points).toEqual(10);
    expect(typeof result.max_points).toBe('number');
  });
});