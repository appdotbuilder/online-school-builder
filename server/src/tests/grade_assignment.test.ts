import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  lessonsTable, 
  assignmentsTable, 
  assignmentSubmissionsTable 
} from '../db/schema';
import { type GradeAssignmentInput } from '../schema';
import { gradeAssignment } from '../handlers/grade_assignment';
import { eq } from 'drizzle-orm';

describe('gradeAssignment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data helper
  const createTestData = async () => {
    // Create users (grader, student, course owner)
    const graderResult = await db.insert(usersTable).values({
      email: 'grader@test.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'Grader',
      role: 'moderator'
    }).returning().execute();

    const studentResult = await db.insert(usersTable).values({
      email: 'student@test.com',
      password_hash: 'hashedpassword',
      first_name: 'Test',
      last_name: 'Student',
      role: 'student'
    }).returning().execute();

    const ownerResult = await db.insert(usersTable).values({
      email: 'owner@test.com',
      password_hash: 'hashedpassword',
      first_name: 'Course',
      last_name: 'Owner',
      role: 'administrator'
    }).returning().execute();

    // Create course
    const courseResult = await db.insert(coursesTable).values({
      title: 'Test Course',
      description: 'Course for testing',
      owner_id: ownerResult[0].id,
      is_public: true,
      is_active: true
    }).returning().execute();

    // Create lesson
    const lessonResult = await db.insert(lessonsTable).values({
      course_id: courseResult[0].id,
      title: 'Test Lesson',
      description: 'Lesson for testing',
      order_index: 1
    }).returning().execute();

    // Create assignment
    const assignmentResult = await db.insert(assignmentsTable).values({
      lesson_id: lessonResult[0].id,
      title: 'Test Assignment',
      description: 'Assignment for testing',
      evaluation_type: 'manual',
      due_date: new Date(Date.now() + 86400000), // Tomorrow
      max_points: 100
    }).returning().execute();

    // Create assignment submission
    const submissionResult = await db.insert(assignmentSubmissionsTable).values({
      assignment_id: assignmentResult[0].id,
      student_id: studentResult[0].id,
      submission_data: JSON.stringify({ answer: 'Test submission content' }),
      status: 'submitted'
    }).returning().execute();

    return {
      grader: graderResult[0],
      student: studentResult[0],
      owner: ownerResult[0],
      course: courseResult[0],
      lesson: lessonResult[0],
      assignment: assignmentResult[0],
      submission: submissionResult[0]
    };
  };

  it('should grade an assignment submission successfully', async () => {
    const testData = await createTestData();

    const input: GradeAssignmentInput = {
      submission_id: testData.submission.id,
      score: 85,
      feedback: 'Good work, but could be improved in some areas.',
      graded_by: testData.grader.id
    };

    const result = await gradeAssignment(input);

    // Verify result
    expect(result.id).toBe(testData.submission.id);
    expect(result.assignment_id).toBe(testData.assignment.id);
    expect(result.student_id).toBe(testData.student.id);
    expect(result.score).toBe(85);
    expect(result.feedback).toBe('Good work, but could be improved in some areas.');
    expect(result.status).toBe('graded');
    expect(result.graded_by).toBe(testData.grader.id);
    expect(result.graded_at).toBeInstanceOf(Date);
  });

  it('should save graded submission to database', async () => {
    const testData = await createTestData();

    const input: GradeAssignmentInput = {
      submission_id: testData.submission.id,
      score: 92,
      feedback: 'Excellent work!',
      graded_by: testData.grader.id
    };

    await gradeAssignment(input);

    // Verify database was updated
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, testData.submission.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].score).toBe(92);
    expect(submissions[0].feedback).toBe('Excellent work!');
    expect(submissions[0].status).toBe('graded');
    expect(submissions[0].graded_by).toBe(testData.grader.id);
    expect(submissions[0].graded_at).toBeInstanceOf(Date);
  });

  it('should allow administrator to grade assignments', async () => {
    const testData = await createTestData();

    const input: GradeAssignmentInput = {
      submission_id: testData.submission.id,
      score: 78,
      feedback: 'Needs improvement in analysis.',
      graded_by: testData.owner.id // Administrator
    };

    const result = await gradeAssignment(input);

    expect(result.score).toBe(78);
    expect(result.graded_by).toBe(testData.owner.id);
    expect(result.status).toBe('graded');
  });

  it('should handle null feedback', async () => {
    const testData = await createTestData();

    const input: GradeAssignmentInput = {
      submission_id: testData.submission.id,
      score: 88,
      feedback: null,
      graded_by: testData.grader.id
    };

    const result = await gradeAssignment(input);

    expect(result.score).toBe(88);
    expect(result.feedback).toBe(null);
    expect(result.status).toBe('graded');
  });

  it('should throw error for non-existent submission', async () => {
    const testData = await createTestData();

    const input: GradeAssignmentInput = {
      submission_id: 99999, // Non-existent ID
      score: 85,
      feedback: 'Test feedback',
      graded_by: testData.grader.id
    };

    await expect(gradeAssignment(input)).rejects.toThrow(/assignment submission not found/i);
  });

  it('should throw error for non-existent grader', async () => {
    const testData = await createTestData();

    const input: GradeAssignmentInput = {
      submission_id: testData.submission.id,
      score: 85,
      feedback: 'Test feedback',
      graded_by: 99999 // Non-existent grader ID
    };

    await expect(gradeAssignment(input)).rejects.toThrow(/grader not found/i);
  });

  it('should throw error when student tries to grade assignment', async () => {
    const testData = await createTestData();

    const input: GradeAssignmentInput = {
      submission_id: testData.submission.id,
      score: 85,
      feedback: 'Test feedback',
      graded_by: testData.student.id // Student trying to grade
    };

    await expect(gradeAssignment(input)).rejects.toThrow(/students cannot grade assignments/i);
  });

  it('should handle zero score correctly', async () => {
    const testData = await createTestData();

    const input: GradeAssignmentInput = {
      submission_id: testData.submission.id,
      score: 0,
      feedback: 'Did not meet requirements.',
      graded_by: testData.grader.id
    };

    const result = await gradeAssignment(input);

    expect(result.score).toBe(0);
    expect(result.feedback).toBe('Did not meet requirements.');
    expect(result.status).toBe('graded');
  });
});