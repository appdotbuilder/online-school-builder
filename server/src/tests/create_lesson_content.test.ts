import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, lessonContentTable } from '../db/schema';
import { type CreateLessonContentInput } from '../schema';
import { createLessonContent } from '../handlers/create_lesson_content';
import { eq } from 'drizzle-orm';

describe('createLessonContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let courseId: number;
  let lessonId: number;

  beforeEach(async () => {
    // Create prerequisite user
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
    userId = userResult[0].id;

    // Create prerequisite course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();
    courseId = courseResult[0].id;

    // Create prerequisite lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();
    lessonId = lessonResult[0].id;
  });

  it('should create text content', async () => {
    const textInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'text',
      title: 'Introduction Text',
      content_data: JSON.stringify({
        content: 'This is the introductory text for the lesson.'
      }),
      order_index: 1
    };

    const result = await createLessonContent(textInput);

    expect(result.id).toBeDefined();
    expect(result.lesson_id).toEqual(lessonId);
    expect(result.content_type).toEqual('text');
    expect(result.title).toEqual('Introduction Text');
    expect(result.content_data).toEqual(textInput.content_data);
    expect(result.order_index).toEqual(1);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create video content', async () => {
    const videoInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'video',
      title: 'Tutorial Video',
      content_data: JSON.stringify({
        url: 'https://example.com/video.mp4',
        duration: 300
      }),
      order_index: 2
    };

    const result = await createLessonContent(videoInput);

    expect(result.content_type).toEqual('video');
    expect(result.title).toEqual('Tutorial Video');
    expect(result.order_index).toEqual(2);
    
    const parsedData = JSON.parse(result.content_data);
    expect(parsedData.url).toEqual('https://example.com/video.mp4');
    expect(parsedData.duration).toEqual(300);
  });

  it('should create file content', async () => {
    const fileInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'file',
      title: 'Resource PDF',
      content_data: JSON.stringify({
        file_id: 123,
        description: 'Important resource document'
      }),
      order_index: 3
    };

    const result = await createLessonContent(fileInput);

    expect(result.content_type).toEqual('file');
    expect(result.title).toEqual('Resource PDF');
    expect(result.order_index).toEqual(3);
    
    const parsedData = JSON.parse(result.content_data);
    expect(parsedData.file_id).toEqual(123);
    expect(parsedData.description).toEqual('Important resource document');
  });

  it('should create test content', async () => {
    const testInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'test',
      title: 'Knowledge Check',
      content_data: JSON.stringify({
        test_config: {
          time_limit: 30,
          max_attempts: 3,
          randomize_questions: true
        }
      }),
      order_index: 4
    };

    const result = await createLessonContent(testInput);

    expect(result.content_type).toEqual('test');
    expect(result.title).toEqual('Knowledge Check');
    expect(result.order_index).toEqual(4);
    
    const parsedData = JSON.parse(result.content_data);
    expect(parsedData.test_config).toBeDefined();
    expect(parsedData.test_config.time_limit).toEqual(30);
    expect(parsedData.test_config.max_attempts).toEqual(3);
  });

  it('should save content to database', async () => {
    const input: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'text',
      title: 'Test Content',
      content_data: JSON.stringify({ content: 'Test text content' }),
      order_index: 1
    };

    const result = await createLessonContent(input);

    // Verify content was saved to database
    const savedContent = await db.select()
      .from(lessonContentTable)
      .where(eq(lessonContentTable.id, result.id))
      .execute();

    expect(savedContent).toHaveLength(1);
    expect(savedContent[0].lesson_id).toEqual(lessonId);
    expect(savedContent[0].content_type).toEqual('text');
    expect(savedContent[0].title).toEqual('Test Content');
    expect(savedContent[0].order_index).toEqual(1);
    expect(savedContent[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent lesson', async () => {
    const input: CreateLessonContentInput = {
      lesson_id: 99999, // Non-existent lesson ID
      content_type: 'text',
      title: 'Test Content',
      content_data: JSON.stringify({ content: 'Test content' }),
      order_index: 1
    };

    await expect(createLessonContent(input)).rejects.toThrow(/lesson with id 99999 not found/i);
  });

  it('should validate text content data format', async () => {
    const invalidTextInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'text',
      title: 'Invalid Text',
      content_data: JSON.stringify({ invalid_field: 'missing content field' }),
      order_index: 1
    };

    await expect(createLessonContent(invalidTextInput)).rejects.toThrow(/text content must have a valid "content" string field/i);
  });

  it('should validate video content data format', async () => {
    const invalidVideoInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'video',
      title: 'Invalid Video',
      content_data: JSON.stringify({ invalid_field: 'missing url field' }),
      order_index: 1
    };

    await expect(createLessonContent(invalidVideoInput)).rejects.toThrow(/video content must have a valid "url" string field/i);
  });

  it('should validate file content data format', async () => {
    const invalidFileInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'file',
      title: 'Invalid File',
      content_data: JSON.stringify({ invalid_field: 'missing file_id field' }),
      order_index: 1
    };

    await expect(createLessonContent(invalidFileInput)).rejects.toThrow(/file content must have a valid "file_id" number field/i);
  });

  it('should validate test content data format', async () => {
    const invalidTestInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'test',
      title: 'Invalid Test',
      content_data: JSON.stringify({ invalid_field: 'missing test_config field' }),
      order_index: 1
    };

    await expect(createLessonContent(invalidTestInput)).rejects.toThrow(/test content must have a valid "test_config" object field/i);
  });

  it('should validate JSON format of content_data', async () => {
    const invalidJSONInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'text',
      title: 'Invalid JSON',
      content_data: 'invalid json string', // Not valid JSON
      order_index: 1
    };

    await expect(createLessonContent(invalidJSONInput)).rejects.toThrow(/content_data must be valid json/i);
  });

  it('should handle video content with optional duration', async () => {
    const videoInputNoDuration: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'video',
      title: 'Video No Duration',
      content_data: JSON.stringify({
        url: 'https://example.com/video.mp4'
        // duration is optional
      }),
      order_index: 1
    };

    const result = await createLessonContent(videoInputNoDuration);
    expect(result.content_type).toEqual('video');
    
    const parsedData = JSON.parse(result.content_data);
    expect(parsedData.url).toEqual('https://example.com/video.mp4');
    expect(parsedData.duration).toBeUndefined();
  });

  it('should validate video duration type when provided', async () => {
    const invalidDurationInput: CreateLessonContentInput = {
      lesson_id: lessonId,
      content_type: 'video',
      title: 'Invalid Duration',
      content_data: JSON.stringify({
        url: 'https://example.com/video.mp4',
        duration: 'invalid_duration' // Should be number
      }),
      order_index: 1
    };

    await expect(createLessonContent(invalidDurationInput)).rejects.toThrow(/video duration must be a number if provided/i);
  });
});