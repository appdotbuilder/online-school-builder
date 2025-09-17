import { db } from '../db';
import { studentProgressTable, lessonsTable, coursesTable } from '../db/schema';
import { type StudentProgress } from '../schema';
import { eq, and, SQL } from 'drizzle-orm';

export async function getStudentProgress(studentId: number, courseId?: number): Promise<StudentProgress[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(studentProgressTable.student_id, studentId)
    ];

    if (courseId !== undefined) {
      // If courseId is provided, join with lessons to filter by course
      const query = db.select()
        .from(studentProgressTable)
        .innerJoin(
          lessonsTable,
          eq(studentProgressTable.lesson_id, lessonsTable.id)
        )
        .where(
          and(
            eq(studentProgressTable.student_id, studentId),
            eq(lessonsTable.course_id, courseId)
          )
        );

      const results = await query.execute();

      // Extract student progress data from joined results
      return results.map(result => (result as any).student_progress as StudentProgress);
    } else {
      // Simple query without join
      const results = await db.select()
        .from(studentProgressTable)
        .where(eq(studentProgressTable.student_id, studentId))
        .execute();

      return results;
    }
  } catch (error) {
    console.error('Get student progress failed:', error);
    throw error;
  }
}

export async function updateStudentProgress(studentId: number, lessonId: number, timeSpent: number, completed?: boolean): Promise<StudentProgress> {
  try {
    // Check if progress record already exists
    const existingProgress = await db.select()
      .from(studentProgressTable)
      .where(
        and(
          eq(studentProgressTable.student_id, studentId),
          eq(studentProgressTable.lesson_id, lessonId)
        )
      )
      .execute();

    const now = new Date();

    if (existingProgress.length > 0) {
      // Update existing record
      const currentProgress = existingProgress[0];
      const newTimeSpent = currentProgress.time_spent + timeSpent;
      const isCompleted = completed !== undefined ? completed : currentProgress.completed;
      
      const result = await db.update(studentProgressTable)
        .set({
          time_spent: newTimeSpent,
          completed: isCompleted,
          completion_date: isCompleted && !currentProgress.completed 
            ? now 
            : currentProgress.completion_date,
          updated_at: now
        })
        .where(eq(studentProgressTable.id, currentProgress.id))
        .returning()
        .execute();

      return result[0];
    } else {
      // Create new record
      const result = await db.insert(studentProgressTable)
        .values({
          student_id: studentId,
          lesson_id: lessonId,
          time_spent: timeSpent,
          completed: completed ?? false,
          completion_date: completed ? now : null,
          created_at: now,
          updated_at: now
        })
        .returning()
        .execute();

      return result[0];
    }
  } catch (error) {
    console.error('Update student progress failed:', error);
    throw error;
  }
}