import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, lessonContentTable } from '../db/schema';
import { type UpdateLessonContentInput } from '../schema';
import { updateLessonContent } from '../handlers/update_lesson_content';
import { eq } from 'drizzle-orm';

describe('updateLessonContent', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let courseId: number;
  let lessonId: number;
  let lessonContentId: number;

  beforeEach(async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'Course for testing',
        owner_id: userId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();
    courseId = courseResult[0].id;

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseId,
        title: 'Test Lesson',
        description: 'Lesson for testing',
        order_index: 1
      })
      .returning()
      .execute();
    lessonId = lessonResult[0].id;

    const lessonContentResult = await db.insert(lessonContentTable)
      .values({
        lesson_id: lessonId,
        content_type: 'text',
        title: 'Original Content Title',
        content_data: '{"text": "Original content"}',
        order_index: 1
      })
      .returning()
      .execute();
    lessonContentId = lessonContentResult[0].id;
  });

  it('should update lesson content title', async () => {
    const input: UpdateLessonContentInput = {
      id: lessonContentId,
      title: 'Updated Content Title'
    };

    const result = await updateLessonContent(input);

    expect(result.id).toEqual(lessonContentId);
    expect(result.title).toEqual('Updated Content Title');
    expect(result.content_data).toEqual('{"text": "Original content"}'); // Should remain unchanged
    expect(result.order_index).toEqual(1); // Should remain unchanged
    expect(result.lesson_id).toEqual(lessonId);
    expect(result.content_type).toEqual('text');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update lesson content data', async () => {
    const newContentData = '{"text": "Updated content", "metadata": {"version": 2}}';
    const input: UpdateLessonContentInput = {
      id: lessonContentId,
      content_data: newContentData
    };

    const result = await updateLessonContent(input);

    expect(result.id).toEqual(lessonContentId);
    expect(result.content_data).toEqual(newContentData);
    expect(result.title).toEqual('Original Content Title'); // Should remain unchanged
    expect(result.order_index).toEqual(1); // Should remain unchanged
  });

  it('should update lesson content order index', async () => {
    const input: UpdateLessonContentInput = {
      id: lessonContentId,
      order_index: 5
    };

    const result = await updateLessonContent(input);

    expect(result.id).toEqual(lessonContentId);
    expect(result.order_index).toEqual(5);
    expect(result.title).toEqual('Original Content Title'); // Should remain unchanged
    expect(result.content_data).toEqual('{"text": "Original content"}'); // Should remain unchanged
  });

  it('should update multiple fields simultaneously', async () => {
    const input: UpdateLessonContentInput = {
      id: lessonContentId,
      title: 'Completely Updated Title',
      content_data: '{"video": "updated-video.mp4", "duration": 300}',
      order_index: 10
    };

    const result = await updateLessonContent(input);

    expect(result.id).toEqual(lessonContentId);
    expect(result.title).toEqual('Completely Updated Title');
    expect(result.content_data).toEqual('{"video": "updated-video.mp4", "duration": 300}');
    expect(result.order_index).toEqual(10);
    expect(result.lesson_id).toEqual(lessonId);
    expect(result.content_type).toEqual('text');
  });

  it('should persist changes to database', async () => {
    const input: UpdateLessonContentInput = {
      id: lessonContentId,
      title: 'Database Persistence Test',
      content_data: '{"test": "persistence"}',
      order_index: 99
    };

    await updateLessonContent(input);

    // Query database directly to verify changes
    const savedContent = await db.select()
      .from(lessonContentTable)
      .where(eq(lessonContentTable.id, lessonContentId))
      .execute();

    expect(savedContent).toHaveLength(1);
    expect(savedContent[0].title).toEqual('Database Persistence Test');
    expect(savedContent[0].content_data).toEqual('{"test": "persistence"}');
    expect(savedContent[0].order_index).toEqual(99);
    expect(savedContent[0].lesson_id).toEqual(lessonId);
  });

  it('should throw error when lesson content not found', async () => {
    const input: UpdateLessonContentInput = {
      id: 99999, // Non-existent ID
      title: 'This will fail'
    };

    expect(updateLessonContent(input)).rejects.toThrow(/lesson content not found/i);
  });

  it('should handle partial updates correctly', async () => {
    // Update only title
    const titleOnlyInput: UpdateLessonContentInput = {
      id: lessonContentId,
      title: 'Only Title Changed'
    };

    const firstResult = await updateLessonContent(titleOnlyInput);

    expect(firstResult.title).toEqual('Only Title Changed');
    expect(firstResult.content_data).toEqual('{"text": "Original content"}');
    expect(firstResult.order_index).toEqual(1);

    // Update only content_data
    const contentOnlyInput: UpdateLessonContentInput = {
      id: lessonContentId,
      content_data: '{"updated": "content only"}'
    };

    const secondResult = await updateLessonContent(contentOnlyInput);

    expect(secondResult.title).toEqual('Only Title Changed'); // Should remain from previous update
    expect(secondResult.content_data).toEqual('{"updated": "content only"}');
    expect(secondResult.order_index).toEqual(1);

    // Update only order_index
    const orderOnlyInput: UpdateLessonContentInput = {
      id: lessonContentId,
      order_index: 3
    };

    const thirdResult = await updateLessonContent(orderOnlyInput);

    expect(thirdResult.title).toEqual('Only Title Changed');
    expect(thirdResult.content_data).toEqual('{"updated": "content only"}');
    expect(thirdResult.order_index).toEqual(3);
  });

  it('should handle complex JSON content data', async () => {
    const complexContent = JSON.stringify({
      type: 'video',
      url: 'https://example.com/video.mp4',
      metadata: {
        duration: 1200,
        resolution: '1080p',
        subtitles: ['en', 'es', 'fr']
      },
      interactive_elements: [
        {
          type: 'quiz',
          timestamp: 300,
          question: 'What is the main topic?'
        },
        {
          type: 'bookmark',
          timestamp: 600,
          title: 'Important concept'
        }
      ]
    });

    const input: UpdateLessonContentInput = {
      id: lessonContentId,
      title: 'Complex Video Content',
      content_data: complexContent
    };

    const result = await updateLessonContent(input);

    expect(result.title).toEqual('Complex Video Content');
    expect(result.content_data).toEqual(complexContent);
    
    // Verify JSON is valid by parsing it
    const parsedContent = JSON.parse(result.content_data);
    expect(parsedContent.type).toEqual('video');
    expect(parsedContent.metadata.duration).toEqual(1200);
    expect(parsedContent.interactive_elements).toHaveLength(2);
  });
});