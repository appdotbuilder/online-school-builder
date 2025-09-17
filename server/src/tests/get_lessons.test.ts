import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable } from '../db/schema';
import { getLessonsByCourse } from '../handlers/get_lessons';

describe('getLessonsByCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return lessons ordered by order_index', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'moderator'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing lessons',
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create lessons with different order_index values
    await db.insert(lessonsTable)
      .values([
        {
          course_id: courseId,
          title: 'Third Lesson',
          description: 'This should appear third',
          order_index: 3
        },
        {
          course_id: courseId,
          title: 'First Lesson',
          description: 'This should appear first',
          order_index: 1
        },
        {
          course_id: courseId,
          title: 'Second Lesson',
          description: 'This should appear second',
          order_index: 2
        }
      ])
      .execute();

    const lessons = await getLessonsByCourse(courseId);

    expect(lessons).toHaveLength(3);
    expect(lessons[0].title).toEqual('First Lesson');
    expect(lessons[0].order_index).toEqual(1);
    expect(lessons[1].title).toEqual('Second Lesson');
    expect(lessons[1].order_index).toEqual(2);
    expect(lessons[2].title).toEqual('Third Lesson');
    expect(lessons[2].order_index).toEqual(3);
  });

  it('should return empty array for course with no lessons', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'moderator'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test course with no lessons
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Empty Course',
        description: 'A course with no lessons',
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    const lessons = await getLessonsByCourse(courseId);

    expect(lessons).toHaveLength(0);
    expect(lessons).toEqual([]);
  });

  it('should return empty array for non-existent course', async () => {
    const nonExistentCourseId = 99999;

    const lessons = await getLessonsByCourse(nonExistentCourseId);

    expect(lessons).toHaveLength(0);
    expect(lessons).toEqual([]);
  });

  it('should return all lesson fields correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'moderator'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create lesson with all fields
    await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Complete Lesson',
        description: 'A lesson with all fields populated',
        order_index: 1
      })
      .execute();

    const lessons = await getLessonsByCourse(courseId);

    expect(lessons).toHaveLength(1);
    const lesson = lessons[0];
    
    expect(lesson.id).toBeDefined();
    expect(lesson.course_id).toEqual(courseId);
    expect(lesson.title).toEqual('Complete Lesson');
    expect(lesson.description).toEqual('A lesson with all fields populated');
    expect(lesson.order_index).toEqual(1);
    expect(lesson.created_at).toBeInstanceOf(Date);
    expect(lesson.updated_at).toBeInstanceOf(Date);
  });

  it('should handle lessons with null descriptions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'moderator'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const courseId = courseResult[0].id;

    // Create lesson with null description
    await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Lesson Without Description',
        description: null,
        order_index: 1
      })
      .execute();

    const lessons = await getLessonsByCourse(courseId);

    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toEqual('Lesson Without Description');
    expect(lessons[0].description).toBeNull();
    expect(lessons[0].order_index).toEqual(1);
  });

  it('should only return lessons for the specified course', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hash123',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'moderator'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create two test courses
    const courseResults = await db.insert(coursesTable)
      .values([
        {
          title: 'Course 1',
          description: 'First course',
          owner_id: userId,
          is_public: true,
          is_active: true
        },
        {
          title: 'Course 2',
          description: 'Second course',
          owner_id: userId,
          is_public: true,
          is_active: true
        }
      ])
      .returning()
      .execute();

    const course1Id = courseResults[0].id;
    const course2Id = courseResults[1].id;

    // Create lessons for both courses
    await db.insert(lessonsTable)
      .values([
        {
          course_id: course1Id,
          title: 'Course 1 Lesson 1',
          description: 'First lesson of course 1',
          order_index: 1
        },
        {
          course_id: course1Id,
          title: 'Course 1 Lesson 2',
          description: 'Second lesson of course 1',
          order_index: 2
        },
        {
          course_id: course2Id,
          title: 'Course 2 Lesson 1',
          description: 'First lesson of course 2',
          order_index: 1
        }
      ])
      .execute();

    // Get lessons for course 1
    const course1Lessons = await getLessonsByCourse(course1Id);

    expect(course1Lessons).toHaveLength(2);
    expect(course1Lessons[0].title).toEqual('Course 1 Lesson 1');
    expect(course1Lessons[1].title).toEqual('Course 1 Lesson 2');
    expect(course1Lessons.every(lesson => lesson.course_id === course1Id)).toBe(true);

    // Get lessons for course 2
    const course2Lessons = await getLessonsByCourse(course2Id);

    expect(course2Lessons).toHaveLength(1);
    expect(course2Lessons[0].title).toEqual('Course 2 Lesson 1');
    expect(course2Lessons[0].course_id).toEqual(course2Id);
  });
});