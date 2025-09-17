import { db } from '../db';
import { assignmentSubmissionsTable, assignmentsTable } from '../db/schema';
import { type CreateAssignmentSubmissionInput, type AssignmentSubmission } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function submitAssignment(input: CreateAssignmentSubmissionInput): Promise<AssignmentSubmission> {
  try {
    // First, verify the assignment exists and get its due date
    const assignment = await db.select()
      .from(assignmentsTable)
      .where(eq(assignmentsTable.id, input.assignment_id))
      .execute();

    if (assignment.length === 0) {
      throw new Error('Assignment not found');
    }

    const assignmentData = assignment[0];

    // Check if assignment is past due date (if due_date is set)
    if (assignmentData.due_date) {
      const now = new Date();
      if (now > assignmentData.due_date) {
        throw new Error('Assignment submission is past due date');
      }
    }

    // Check for existing submission to prevent duplicates
    const existingSubmission = await db.select()
      .from(assignmentSubmissionsTable)
      .where(
        and(
          eq(assignmentSubmissionsTable.assignment_id, input.assignment_id),
          eq(assignmentSubmissionsTable.student_id, input.student_id)
        )
      )
      .execute();

    if (existingSubmission.length > 0) {
      throw new Error('Student has already submitted this assignment');
    }

    // Create the submission
    const result = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: input.assignment_id,
        student_id: input.student_id,
        submission_data: input.submission_data,
        status: 'submitted',
        score: null,
        feedback: null,
        submitted_at: new Date(),
        graded_at: null,
        graded_by: null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Assignment submission failed:', error);
    throw error;
  }
}