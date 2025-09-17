import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type UpdateCourseInput, type Course } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateCourse(input: UpdateCourseInput): Promise<Course> {
  try {
    // Build update object with only provided fields
    const updateData: Partial<typeof coursesTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.is_public !== undefined) {
      updateData.is_public = input.is_public;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Update the course record
    const result = await db.update(coursesTable)
      .set(updateData)
      .where(eq(coursesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Course with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Course update failed:', error);
    throw error;
  }
}