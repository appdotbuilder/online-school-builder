import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, lessonContentTable } from '../db/schema';
import { getLessonContent } from '../handlers/get_lesson_content';

// Test data setup
const testUser = {
  email: 'teacher@test.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Teacher',
  role: 'moderator' as const
};

const testCourse = {
  title: 'Test Course',
  description: 'A course for testing',
  is_public: true,
  is_active: true
};

const testLesson = {
  title: 'Test Lesson',
  description: 'A lesson for testing',
  order_index: 1
};

const testLessonContent = [
  {
    content_type: 'text' as const,
    title: 'Introduction Text',
    content_data: JSON.stringify({ text: 'Welcome to the lesson' }),
    order_index: 1
  },
  {
    content_type: 'video' as const,
    title: 'Tutorial Video',
    content_data: JSON.stringify({ video_url: 'https://example.com/video.mp4' }),
    order_index: 2
  },
  {
    content_type: 'file' as const,
    title: 'Resource Document',
    content_data: JSON.stringify({ file_id: 123 }),
    order_index: 3
  }
];

describe('getLessonContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return lesson content ordered by order_index', async () => {
    // Create user
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();

    // Create course
    const [course] = await db.insert(coursesTable).values({
      ...testCourse,
      owner_id: user.id
    }).returning().execute();

    // Create lesson
    const [lesson] = await db.insert(lessonsTable).values({
      ...testLesson,
      course_id: course.id
    }).returning().execute();

    // Create lesson content with mixed order
    const contentToInsert = [
      { ...testLessonContent[1], lesson_id: lesson.id }, // order_index: 2
      { ...testLessonContent[0], lesson_id: lesson.id }, // order_index: 1  
      { ...testLessonContent[2], lesson_id: lesson.id }  // order_index: 3
    ];
    
    await db.insert(lessonContentTable).values(contentToInsert).execute();

    // Test the handler
    const result = await getLessonContent(lesson.id);

    // Verify correct ordering
    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Introduction Text');
    expect(result[0].order_index).toEqual(1);
    expect(result[0].content_type).toEqual('text');
    
    expect(result[1].title).toEqual('Tutorial Video');
    expect(result[1].order_index).toEqual(2);
    expect(result[1].content_type).toEqual('video');
    
    expect(result[2].title).toEqual('Resource Document');
    expect(result[2].order_index).toEqual(3);
    expect(result[2].content_type).toEqual('file');

    // Verify all fields are present
    result.forEach(content => {
      expect(content.id).toBeDefined();
      expect(content.lesson_id).toEqual(lesson.id);
      expect(content.content_type).toBeDefined();
      expect(content.title).toBeDefined();
      expect(content.content_data).toBeDefined();
      expect(content.order_index).toBeDefined();
      expect(content.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for lesson with no content', async () => {
    // Create user
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();

    // Create course
    const [course] = await db.insert(coursesTable).values({
      ...testCourse,
      owner_id: user.id
    }).returning().execute();

    // Create lesson without content
    const [lesson] = await db.insert(lessonsTable).values({
      ...testLesson,
      course_id: course.id
    }).returning().execute();

    // Test the handler
    const result = await getLessonContent(lesson.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent lesson', async () => {
    const nonExistentLessonId = 999999;
    
    // Test the handler with non-existent lesson
    const result = await getLessonContent(nonExistentLessonId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return content for specified lesson', async () => {
    // Create user
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();

    // Create course
    const [course] = await db.insert(coursesTable).values({
      ...testCourse,
      owner_id: user.id
    }).returning().execute();

    // Create two lessons
    const [lesson1] = await db.insert(lessonsTable).values({
      ...testLesson,
      course_id: course.id,
      title: 'Lesson 1'
    }).returning().execute();

    const [lesson2] = await db.insert(lessonsTable).values({
      ...testLesson,
      course_id: course.id,
      title: 'Lesson 2',
      order_index: 2
    }).returning().execute();

    // Create content for both lessons
    await db.insert(lessonContentTable).values([
      { ...testLessonContent[0], lesson_id: lesson1.id, title: 'Lesson 1 Content' },
      { ...testLessonContent[1], lesson_id: lesson2.id, title: 'Lesson 2 Content' }
    ]).execute();

    // Test getting content for lesson 1
    const result1 = await getLessonContent(lesson1.id);
    expect(result1).toHaveLength(1);
    expect(result1[0].title).toEqual('Lesson 1 Content');
    expect(result1[0].lesson_id).toEqual(lesson1.id);

    // Test getting content for lesson 2
    const result2 = await getLessonContent(lesson2.id);
    expect(result2).toHaveLength(1);
    expect(result2[0].title).toEqual('Lesson 2 Content');
    expect(result2[0].lesson_id).toEqual(lesson2.id);
  });

  it('should handle different content types correctly', async () => {
    // Create user
    const [user] = await db.insert(usersTable).values(testUser).returning().execute();

    // Create course
    const [course] = await db.insert(coursesTable).values({
      ...testCourse,
      owner_id: user.id
    }).returning().execute();

    // Create lesson
    const [lesson] = await db.insert(lessonsTable).values({
      ...testLesson,
      course_id: course.id
    }).returning().execute();

    // Create content with all supported types
    const allContentTypes = [
      {
        lesson_id: lesson.id,
        content_type: 'text' as const,
        title: 'Text Content',
        content_data: JSON.stringify({ text: 'Sample text' }),
        order_index: 1
      },
      {
        lesson_id: lesson.id,
        content_type: 'video' as const,
        title: 'Video Content',
        content_data: JSON.stringify({ video_url: 'https://example.com/video' }),
        order_index: 2
      },
      {
        lesson_id: lesson.id,
        content_type: 'file' as const,
        title: 'File Content',
        content_data: JSON.stringify({ file_id: 456 }),
        order_index: 3
      },
      {
        lesson_id: lesson.id,
        content_type: 'test' as const,
        title: 'Test Content',
        content_data: JSON.stringify({ test_id: 789 }),
        order_index: 4
      }
    ];

    await db.insert(lessonContentTable).values(allContentTypes).execute();

    // Test the handler
    const result = await getLessonContent(lesson.id);

    expect(result).toHaveLength(4);
    
    const contentTypes = result.map(content => content.content_type);
    expect(contentTypes).toEqual(['text', 'video', 'file', 'test']);

    // Verify content_data is preserved as string
    result.forEach(content => {
      expect(typeof content.content_data).toBe('string');
      expect(() => JSON.parse(content.content_data)).not.toThrow();
    });
  });
});