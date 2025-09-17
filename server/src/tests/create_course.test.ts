import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInput } from '../schema';
import { createCourse } from '../handlers/create_course';
import { eq } from 'drizzle-orm';

describe('createCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first since courses require an owner
    const userResult = await db.insert(usersTable)
      .values({
        email: 'testowner@example.com',
        password_hash: 'hashedpassword123',
        first_name: 'Test',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;
  });

  it('should create a course with all fields', async () => {
    const testInput: CreateCourseInput = {
      title: 'Introduction to TypeScript',
      description: 'Learn the basics of TypeScript programming',
      owner_id: testUserId,
      is_public: true,
      is_active: true
    };

    const result = await createCourse(testInput);

    // Verify returned data
    expect(result.title).toEqual('Introduction to TypeScript');
    expect(result.description).toEqual('Learn the basics of TypeScript programming');
    expect(result.owner_id).toEqual(testUserId);
    expect(result.is_public).toBe(true);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a course with default values when optional fields are omitted', async () => {
    const testInput: CreateCourseInput = {
      title: 'Basic Course',
      description: null,
      owner_id: testUserId
      // is_public and is_active omitted to test defaults
    };

    const result = await createCourse(testInput);

    // Verify default values are applied
    expect(result.title).toEqual('Basic Course');
    expect(result.description).toBeNull();
    expect(result.owner_id).toEqual(testUserId);
    expect(result.is_public).toBe(false); // Default value
    expect(result.is_active).toBe(true);   // Default value
    expect(result.id).toBeDefined();
  });

  it('should create a course with explicit false values', async () => {
    const testInput: CreateCourseInput = {
      title: 'Private Inactive Course',
      description: 'A course that is private and inactive',
      owner_id: testUserId,
      is_public: false,
      is_active: false
    };

    const result = await createCourse(testInput);

    // Verify explicit false values are respected
    expect(result.is_public).toBe(false);
    expect(result.is_active).toBe(false);
  });

  it('should save course to database correctly', async () => {
    const testInput: CreateCourseInput = {
      title: 'Database Test Course',
      description: 'Testing database persistence',
      owner_id: testUserId,
      is_public: true,
      is_active: true
    };

    const result = await createCourse(testInput);

    // Query database to verify persistence
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('Database Test Course');
    expect(courses[0].description).toEqual('Testing database persistence');
    expect(courses[0].owner_id).toEqual(testUserId);
    expect(courses[0].is_public).toBe(true);
    expect(courses[0].is_active).toBe(true);
    expect(courses[0].created_at).toBeInstanceOf(Date);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description correctly', async () => {
    const testInput: CreateCourseInput = {
      title: 'Course without description',
      description: null,
      owner_id: testUserId,
      is_public: false,
      is_active: true
    };

    const result = await createCourse(testInput);

    expect(result.description).toBeNull();
    
    // Verify in database
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();
    
    expect(courses[0].description).toBeNull();
  });

  it('should throw error for non-existent owner', async () => {
    const testInput: CreateCourseInput = {
      title: 'Invalid Owner Course',
      description: 'Course with invalid owner',
      owner_id: 99999, // Non-existent user ID
      is_public: false,
      is_active: true
    };

    await expect(createCourse(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });

  it('should create multiple courses for same owner', async () => {
    const inputs = [
      {
        title: 'Course 1',
        description: 'First course',
        owner_id: testUserId,
        is_public: true,
        is_active: true
      },
      {
        title: 'Course 2', 
        description: 'Second course',
        owner_id: testUserId,
        is_public: false,
        is_active: true
      }
    ];

    const results = await Promise.all(inputs.map(input => createCourse(input)));

    expect(results).toHaveLength(2);
    expect(results[0].title).toEqual('Course 1');
    expect(results[1].title).toEqual('Course 2');
    expect(results[0].owner_id).toEqual(testUserId);
    expect(results[1].owner_id).toEqual(testUserId);
    
    // Verify different IDs
    expect(results[0].id).not.toEqual(results[1].id);
  });
});