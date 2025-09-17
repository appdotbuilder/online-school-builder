import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable } from '../db/schema';
import { type UpdateLessonInput } from '../schema';
import { updateLesson } from '../handlers/update_lesson';
import { eq } from 'drizzle-orm';

// Helper function to create a test user
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      first_name: 'Test',
      last_name: 'User',
      role: 'administrator'
    })
    .returning()
    .execute();
  return result[0];
};

// Helper function to create a test course
const createTestCourse = async (ownerId: number) => {
  const result = await db.insert(coursesTable)
    .values({
      title: 'Test Course',
      description: 'A course for testing',
      owner_id: ownerId,
      is_public: true,
      is_active: true
    })
    .returning()
    .execute();
  return result[0];
};

// Helper function to create a test lesson
const createTestLesson = async (courseId: number) => {
  const result = await db.insert(lessonsTable)
    .values({
      course_id: courseId,
      title: 'Original Title',
      description: 'Original description',
      order_index: 1
    })
    .returning()
    .execute();
  return result[0];
};

describe('updateLesson', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update lesson title', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);
    const lesson = await createTestLesson(course.id);

    const updateInput: UpdateLessonInput = {
      id: lesson.id,
      title: 'Updated Title'
    };

    const result = await updateLesson(updateInput);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.order_index).toEqual(1); // Should remain unchanged
    expect(result.course_id).toEqual(course.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true);
  });

  it('should update lesson description', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);
    const lesson = await createTestLesson(course.id);

    const updateInput: UpdateLessonInput = {
      id: lesson.id,
      description: 'Updated description'
    };

    const result = await updateLesson(updateInput);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.order_index).toEqual(1); // Should remain unchanged
    expect(result.course_id).toEqual(course.id);
  });

  it('should update lesson description to null', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);
    const lesson = await createTestLesson(course.id);

    const updateInput: UpdateLessonInput = {
      id: lesson.id,
      description: null
    };

    const result = await updateLesson(updateInput);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Original Title');
    expect(result.description).toBeNull();
    expect(result.order_index).toEqual(1);
    expect(result.course_id).toEqual(course.id);
  });

  it('should update lesson order_index', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);
    const lesson = await createTestLesson(course.id);

    const updateInput: UpdateLessonInput = {
      id: lesson.id,
      order_index: 5
    };

    const result = await updateLesson(updateInput);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Original Title');
    expect(result.description).toEqual('Original description');
    expect(result.order_index).toEqual(5);
    expect(result.course_id).toEqual(course.id);
  });

  it('should update multiple fields at once', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);
    const lesson = await createTestLesson(course.id);

    const updateInput: UpdateLessonInput = {
      id: lesson.id,
      title: 'Completely New Title',
      description: 'Completely new description',
      order_index: 10
    };

    const result = await updateLesson(updateInput);

    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Completely New Title');
    expect(result.description).toEqual('Completely new description');
    expect(result.order_index).toEqual(10);
    expect(result.course_id).toEqual(course.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true);
  });

  it('should save updated lesson to database', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);
    const lesson = await createTestLesson(course.id);

    const updateInput: UpdateLessonInput = {
      id: lesson.id,
      title: 'Database Updated Title',
      order_index: 3
    };

    await updateLesson(updateInput);

    // Verify the changes are persisted in the database
    const savedLessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lesson.id))
      .execute();

    expect(savedLessons).toHaveLength(1);
    expect(savedLessons[0].title).toEqual('Database Updated Title');
    expect(savedLessons[0].description).toEqual('Original description'); // Unchanged
    expect(savedLessons[0].order_index).toEqual(3);
    expect(savedLessons[0].updated_at).toBeInstanceOf(Date);
    expect(savedLessons[0].updated_at > lesson.updated_at).toBe(true);
  });

  it('should throw error when lesson does not exist', async () => {
    const updateInput: UpdateLessonInput = {
      id: 999999, // Non-existent lesson ID
      title: 'This should fail'
    };

    await expect(updateLesson(updateInput)).rejects.toThrow(/Lesson with id 999999 not found/i);
  });

  it('should handle update with only id provided (no changes)', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);
    const lesson = await createTestLesson(course.id);

    const updateInput: UpdateLessonInput = {
      id: lesson.id
    };

    const result = await updateLesson(updateInput);

    // Should only update the updated_at timestamp
    expect(result.id).toEqual(lesson.id);
    expect(result.title).toEqual('Original Title');
    expect(result.description).toEqual('Original description');
    expect(result.order_index).toEqual(1);
    expect(result.course_id).toEqual(course.id);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > lesson.updated_at).toBe(true);
  });

  it('should handle order_index of 0', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);
    const lesson = await createTestLesson(course.id);

    const updateInput: UpdateLessonInput = {
      id: lesson.id,
      order_index: 0
    };

    const result = await updateLesson(updateInput);

    expect(result.order_index).toEqual(0);
    expect(result.title).toEqual('Original Title');
    expect(result.description).toEqual('Original description');
  });
});