import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, coursesTable, lessonsTable, subscriptionsTable, assignmentSubmissionsTable, assignmentsTable, courseEnrollmentsTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty stats for student role', async () => {
    // Create a student user
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const result = await getDashboardStats(student.id, 'student');

    expect(result.total_students).toEqual(0);
    expect(result.total_courses).toEqual(0);
    expect(result.total_lessons).toEqual(0);
    expect(result.active_subscriptions).toEqual(0);
    expect(result.recent_activities).toEqual([]);
  });

  it('should return platform-wide stats for administrator', async () => {
    // Create admin user
    const [admin] = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    // Create test data
    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [moderator] = await db.insert(usersTable)
      .values({
        email: 'moderator@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Moderator',
        role: 'moderator'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: moderator.id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const [lesson] = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    const [subscription] = await db.insert(subscriptionsTable)
      .values({
        user_id: student.id,
        course_id: course.id,
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        amount: '99.99'
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        evaluation_type: 'manual',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        max_points: 100
      })
      .returning()
      .execute();

    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        submission_data: '{"answer": "test submission"}',
        status: 'submitted'
      })
      .execute();

    const result = await getDashboardStats(admin.id, 'administrator');

    expect(result.total_students).toEqual(1);
    expect(result.total_courses).toEqual(1);
    expect(result.total_lessons).toEqual(1);
    expect(result.active_subscriptions).toEqual(1);
    expect(result.recent_activities).toHaveLength(1);
    expect(result.recent_activities[0].type).toEqual('assignment_submission');
    expect(result.recent_activities[0].user_name).toEqual('Test Student');
    expect(result.recent_activities[0].description).toContain('Test Assignment');
  });

  it('should return moderator-specific stats', async () => {
    // Create moderator user
    const [moderator] = await db.insert(usersTable)
      .values({
        email: 'moderator@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Moderator',
        role: 'moderator'
      })
      .returning()
      .execute();

    // Create another moderator
    const [otherModerator] = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Other',
        last_name: 'Moderator',
        role: 'moderator'
      })
      .returning()
      .execute();

    // Create students
    const [student1] = await db.insert(usersTable)
      .values({
        email: 'student1@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Student',
        last_name: 'One',
        role: 'student'
      })
      .returning()
      .execute();

    const [student2] = await db.insert(usersTable)
      .values({
        email: 'student2@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Student',
        last_name: 'Two',
        role: 'student'
      })
      .returning()
      .execute();

    // Create courses - one for our moderator, one for other moderator
    const [moderatorCourse] = await db.insert(coursesTable)
      .values({
        title: 'Moderator Course',
        description: 'Course owned by moderator',
        owner_id: moderator.id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const [otherCourse] = await db.insert(coursesTable)
      .values({
        title: 'Other Course',
        description: 'Course owned by other moderator',
        owner_id: otherModerator.id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    // Create lessons
    const [lesson1] = await db.insert(lessonsTable)
      .values({
        course_id: moderatorCourse.id,
        title: 'Lesson 1',
        description: 'First lesson',
        order_index: 1
      })
      .returning()
      .execute();

    const [lesson2] = await db.insert(lessonsTable)
      .values({
        course_id: moderatorCourse.id,
        title: 'Lesson 2',
        description: 'Second lesson',
        order_index: 2
      })
      .returning()
      .execute();

    // Create lesson in other course (should not be counted)
    await db.insert(lessonsTable)
      .values({
        course_id: otherCourse.id,
        title: 'Other Lesson',
        description: 'Lesson in other course',
        order_index: 1
      })
      .execute();

    // Create enrollments for moderator's course
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: moderatorCourse.id,
        student_id: student1.id,
        progress_percentage: 50
      })
      .execute();

    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: moderatorCourse.id,
        student_id: student2.id,
        progress_percentage: 25
      })
      .execute();

    // Create enrollment for other course (should not be counted)
    await db.insert(courseEnrollmentsTable)
      .values({
        course_id: otherCourse.id,
        student_id: student1.id,
        progress_percentage: 75
      })
      .execute();

    // Create subscriptions
    await db.insert(subscriptionsTable)
      .values({
        user_id: student1.id,
        course_id: moderatorCourse.id,
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: '99.99'
      })
      .execute();

    await db.insert(subscriptionsTable)
      .values({
        user_id: student2.id,
        course_id: moderatorCourse.id,
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: '79.99'
      })
      .execute();

    // Create inactive subscription (should not be counted)
    await db.insert(subscriptionsTable)
      .values({
        user_id: student1.id,
        course_id: otherCourse.id,
        status: 'expired',
        start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        amount: '49.99'
      })
      .execute();

    // Create assignments and submissions
    const [assignment] = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson1.id,
        title: 'Moderator Assignment',
        description: 'Assignment in moderator course',
        evaluation_type: 'manual',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        max_points: 100
      })
      .returning()
      .execute();

    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment.id,
        student_id: student1.id,
        submission_data: '{"answer": "moderator submission"}',
        status: 'submitted'
      })
      .execute();

    const result = await getDashboardStats(moderator.id, 'moderator');

    expect(result.total_students).toEqual(2); // Only students enrolled in moderator's courses
    expect(result.total_courses).toEqual(1); // Only courses owned by moderator
    expect(result.total_lessons).toEqual(2); // Only lessons in moderator's courses
    expect(result.active_subscriptions).toEqual(2); // Only active subscriptions for moderator's courses
    expect(result.recent_activities).toHaveLength(1);
    expect(result.recent_activities[0].type).toEqual('assignment_submission');
    expect(result.recent_activities[0].user_name).toEqual('Student One');
    expect(result.recent_activities[0].description).toContain('Moderator Assignment');
  });

  it('should return empty stats for moderator with no courses', async () => {
    // Create moderator user with no courses
    const [moderator] = await db.insert(usersTable)
      .values({
        email: 'moderator@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Moderator',
        role: 'moderator'
      })
      .returning()
      .execute();

    const result = await getDashboardStats(moderator.id, 'moderator');

    expect(result.total_students).toEqual(0);
    expect(result.total_courses).toEqual(0);
    expect(result.total_lessons).toEqual(0);
    expect(result.active_subscriptions).toEqual(0);
    expect(result.recent_activities).toEqual([]);
  });

  it('should handle multiple students enrolled in same course correctly', async () => {
    // Create moderator
    const [moderator] = await db.insert(usersTable)
      .values({
        email: 'moderator@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Moderator',
        role: 'moderator'
      })
      .returning()
      .execute();

    // Create students
    const students = await db.insert(usersTable)
      .values([
        {
          email: 'student1@test.com',
          password_hash: 'hashedpassword',
          first_name: 'Student',
          last_name: 'One',
          role: 'student'
        },
        {
          email: 'student2@test.com',
          password_hash: 'hashedpassword',
          first_name: 'Student',
          last_name: 'Two',
          role: 'student'
        },
        {
          email: 'student3@test.com',
          password_hash: 'hashedpassword',
          first_name: 'Student',
          last_name: 'Three',
          role: 'student'
        }
      ])
      .returning()
      .execute();

    // Create courses
    const courses = await db.insert(coursesTable)
      .values([
        {
          title: 'Course 1',
          description: 'First course',
          owner_id: moderator.id,
          is_public: true,
          is_active: true
        },
        {
          title: 'Course 2',
          description: 'Second course',
          owner_id: moderator.id,
          is_public: true,
          is_active: true
        }
      ])
      .returning()
      .execute();

    // Enroll students in multiple courses (same student in multiple courses)
    await db.insert(courseEnrollmentsTable)
      .values([
        { course_id: courses[0].id, student_id: students[0].id, progress_percentage: 50 },
        { course_id: courses[0].id, student_id: students[1].id, progress_percentage: 25 },
        { course_id: courses[1].id, student_id: students[0].id, progress_percentage: 75 }, // Same student, different course
        { course_id: courses[1].id, student_id: students[2].id, progress_percentage: 10 }
      ])
      .execute();

    const result = await getDashboardStats(moderator.id, 'moderator');

    // Should count unique students (3 unique students total)
    expect(result.total_students).toEqual(3);
    expect(result.total_courses).toEqual(2);
  });

  it('should handle date fields correctly in recent activities', async () => {
    // Create test users
    const [admin] = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Admin',
        last_name: 'User',
        role: 'administrator'
      })
      .returning()
      .execute();

    const [student] = await db.insert(usersTable)
      .values({
        email: 'student@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Student',
        role: 'student'
      })
      .returning()
      .execute();

    const [moderator] = await db.insert(usersTable)
      .values({
        email: 'moderator@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Moderator',
        role: 'moderator'
      })
      .returning()
      .execute();

    // Create course and lesson
    const [course] = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A test course',
        owner_id: moderator.id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const [lesson] = await db.insert(lessonsTable)
      .values({
        course_id: course.id,
        title: 'Test Lesson',
        description: 'A test lesson',
        order_index: 1
      })
      .returning()
      .execute();

    const [assignment] = await db.insert(assignmentsTable)
      .values({
        lesson_id: lesson.id,
        title: 'Test Assignment',
        description: 'A test assignment',
        evaluation_type: 'manual',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        max_points: 100
      })
      .returning()
      .execute();

    await db.insert(assignmentSubmissionsTable)
      .values({
        assignment_id: assignment.id,
        student_id: student.id,
        submission_data: '{"answer": "test submission"}',
        status: 'submitted'
      })
      .execute();

    const result = await getDashboardStats(admin.id, 'administrator');

    expect(result.recent_activities).toHaveLength(1);
    expect(result.recent_activities[0].created_at).toBeInstanceOf(Date);
    expect(result.recent_activities[0].id).toBeDefined();
  });
});