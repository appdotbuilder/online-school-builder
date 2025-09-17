import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput, type CreateUserInput } from '../schema';
import { getCourses } from '../handlers/get_courses';

// Test user for course ownership
const testUser: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'Test',
  last_name: 'User',
  role: 'administrator'
};

// Test course inputs
const testCourse1: CreateCourseInput = {
  title: 'Introduction to Programming',
  description: 'Learn the basics of programming',
  owner_id: 1, // Will be set after user creation
  is_public: true,
  is_active: true
};

const testCourse2: CreateCourseInput = {
  title: 'Advanced Web Development',
  description: 'Advanced concepts in web development',
  owner_id: 1, // Will be set after user creation
  is_public: false,
  is_active: true
};

const testCourse3: CreateCourseInput = {
  title: 'Database Design',
  description: null,
  owner_id: 1, // Will be set after user creation
  is_public: true,
  is_active: false
};

describe('getCourses', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no courses exist', async () => {
    const result = await getCourses();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all courses when courses exist', async () => {
    // Create a user first (required for foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test courses
    await db.insert(coursesTable)
      .values([
        {
          ...testCourse1,
          owner_id: userId
        },
        {
          ...testCourse2,
          owner_id: userId
        },
        {
          ...testCourse3,
          owner_id: userId
        }
      ])
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(3);
    
    // Verify first course
    const course1 = result.find(c => c.title === 'Introduction to Programming');
    expect(course1).toBeDefined();
    expect(course1!.description).toBe('Learn the basics of programming');
    expect(course1!.owner_id).toBe(userId);
    expect(course1!.is_public).toBe(true);
    expect(course1!.is_active).toBe(true);
    expect(course1!.id).toBeDefined();
    expect(course1!.created_at).toBeInstanceOf(Date);
    expect(course1!.updated_at).toBeInstanceOf(Date);

    // Verify second course
    const course2 = result.find(c => c.title === 'Advanced Web Development');
    expect(course2).toBeDefined();
    expect(course2!.description).toBe('Advanced concepts in web development');
    expect(course2!.is_public).toBe(false);
    expect(course2!.is_active).toBe(true);

    // Verify third course (with null description and inactive)
    const course3 = result.find(c => c.title === 'Database Design');
    expect(course3).toBeDefined();
    expect(course3!.description).toBeNull();
    expect(course3!.is_public).toBe(true);
    expect(course3!.is_active).toBe(false);
  });

  it('should return courses with correct data types', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a test course
    await db.insert(coursesTable)
      .values({
        ...testCourse1,
        owner_id: userId
      })
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    const course = result[0];

    // Verify data types
    expect(typeof course.id).toBe('number');
    expect(typeof course.title).toBe('string');
    expect(typeof course.description).toBe('string');
    expect(typeof course.owner_id).toBe('number');
    expect(typeof course.is_public).toBe('boolean');
    expect(typeof course.is_active).toBe('boolean');
    expect(course.created_at).toBeInstanceOf(Date);
    expect(course.updated_at).toBeInstanceOf(Date);
  });

  it('should handle courses with null descriptions', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a course with null description
    await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: null,
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(1);
    expect(result[0].description).toBeNull();
    expect(result[0].title).toBe('Test Course');
  });

  it('should return courses in database insertion order', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash: 'hashed_password',
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        role: testUser.role
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create courses in specific order
    const course1Result = await db.insert(coursesTable)
      .values({
        title: 'First Course',
        description: 'First course description',
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const course2Result = await db.insert(coursesTable)
      .values({
        title: 'Second Course',
        description: 'Second course description',
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const result = await getCourses();

    expect(result).toHaveLength(2);
    
    // Verify courses are returned with their IDs in ascending order
    expect(result[0].id).toBe(course1Result[0].id);
    expect(result[0].title).toBe('First Course');
    expect(result[1].id).toBe(course2Result[0].id);
    expect(result[1].title).toBe('Second Course');
  });
});