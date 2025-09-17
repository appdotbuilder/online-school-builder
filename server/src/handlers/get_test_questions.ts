import { db } from '../db';
import { testQuestionsTable } from '../db/schema';
import { eq, asc } from 'drizzle-orm';
import { type TestQuestion } from '../schema';

export async function getTestQuestions(testId: number): Promise<TestQuestion[]> {
  try {
    // Fetch all questions for the specified test, ordered by order_index
    const results = await db.select()
      .from(testQuestionsTable)
      .where(eq(testQuestionsTable.test_id, testId))
      .orderBy(asc(testQuestionsTable.order_index))
      .execute();

    // Convert results to match schema types
    return results.map(question => ({
      ...question,
      // Convert points from database integer to number
      points: question.points
    }));
  } catch (error) {
    console.error('Failed to fetch test questions:', error);
    throw error;
  }
}