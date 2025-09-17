import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type UpdateCourseInput } from '../schema';
import { updateCourse } from '../handlers/update_course';
import { eq } from 'drizzle-orm';

describe('updateCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
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

    return userResult[0];
  };

  // Helper function to create a test course
  const createTestCourse = async (ownerId: number) => {
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Original Course',
        description: 'Original description',
        owner_id: ownerId,
        is_public: false,
        is_active: true
      })
      .returning()
      .execute();

    return courseResult[0];
  };

  it('should update course title', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Updated Course Title'
    };

    const result = await updateCourse(updateInput);

    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Updated Course Title');
    expect(result.description).toEqual('Original description');
    expect(result.owner_id).toEqual(user.id);
    expect(result.is_public).toEqual(false);
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > course.updated_at).toBe(true);
  });

  it('should update course description', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    const updateInput: UpdateCourseInput = {
      id: course.id,
      description: 'Updated course description'
    };

    const result = await updateCourse(updateInput);

    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Original Course');
    expect(result.description).toEqual('Updated course description');
    expect(result.owner_id).toEqual(user.id);
    expect(result.is_public).toEqual(false);
    expect(result.is_active).toEqual(true);
  });

  it('should update course visibility', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    const updateInput: UpdateCourseInput = {
      id: course.id,
      is_public: true
    };

    const result = await updateCourse(updateInput);

    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Original Course');
    expect(result.description).toEqual('Original description');
    expect(result.owner_id).toEqual(user.id);
    expect(result.is_public).toEqual(true);
    expect(result.is_active).toEqual(true);
  });

  it('should update course active status', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    const updateInput: UpdateCourseInput = {
      id: course.id,
      is_active: false
    };

    const result = await updateCourse(updateInput);

    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Original Course');
    expect(result.description).toEqual('Original description');
    expect(result.owner_id).toEqual(user.id);
    expect(result.is_public).toEqual(false);
    expect(result.is_active).toEqual(false);
  });

  it('should update multiple fields at once', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Completely Updated Course',
      description: 'New and improved description',
      is_public: true,
      is_active: false
    };

    const result = await updateCourse(updateInput);

    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Completely Updated Course');
    expect(result.description).toEqual('New and improved description');
    expect(result.owner_id).toEqual(user.id);
    expect(result.is_public).toEqual(true);
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null when explicitly provided', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    const updateInput: UpdateCourseInput = {
      id: course.id,
      description: null
    };

    const result = await updateCourse(updateInput);

    expect(result.id).toEqual(course.id);
    expect(result.title).toEqual('Original Course');
    expect(result.description).toBeNull();
    expect(result.owner_id).toEqual(user.id);
    expect(result.is_public).toEqual(false);
    expect(result.is_active).toEqual(true);
  });

  it('should save changes to database', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Database Updated Title',
      is_public: true
    };

    await updateCourse(updateInput);

    // Verify the changes were saved to database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, course.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Database Updated Title');
    expect(courses[0].is_public).toEqual(true);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
    expect(courses[0].updated_at > course.updated_at).toBe(true);
  });

  it('should throw error for non-existent course', async () => {
    const updateInput: UpdateCourseInput = {
      id: 999999, // Non-existent ID
      title: 'Updated Title'
    };

    await expect(updateCourse(updateInput)).rejects.toThrow(/Course with id 999999 not found/i);
  });

  it('should only update provided fields', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Only Title Updated'
    };

    const result = await updateCourse(updateInput);

    // Verify only the title was updated, other fields remain unchanged
    expect(result.title).toEqual('Only Title Updated');
    expect(result.description).toEqual(course.description);
    expect(result.is_public).toEqual(course.is_public);
    expect(result.is_active).toEqual(course.is_active);
    expect(result.owner_id).toEqual(course.owner_id);
  });

  it('should always update the updated_at timestamp', async () => {
    const user = await createTestUser();
    const course = await createTestCourse(user.id);

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateCourseInput = {
      id: course.id,
      title: 'Timestamp Test'
    };

    const result = await updateCourse(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(course.updated_at.getTime());
  });
});