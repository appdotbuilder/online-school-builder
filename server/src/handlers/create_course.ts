import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type CreateCourseInput, type Course } from '../schema';

export const createCourse = async (input: CreateCourseInput): Promise<Course> => {
  try {
    // Insert course record
    const result = await db.insert(coursesTable)
      .values({
        title: input.title,
        description: input.description,
        owner_id: input.owner_id,
        is_public: input.is_public ?? false,
        is_active: input.is_active ?? true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course creation failed:', error);
    throw error;
  }
};