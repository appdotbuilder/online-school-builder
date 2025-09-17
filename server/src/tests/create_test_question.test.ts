import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  coursesTable, 
  lessonsTable, 
  lessonContentTable, 
  testsTable, 
  testQuestionsTable 
} from '../db/schema';
import { type CreateTestQuestionInput } from '../schema';
import { createTestQuestion } from '../handlers/create_test_question';
import { eq } from 'drizzle-orm';

// Test data setup
let testUserId: number;
let testCourseId: number;
let testLessonId: number;
let testLessonContentId: number;
let testId: number;

describe('createTestQuestion', () => {
  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'Instructor',
        role: 'administrator'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: testUserId,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();
    testCourseId = courseResult[0].id;

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: testCourseId,
        title: 'Test Lesson',
        description: 'A lesson for testing',
        order_index: 1
      })
      .returning()
      .execute();
    testLessonId = lessonResult[0].id;

    const lessonContentResult = await db.insert(lessonContentTable)
      .values({
        lesson_id: testLessonId,
        content_type: 'test',
        title: 'Test Content',
        content_data: '{"type": "test"}',
        order_index: 1
      })
      .returning()
      .execute();
    testLessonContentId = lessonContentResult[0].id;

    const testResult = await db.insert(testsTable)
      .values({
        lesson_content_id: testLessonContentId,
        title: 'Sample Test',
        description: 'A test for testing questions',
        time_limit: 60,
        max_attempts: 3
      })
      .returning()
      .execute();
    testId = testResult[0].id;
  });

  afterEach(resetDB);

  describe('multiple choice questions', () => {
    it('should create a multiple choice question', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'multiple_choice',
        question_text: 'What is 2 + 2?',
        options: JSON.stringify(['1', '2', '3', '4']),
        correct_answer: '4',
        points: 5,
        order_index: 1
      };

      const result = await createTestQuestion(input);

      expect(result.test_id).toEqual(testId);
      expect(result.question_type).toEqual('multiple_choice');
      expect(result.question_text).toEqual('What is 2 + 2?');
      expect(result.options).toEqual(JSON.stringify(['1', '2', '3', '4']));
      expect(result.correct_answer).toEqual('4');
      expect(result.points).toEqual(5);
      expect(result.order_index).toEqual(1);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should save multiple choice question to database', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'multiple_choice',
        question_text: 'What is the capital of France?',
        options: JSON.stringify(['London', 'Berlin', 'Paris', 'Madrid']),
        correct_answer: 'Paris',
        points: 10,
        order_index: 2
      };

      const result = await createTestQuestion(input);

      const questions = await db.select()
        .from(testQuestionsTable)
        .where(eq(testQuestionsTable.id, result.id))
        .execute();

      expect(questions).toHaveLength(1);
      expect(questions[0].question_text).toEqual('What is the capital of France?');
      expect(questions[0].options).toEqual(JSON.stringify(['London', 'Berlin', 'Paris', 'Madrid']));
      expect(questions[0].correct_answer).toEqual('Paris');
      expect(questions[0].points).toEqual(10);
    });

    it('should throw error if options are missing for multiple choice', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'multiple_choice',
        question_text: 'What is 2 + 2?',
        options: null,
        correct_answer: '4',
        points: 5,
        order_index: 1
      };

      await expect(createTestQuestion(input)).rejects.toThrow(/options are required/i);
    });

    it('should throw error if options are invalid JSON', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'multiple_choice',
        question_text: 'What is 2 + 2?',
        options: 'invalid json',
        correct_answer: '4',
        points: 5,
        order_index: 1
      };

      await expect(createTestQuestion(input)).rejects.toThrow(/valid json/i);
    });

    it('should throw error if options are not an array', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'multiple_choice',
        question_text: 'What is 2 + 2?',
        options: JSON.stringify('not an array'),
        correct_answer: '4',
        points: 5,
        order_index: 1
      };

      await expect(createTestQuestion(input)).rejects.toThrow(/non-empty json array/i);
    });

    it('should throw error if correct answer is not in options', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'multiple_choice',
        question_text: 'What is 2 + 2?',
        options: JSON.stringify(['1', '2', '3']),
        correct_answer: '4',
        points: 5,
        order_index: 1
      };

      await expect(createTestQuestion(input)).rejects.toThrow(/correct answer must be one of the provided options/i);
    });
  });

  describe('true/false questions', () => {
    it('should create a true/false question', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'true_false',
        question_text: 'The sky is blue.',
        options: null,
        correct_answer: 'true',
        points: 2,
        order_index: 1
      };

      const result = await createTestQuestion(input);

      expect(result.question_type).toEqual('true_false');
      expect(result.question_text).toEqual('The sky is blue.');
      expect(result.options).toBeNull();
      expect(result.correct_answer).toEqual('true');
      expect(result.points).toEqual(2);
      expect(result.id).toBeDefined();
    });

    it('should accept "false" as correct answer', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'true_false',
        question_text: 'The Earth is flat.',
        options: null,
        correct_answer: 'false',
        points: 2,
        order_index: 1
      };

      const result = await createTestQuestion(input);

      expect(result.correct_answer).toEqual('false');
    });

    it('should throw error for invalid true/false answer', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'true_false',
        question_text: 'The sky is blue.',
        options: null,
        correct_answer: 'maybe',
        points: 2,
        order_index: 1
      };

      await expect(createTestQuestion(input)).rejects.toThrow(/must be "true" or "false"/i);
    });
  });

  describe('other question types', () => {
    it('should create a short answer question', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'short_answer',
        question_text: 'What is the capital of France?',
        options: null,
        correct_answer: 'Paris',
        points: 5,
        order_index: 1
      };

      const result = await createTestQuestion(input);

      expect(result.question_type).toEqual('short_answer');
      expect(result.question_text).toEqual('What is the capital of France?');
      expect(result.correct_answer).toEqual('Paris');
      expect(result.points).toEqual(5);
    });

    it('should create an essay question', async () => {
      const input: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'essay',
        question_text: 'Discuss the impact of climate change.',
        options: null,
        correct_answer: 'Sample essay response',
        points: 20,
        order_index: 1
      };

      const result = await createTestQuestion(input);

      expect(result.question_type).toEqual('essay');
      expect(result.question_text).toEqual('Discuss the impact of climate change.');
      expect(result.points).toEqual(20);
    });
  });

  describe('validation', () => {
    it('should throw error if test does not exist', async () => {
      const input: CreateTestQuestionInput = {
        test_id: 99999,
        question_type: 'multiple_choice',
        question_text: 'What is 2 + 2?',
        options: JSON.stringify(['1', '2', '3', '4']),
        correct_answer: '4',
        points: 5,
        order_index: 1
      };

      await expect(createTestQuestion(input)).rejects.toThrow(/test with id 99999 does not exist/i);
    });

    it('should handle different order indices correctly', async () => {
      const input1: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'short_answer',
        question_text: 'Question 1',
        options: null,
        correct_answer: 'Answer 1',
        points: 5,
        order_index: 1
      };

      const input2: CreateTestQuestionInput = {
        test_id: testId,
        question_type: 'short_answer',
        question_text: 'Question 2',
        options: null,
        correct_answer: 'Answer 2',
        points: 5,
        order_index: 2
      };

      const result1 = await createTestQuestion(input1);
      const result2 = await createTestQuestion(input2);

      expect(result1.order_index).toEqual(1);
      expect(result2.order_index).toEqual(2);

      // Verify both questions are saved with correct order
      const allQuestions = await db.select()
        .from(testQuestionsTable)
        .where(eq(testQuestionsTable.test_id, testId))
        .execute();

      expect(allQuestions).toHaveLength(2);
      const sortedQuestions = allQuestions.sort((a, b) => a.order_index - b.order_index);
      expect(sortedQuestions[0].question_text).toEqual('Question 1');
      expect(sortedQuestions[1].question_text).toEqual('Question 2');
    });
  });
});