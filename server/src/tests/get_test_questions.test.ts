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
import { getTestQuestions } from '../handlers/get_test_questions';
import { type CreateTestQuestionInput } from '../schema';

describe('getTestQuestions', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch test questions ordered by order_index', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hash',
        first_name: 'John',
        last_name: 'Instructor',
        role: 'administrator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A lesson for testing',
        order_index: 1
      })
      .returning()
      .execute();

    const contentResult = await db.insert(lessonContentTable)
      .values({
        lesson_id: lessonResult[0].id,
        content_type: 'test',
        title: 'Test Content',
        content_data: '{"test": true}',
        order_index: 1
      })
      .returning()
      .execute();

    const testResult = await db.insert(testsTable)
      .values({
        lesson_content_id: contentResult[0].id,
        title: 'Sample Test',
        description: 'A test for testing',
        time_limit: 60,
        max_attempts: 3
      })
      .returning()
      .execute();

    const testId = testResult[0].id;

    // Create test questions with different order_index values
    const questionInputs: CreateTestQuestionInput[] = [
      {
        test_id: testId,
        question_type: 'multiple_choice',
        question_text: 'What is 2 + 2?',
        options: '["2", "3", "4", "5"]',
        correct_answer: '4',
        points: 10,
        order_index: 2
      },
      {
        test_id: testId,
        question_type: 'true_false',
        question_text: 'The sky is blue.',
        options: null,
        correct_answer: 'true',
        points: 5,
        order_index: 1
      },
      {
        test_id: testId,
        question_type: 'short_answer',
        question_text: 'What is the capital of France?',
        options: null,
        correct_answer: 'Paris',
        points: 15,
        order_index: 3
      }
    ];

    // Insert questions in random order
    await db.insert(testQuestionsTable)
      .values(questionInputs)
      .execute();

    // Fetch questions using the handler
    const questions = await getTestQuestions(testId);

    // Verify results are ordered correctly
    expect(questions).toHaveLength(3);
    expect(questions[0].order_index).toBe(1);
    expect(questions[0].question_text).toBe('The sky is blue.');
    expect(questions[0].question_type).toBe('true_false');
    expect(questions[0].points).toBe(5);
    expect(questions[0].correct_answer).toBe('true');
    expect(questions[0].options).toBeNull();

    expect(questions[1].order_index).toBe(2);
    expect(questions[1].question_text).toBe('What is 2 + 2?');
    expect(questions[1].question_type).toBe('multiple_choice');
    expect(questions[1].points).toBe(10);
    expect(questions[1].correct_answer).toBe('4');
    expect(questions[1].options).toBe('["2", "3", "4", "5"]');

    expect(questions[2].order_index).toBe(3);
    expect(questions[2].question_text).toBe('What is the capital of France?');
    expect(questions[2].question_type).toBe('short_answer');
    expect(questions[2].points).toBe(15);
    expect(questions[2].correct_answer).toBe('Paris');
    expect(questions[2].options).toBeNull();

    // Verify all questions have required fields
    questions.forEach(question => {
      expect(question.id).toBeDefined();
      expect(question.test_id).toBe(testId);
      expect(question.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for non-existent test', async () => {
    const questions = await getTestQuestions(999);
    expect(questions).toEqual([]);
  });

  it('should return empty array for test with no questions', async () => {
    // Create prerequisite data but no questions
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hash',
        first_name: 'John',
        last_name: 'Instructor',
        role: 'administrator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A lesson for testing',
        order_index: 1
      })
      .returning()
      .execute();

    const contentResult = await db.insert(lessonContentTable)
      .values({
        lesson_id: lessonResult[0].id,
        content_type: 'test',
        title: 'Test Content',
        content_data: '{"test": true}',
        order_index: 1
      })
      .returning()
      .execute();

    const testResult = await db.insert(testsTable)
      .values({
        lesson_content_id: contentResult[0].id,
        title: 'Empty Test',
        description: 'A test with no questions',
        time_limit: 30,
        max_attempts: 1
      })
      .returning()
      .execute();

    const questions = await getTestQuestions(testResult[0].id);
    expect(questions).toEqual([]);
  });

  it('should handle different question types correctly', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'instructor@test.com',
        password_hash: 'hash',
        first_name: 'John',
        last_name: 'Instructor',
        role: 'administrator'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        title: 'Test Course',
        description: 'A course for testing',
        owner_id: userResult[0].id,
        is_public: true,
        is_active: true
      })
      .returning()
      .execute();

    const lessonResult = await db.insert(lessonsTable)
      .values({
        course_id: courseResult[0].id,
        title: 'Test Lesson',
        description: 'A lesson for testing',
        order_index: 1
      })
      .returning()
      .execute();

    const contentResult = await db.insert(lessonContentTable)
      .values({
        lesson_id: lessonResult[0].id,
        content_type: 'test',
        title: 'Test Content',
        content_data: '{"test": true}',
        order_index: 1
      })
      .returning()
      .execute();

    const testResult = await db.insert(testsTable)
      .values({
        lesson_content_id: contentResult[0].id,
        title: 'Diverse Test',
        description: 'A test with various question types',
        time_limit: 45,
        max_attempts: 2
      })
      .returning()
      .execute();

    const testId = testResult[0].id;

    // Create questions of all different types
    const questionInputs: CreateTestQuestionInput[] = [
      {
        test_id: testId,
        question_type: 'multiple_choice',
        question_text: 'Choose the best option',
        options: '["Option A", "Option B", "Option C", "Option D"]',
        correct_answer: 'Option B',
        points: 20,
        order_index: 1
      },
      {
        test_id: testId,
        question_type: 'true_false',
        question_text: 'This statement is correct',
        options: null,
        correct_answer: 'false',
        points: 10,
        order_index: 2
      },
      {
        test_id: testId,
        question_type: 'short_answer',
        question_text: 'Provide a brief explanation',
        options: null,
        correct_answer: 'Sample answer',
        points: 25,
        order_index: 3
      },
      {
        test_id: testId,
        question_type: 'essay',
        question_text: 'Write a detailed essay on this topic',
        options: null,
        correct_answer: 'Detailed essay answer',
        points: 50,
        order_index: 4
      }
    ];

    await db.insert(testQuestionsTable)
      .values(questionInputs)
      .execute();

    const questions = await getTestQuestions(testId);

    expect(questions).toHaveLength(4);
    
    // Verify each question type
    const mcQuestion = questions.find(q => q.question_type === 'multiple_choice');
    expect(mcQuestion?.options).toBe('["Option A", "Option B", "Option C", "Option D"]');
    expect(mcQuestion?.points).toBe(20);

    const tfQuestion = questions.find(q => q.question_type === 'true_false');
    expect(tfQuestion?.options).toBeNull();
    expect(tfQuestion?.correct_answer).toBe('false');
    expect(tfQuestion?.points).toBe(10);

    const saQuestion = questions.find(q => q.question_type === 'short_answer');
    expect(saQuestion?.options).toBeNull();
    expect(saQuestion?.points).toBe(25);

    const essayQuestion = questions.find(q => q.question_type === 'essay');
    expect(essayQuestion?.points).toBe(50);
    expect(essayQuestion?.correct_answer).toBe('Detailed essay answer');
  });
});