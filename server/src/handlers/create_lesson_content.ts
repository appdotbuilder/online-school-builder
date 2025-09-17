import { db } from '../db';
import { lessonContentTable, lessonsTable } from '../db/schema';
import { type CreateLessonContentInput, type LessonContent } from '../schema';
import { eq } from 'drizzle-orm';

export const createLessonContent = async (input: CreateLessonContentInput): Promise<LessonContent> => {
  try {
    // First, verify that the lesson exists
    const lesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, input.lesson_id))
      .execute();

    if (lesson.length === 0) {
      throw new Error(`Lesson with id ${input.lesson_id} not found`);
    }

    // Validate content_data format based on content_type
    validateContentData(input.content_type, input.content_data);

    // Insert lesson content record
    const result = await db.insert(lessonContentTable)
      .values({
        lesson_id: input.lesson_id,
        content_type: input.content_type,
        title: input.title,
        content_data: input.content_data,
        order_index: input.order_index
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Lesson content creation failed:', error);
    throw error;
  }
};

// Helper function to validate content_data format based on content_type
function validateContentData(contentType: string, contentData: string): void {
  try {
    const data = JSON.parse(contentData);

    switch (contentType) {
      case 'text':
        if (!data.content || typeof data.content !== 'string') {
          throw new Error('Text content must have a valid "content" string field');
        }
        break;

      case 'video':
        if (!data.url || typeof data.url !== 'string') {
          throw new Error('Video content must have a valid "url" string field');
        }
        if (data.duration && typeof data.duration !== 'number') {
          throw new Error('Video duration must be a number if provided');
        }
        break;

      case 'file':
        if (!data.file_id || typeof data.file_id !== 'number') {
          throw new Error('File content must have a valid "file_id" number field');
        }
        break;

      case 'test':
        if (!data.test_config || typeof data.test_config !== 'object') {
          throw new Error('Test content must have a valid "test_config" object field');
        }
        break;

      default:
        throw new Error(`Invalid content type: ${contentType}`);
    }
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      throw new Error('content_data must be valid JSON');
    }
    throw parseError;
  }
}