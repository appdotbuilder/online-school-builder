import { db } from '../db';
import { lessonContentTable } from '../db/schema';
import { type UpdateLessonContentInput, type LessonContent } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateLessonContent(input: UpdateLessonContentInput): Promise<LessonContent> {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    
    if (input.title !== undefined) {
      updateData['title'] = input.title;
    }
    
    if (input.content_data !== undefined) {
      updateData['content_data'] = input.content_data;
    }
    
    if (input.order_index !== undefined) {
      updateData['order_index'] = input.order_index;
    }

    // Perform the update
    const result = await db.update(lessonContentTable)
      .set(updateData)
      .where(eq(lessonContentTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Lesson content not found');
    }

    return result[0];
  } catch (error) {
    console.error('Update lesson content failed:', error);
    throw error;
  }
}