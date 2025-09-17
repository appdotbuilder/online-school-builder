import { db } from '../db';
import { testQuestionsTable, testsTable } from '../db/schema';
import { type CreateTestQuestionInput, type TestQuestion } from '../schema';
import { eq } from 'drizzle-orm';

export const createTestQuestion = async (input: CreateTestQuestionInput): Promise<TestQuestion> => {
  try {
    // First verify that the test exists
    const testExists = await db.select()
      .from(testsTable)
      .where(eq(testsTable.id, input.test_id))
      .execute();

    if (testExists.length === 0) {
      throw new Error(`Test with id ${input.test_id} does not exist`);
    }

    // Validate options format for multiple choice questions
    if (input.question_type === 'multiple_choice') {
      if (!input.options) {
        throw new Error('Options are required for multiple choice questions');
      }
      
      let parsedOptions;
      try {
        parsedOptions = JSON.parse(input.options);
      } catch (parseError) {
        throw new Error('Options must be valid JSON for multiple choice questions');
      }
      
      if (!Array.isArray(parsedOptions) || parsedOptions.length === 0) {
        throw new Error('Options must be a non-empty JSON array for multiple choice questions');
      }
      
      // Validate that correct answer exists in options
      if (!parsedOptions.includes(input.correct_answer)) {
        throw new Error('Correct answer must be one of the provided options');
      }
    }

    // Validate true/false questions
    if (input.question_type === 'true_false') {
      if (!['true', 'false'].includes(input.correct_answer.toLowerCase())) {
        throw new Error('Correct answer for true/false questions must be "true" or "false"');
      }
    }

    // Insert the test question
    const result = await db.insert(testQuestionsTable)
      .values({
        test_id: input.test_id,
        question_type: input.question_type,
        question_text: input.question_text,
        options: input.options,
        correct_answer: input.correct_answer,
        points: input.points,
        order_index: input.order_index
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Test question creation failed:', error);
    throw error;
  }
};