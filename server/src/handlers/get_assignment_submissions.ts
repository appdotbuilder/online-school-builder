import { db } from '../db';
import { assignmentSubmissionsTable, usersTable } from '../db/schema';
import { type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export async function getAssignmentSubmissions(assignmentId: number): Promise<AssignmentSubmission[]> {
  try {
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, assignmentId))
      .execute();

    return results.map(submission => ({
      ...submission,
      // No numeric conversions needed - all fields are integers, text, or dates
    }));
  } catch (error) {
    console.error('Failed to get assignment submissions:', error);
    throw error;
  }
}

export async function getStudentSubmissions(studentId: number): Promise<AssignmentSubmission[]> {
  try {
    const results = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.student_id, studentId))
      .execute();

    return results.map(submission => ({
      ...submission,
      // No numeric conversions needed - all fields are integers, text, or dates
    }));
  } catch (error) {
    console.error('Failed to get student submissions:', error);
    throw error;
  }
}