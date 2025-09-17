import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';

export const getCourses = async (): Promise<Course[]> => {
  try {
    // Fetch all courses from the database
    const result = await db.select()
      .from(coursesTable)
      .execute();

    // Return courses with proper type conversion
    return result.map(course => ({
      ...course,
      // All fields are already correctly typed from the database
      // No numeric conversions needed as there are no numeric columns in courses table
    }));
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error;
  }
};