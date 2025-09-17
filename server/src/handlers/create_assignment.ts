import { db } from '../db';
import { assignmentsTable, lessonsTable } from '../db/schema';
import { type CreateAssignmentInput, type Assignment } from '../schema';
import { eq } from 'drizzle-orm';

export const createAssignment = async (input: CreateAssignmentInput): Promise<Assignment> => {
  try {
    // Validate that the lesson exists
    const existingLesson = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, input.lesson_id))
      .execute();

    if (existingLesson.length === 0) {
      throw new Error(`Lesson with id ${input.lesson_id} not found`);
    }

    // Insert assignment record
    const result = await db.insert(assignmentsTable)
      .values({
        lesson_id: input.lesson_id,
        title: input.title,
        description: input.description,
        evaluation_type: input.evaluation_type,
        due_date: input.due_date,
        max_points: input.max_points
      })
      .returning()
      .execute();

    const assignment = result[0];
    return assignment;
  } catch (error) {
    console.error('Assignment creation failed:', error);
    throw error;
  }
};