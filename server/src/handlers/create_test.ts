import { db } from '../db';
import { testsTable, lessonContentTable } from '../db/schema';
import { type CreateTestInput, type Test } from '../schema';
import { eq } from 'drizzle-orm';

export const createTest = async (input: CreateTestInput): Promise<Test> => {
  try {
    // Verify that the lesson content exists
    const lessonContent = await db.select()
      .from(lessonContentTable)
      .where(eq(lessonContentTable.id, input.lesson_content_id))
      .execute();

    if (lessonContent.length === 0) {
      throw new Error(`Lesson content with id ${input.lesson_content_id} not found`);
    }

    // Insert test record
    const result = await db.insert(testsTable)
      .values({
        lesson_content_id: input.lesson_content_id,
        title: input.title,
        description: input.description,
        time_limit: input.time_limit,
        max_attempts: input.max_attempts
      })
      .returning()
      .execute();

    const test = result[0];
    return test;
  } catch (error) {
    console.error('Test creation failed:', error);
    throw error;
  }
};