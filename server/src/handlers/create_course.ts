import { type CreateCourseInput, type Course } from '../schema';

export async function createCourse(input: CreateCourseInput): Promise<Course> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new course with the specified owner
    // and default settings for public/active status.
    return Promise.resolve({
        id: 0, // Placeholder ID
        title: input.title,
        description: input.description,
        owner_id: input.owner_id,
        is_public: input.is_public ?? false,
        is_active: input.is_active ?? true,
        created_at: new Date(),
        updated_at: new Date()
    } as Course);
}