import { db } from '../db';
import { lessonsTable } from '../db/schema';
import { type UpdateLessonInput, type Lesson } from '../schema';
import { eq } from 'drizzle-orm';

export const updateLesson = async (input: UpdateLessonInput): Promise<Lesson> => {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof lessonsTable.$inferInsert> = {};
    
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    
    if (input.order_index !== undefined) {
      updateData.order_index = input.order_index;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the lesson and return the updated record
    const result = await db.update(lessonsTable)
      .set(updateData)
      .where(eq(lessonsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Lesson with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Lesson update failed:', error);
    throw error;
  }
};