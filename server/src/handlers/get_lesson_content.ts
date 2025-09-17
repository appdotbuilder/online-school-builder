import { db } from '../db';
import { lessonContentTable } from '../db/schema';
import { type LessonContent } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getLessonContent(lessonId: number): Promise<LessonContent[]> {
  try {
    // Query lesson content ordered by order_index
    const results = await db.select()
      .from(lessonContentTable)
      .where(eq(lessonContentTable.lesson_id, lessonId))
      .orderBy(asc(lessonContentTable.order_index))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get lesson content:', error);
    throw error;
  }
}