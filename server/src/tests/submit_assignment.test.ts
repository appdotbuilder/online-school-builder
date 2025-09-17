import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, assignmentsTable, assignmentSubmissionsTable } from '../db/schema';
import { type CreateAssignmentSubmissionInput } from '../schema';
import { submitAssignment } from '../handlers/submit_assignment';
import { eq, and } from 'drizzle-orm';

describe('submitAssignment', () => {
  let testUser: { id: number };
  let testCourse: { id: number };
  let testLesson: { id: number };
  let testAssignment: { id: number; due_date: Date | null };

  beforeEach(async () => {
    await createDB();

    // Create test user (student)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test course owner
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@test.com',
        password_hash: 'hashed_password',
        first_name: 'Course',
        last_name: 'Owner',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test course
    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: ownerResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();
    testCourse = courseResult[0];

    // Create test lesson
    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: testCourse.id,
        title: 'Test Lesson',
        description: 'A lesson for testing',
        order_index: 1
      })
      .returning()
      .execute();
    testLesson = lessonResult[0];

    // Create test assignment (no due date initially)
    const assignmentResult = await db.insert(assignmentsTable)
      .values({
        lesson_id: testLesson.id,
        title: 'Test Assignment',
        description: 'An assignment for testing',
        evaluation_type: 'manual',
        due_date: null,
        max_points: 100
      })
      .returning()
      .execute();
    testAssignment = assignmentResult[0];
  });

  afterEach(resetDB);

  it('should submit assignment successfully', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'This is my submission' })
    };

    const result = await submitAssignment(input);

    expect(result.assignment_id).toEqual(testAssignment.id);
    expect(result.student_id).toEqual(testUser.id);
    expect(result.submission_data).toEqual(input.submission_data);
    expect(result.status).toEqual('submitted');
    expect(result.score).toBeNull();
    expect(result.feedback).toBeNull();
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.graded_at).toBeNull();
    expect(result.graded_by).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save submission to database', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'Database test submission' })
    };

    const result = await submitAssignment(input);

    // Verify submission was saved to database
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.id, result.id))
      .execute();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].assignment_id).toEqual(testAssignment.id);
    expect(submissions[0].student_id).toEqual(testUser.id);
    expect(submissions[0].submission_data).toEqual(input.submission_data);
    expect(submissions[0].status).toEqual('submitted');
    expect(submissions[0].submitted_at).toBeInstanceOf(Date);
  });

  it('should throw error when assignment does not exist', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: 99999, // Non-existent assignment
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'Test submission' })
    };

    await expect(submitAssignment(input)).rejects.toThrow(/assignment not found/i);
  });

  it('should prevent duplicate submissions', async () => {
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'First submission' })
    };

    // Submit first time - should succeed
    await submitAssignment(input);

    // Submit second time - should fail
    const duplicateInput: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'Duplicate submission' })
    };

    await expect(submitAssignment(duplicateInput)).rejects.toThrow(/already submitted/i);
  });

  it('should reject submission past due date', async () => {
    // Update assignment to have a past due date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1); // Yesterday

    await db.update(assignmentsTable)
      .set({ due_date: pastDate })
      .where(eq(assignmentsTable.id, testAssignment.id))
      .execute();

    const input: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'Late submission' })
    };

    await expect(submitAssignment(input)).rejects.toThrow(/past due date/i);
  });

  it('should allow submission before due date', async () => {
    // Update assignment to have a future due date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

    await db.update(assignmentsTable)
      .set({ due_date: futureDate })
      .where(eq(assignmentsTable.id, testAssignment.id))
      .execute();

    const input: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'On-time submission' })
    };

    const result = await submitAssignment(input);

    expect(result.status).toEqual('submitted');
    expect(result.submission_data).toEqual(input.submission_data);
  });

  it('should allow submission when no due date is set', async () => {
    // Assignment already has no due date from setup
    const input: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'No due date submission' })
    };

    const result = await submitAssignment(input);

    expect(result.status).toEqual('submitted');
    expect(result.submission_data).toEqual(input.submission_data);
  });

  it('should allow different students to submit to same assignment', async () => {
    // Create second student
    const student2Result = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        password_hash: 'hashed_password',
        first_name: 'Second',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const input1: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify({ answer: 'Student 1 submission' })
    };

    const input2: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: student2Result[0].id,
      submission_data: JSON.stringify({ answer: 'Student 2 submission' })
    };

    // Both submissions should succeed
    const result1 = await submitAssignment(input1);
    const result2 = await submitAssignment(input2);

    expect(result1.student_id).toEqual(testUser.id);
    expect(result2.student_id).toEqual(student2Result[0].id);

    // Verify both submissions are in database
    const submissions = await db.select()
      .from(assignmentSubmissionsTable)
      .where(eq(assignmentSubmissionsTable.assignment_id, testAssignment.id))
      .execute();

    expect(submissions).toHaveLength(2);
  });

  it('should handle complex submission data', async () => {
    const complexData = {
      answers: ['Answer 1', 'Answer 2', 'Answer 3'],
      files: ['file1.pdf', 'file2.docx'],
      metadata: {
        browser: 'Chrome',
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    const input: CreateAssignmentSubmissionInput = {
      assignment_id: testAssignment.id,
      student_id: testUser.id,
      submission_data: JSON.stringify(complexData)
    };

    const result = await submitAssignment(input);

    expect(result.submission_data).toEqual(JSON.stringify(complexData));

    // Verify data can be parsed back
    const parsedData = JSON.parse(result.submission_data);
    expect(parsedData.answers).toEqual(complexData.answers);
    expect(parsedData.files).toEqual(complexData.files);
    expect(parsedData.metadata.browser).toEqual(complexData.metadata.browser);
  });
});