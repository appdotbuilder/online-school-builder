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
import { getAssignmentSubmissions, getStudentSubmissions } from '../handlers/get_assignment_submissions';

describe('getAssignmentSubmissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all submissions for a specific assignment', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test student
    const student = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Student',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: user[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    // Create test lesson
    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    // Create test assignment
    const assignment = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        evaluation_type: 'manual',
        max_points: 100
      })
      .returning()
      .execute();

    // Create test submissions
    const submission1 = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment[0].id,
        student_id: student[0].id,
        submission_data: '{"answer": "First submission"}',
        status: 'submitted'
      })
      .returning()
      .execute();

    const submission2 = await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment[0].id,
        student_id: user[0].id,
        submission_data: '{"answer": "Second submission"}',
        status: 'graded',
        score: 85,
        feedback: 'Good work'
      })
      .returning()
      .execute();

    const result = await getAssignmentSubmissions(assignment[0].id);

    expect(result).toHaveLength(2);
    expect(result[0].assignment_id).toEqual(assignment[0].id);
    expect(result[1].assignment_id).toEqual(assignment[0].id);
    expect(result[0].submission_data).toEqual('{"answer": "First submission"}');
    expect(result[1].submission_data).toEqual('{"answer": "Second submission"}');
    expect(result[1].score).toEqual(85);
    expect(result[1].feedback).toEqual('Good work');
  });

  it('should return empty array when assignment has no submissions', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: user[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    // Create test lesson
    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    // Create test assignment without submissions
    const assignment = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        evaluation_type: 'automatic',
        max_points: 50
      })
      .returning()
      .execute();

    const result = await getAssignmentSubmissions(assignment[0].id);

    expect(result).toHaveLength(0);
  });

  it('should handle submissions with all possible statuses', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: user[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    // Create test lesson
    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    // Create test assignment
    const assignment = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        evaluation_type: 'manual',
        max_points: 100
      })
      .returning()
      .execute();

    // Create submissions with different statuses
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment[0].id,
          student_id: user[0].id,
          submission_data: '{"answer": "Pending submission"}',
          status: 'pending'
        },
        {
          assignment_id: assignment[0].id,
          student_id: user[0].id,
          submission_data: '{"answer": "Submitted submission"}',
          status: 'submitted'
        },
        {
          assignment_id: assignment[0].id,
          student_id: user[0].id,
          submission_data: '{"answer": "Graded submission"}',
          status: 'graded',
          score: 90
        },
        {
          assignment_id: assignment[0].id,
          student_id: user[0].id,
          submission_data: '{"answer": "Returned submission"}',
          status: 'returned',
          score: 75,
          feedback: 'Please revise'
        }
      ])
      .execute();

    const result = await getAssignmentSubmissions(assignment[0].id);

    expect(result).toHaveLength(4);
    const statuses = result.map(s => s.status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('submitted');
    expect(statuses).toContain('graded');
    expect(statuses).toContain('returned');

    const gradedSubmission = result.find(s => s.status === 'graded');
    expect(gradedSubmission?.score).toEqual(90);

    const returnedSubmission = result.find(s => s.status === 'returned');
    expect(returnedSubmission?.score).toEqual(75);
    expect(returnedSubmission?.feedback).toEqual('Please revise');
  });
});

describe('getStudentSubmissions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all submissions for a specific student', async () => {
    // Create test users
    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    const student = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Student',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();

    // Create test course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: teacher[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    // Create test lessons
    const lesson1 = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson 1',
        description: 'First test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    const lesson2 = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson 2',
        description: 'Second test lesson',
        order_index: 2
      })
      .returning()
      .execute();

    // Create test assignments
    const assignment1 = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson1[0].id,
        title: 'Test Assignment 1',
        description: 'First test assignment',
        evaluation_type: 'manual',
        max_points: 100
      })
      .returning()
      .execute();

    const assignment2 = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson2[0].id,
        title: 'Test Assignment 2',
        description: 'Second test assignment',
        evaluation_type: 'automatic',
        max_points: 50
      })
      .returning()
      .execute();

    // Create test submissions for the student
    await db.insert(assignmentSubmissionsTable)
      .values([
        {
          assignment_id: assignment1[0].id,
          student_id: student[0].id,
          submission_data: '{"answer": "First assignment submission"}',
          status: 'submitted'
        },
        {
          assignment_id: assignment2[0].id,
          student_id: student[0].id,
          submission_data: '{"answer": "Second assignment submission"}',
          status: 'graded',
          score: 45,
          feedback: 'Well done'
        }
      ])
      .execute();

    // Create submission for different student (should not be returned)
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment1[0].id,
        student_id: teacher[0].id,
        submission_data: '{"answer": "Teacher submission"}',
        status: 'submitted'
      })
      .execute();

    const result = await getStudentSubmissions(student[0].id);

    expect(result).toHaveLength(2);
    expect(result.every(s => s.student_id === student[0].id)).toBe(true);
    expect(result[0].submission_data).toEqual('{"answer": "First assignment submission"}');
    expect(result[1].submission_data).toEqual('{"answer": "Second assignment submission"}');
    expect(result[1].score).toEqual(45);
    expect(result[1].feedback).toEqual('Well done');
  });

  it('should return empty array when student has no submissions', async () => {
    // Create test user
    const student = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Student',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();

    const result = await getStudentSubmissions(student[0].id);

    expect(result).toHaveLength(0);
  });

  it('should handle submissions with dates correctly', async () => {
    // Create test user
    const student = await db.insert(usersTable)
      .values({
        email: 'student@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Student',
        last_name: 'User',
        role: 'student'
      })
      .returning()
      .execute();

    const teacher = await db.insert(usersTable)
      .values({
        email: 'teacher@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Teacher',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test course
    const course = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: teacher[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    // Create test lesson
    const lesson = await db.insert(lessonsTable)
      .values({
        course_id: course[0].id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    // Create test assignment
    const assignment = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson[0].id,
        title: 'Test Assignment',
        description: 'A test assignment',
        evaluation_type: 'manual',
        max_points: 100
      })
      .returning()
      .execute();

    // Create submission with grading date
    const gradedAt = new Date('2024-01-15T10:30:00Z');
    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment[0].id,
        student_id: student[0].id,
        submission_data: '{"answer": "Test submission"}',
        status: 'graded',
        score: 85,
        feedback: 'Good work',
        graded_at: gradedAt,
        graded_by: teacher[0].id
      })
      .execute();

    const result = await getStudentSubmissions(student[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].submitted_at).toBeInstanceOf(Date);
    expect(result[0].graded_at).toBeInstanceOf(Date);
    expect(result[0].graded_by).toEqual(teacher[0].id);
    expect(result[0].status).toEqual('graded');
  });
});