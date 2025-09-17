import { db } from '../db';
import { lessonsTable } from '../db/schema';
import { type Lesson } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getLessonsByCourse(courseId: number): Promise<Lesson[]> {
  try {
    // Query lessons for the specified course, ordered by order_index
    const results = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.course_id, courseId))
      .orderBy(asc(lessonsTable.order_index))
      .execute();

    // Return the lessons (no numeric field conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch lessons:', error);
    throw error;
  }
}