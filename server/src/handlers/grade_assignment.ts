import { db } from '../db';
import { assignmentSubmissionsTable, usersTable, assignmentsTable } from '../db/schema';
import { type GradeAssignmentInput, type AssignmentSubmission } from '../schema';
import { eq } from 'drizzle-orm';

export const gradeAssignment = async (input: GradeAssignmentInput): Promise<AssignmentSubmission> => {
  try {
    // First, verify the submission exists and get current data
    const existingSubmission = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, input.submission_id))
      .execute();

    if (existingSubmission.length === 0) {
      throw new Error('Assignment submission not found');
    }

    // Verify the grader exists
    const grader = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.graded_by))
      .execute();

    if (grader.length === 0) {
      throw new Error('Grader not found');
    }

    // Verify grader has proper role (administrator or moderator)
    if (grader[0].role === 'student') {
      throw new Error('Students cannot grade assignments');
    }

    // Update the assignment submission with grade information
    const result = await db.update(assignmentSubmissionsTable)
      .set({
        score: input.score,
        feedback: input.feedback,
        status: 'graded',
        graded_at: new Date(),
        graded_by: input.graded_by
      })
      .where(eq(assignmentSubmissionsTable.id, input.submission_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Assignment grading failed:', error);
    throw error;
  }
};