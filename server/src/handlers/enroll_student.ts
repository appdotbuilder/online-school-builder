import { db } from '../db';
import { courseEnrollmentsTable, coursesTable, usersTable } from '../db/schema';
import { type CourseEnrollment } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function enrollStudent(courseId: number, studentId: number): Promise<CourseEnrollment> {
  try {
    // Check if student exists and has student role
    const student = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, studentId))
      .execute();

    if (student.length === 0) {
      throw new Error(`Student with ID ${studentId} not found`);
    }

    if (student[0].role !== 'student') {
      throw new Error(`User with ID ${studentId} is not a student`);
    }

    // Check if course exists and is active
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, courseId))
      .execute();

    if (course.length === 0) {
      throw new Error(`Course with ID ${courseId} not found`);
    }

    if (!course[0].is_active) {
      throw new Error(`Course with ID ${courseId} is not active`);
    }

    // Check if student is already enrolled
    const existingEnrollment = await db.select()
      .from(courseEnrollmentsTable)
      .where(
        and(
          eq(courseEnrollmentsTable.course_id, courseId),
          eq(courseEnrollmentsTable.student_id, studentId)
        )
      )
      .execute();

    if (existingEnrollment.length > 0) {
      throw new Error(`Student with ID ${studentId} is already enrolled in course ${courseId}`);
    }

    // Create enrollment
    const result = await db.insert(courseEnrollmentsTable)
      .values({
        course_id: courseId,
        student_id: studentId,
        progress_percentage: 0
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Student enrollment failed:', error);
    throw error;
  }
}