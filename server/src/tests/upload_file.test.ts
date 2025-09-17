import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { filesTable, usersTable } from '../db/schema';
import { uploadFile, getFilesByUser } from '../handlers/upload_file';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'John',
  last_name: 'Doe',
  role: 'student' as const
};

const testUser2 = {
  email: 'test2@example.com',
  password_hash: 'hashed_password2',
  first_name: 'Jane',
  last_name: 'Smith',
  role: 'administrator' as const
};

// Test file data
const testFileData = {
  filename: 'uploaded_file_123.pdf',
  originalFilename: 'document.pdf',
  filePath: '/uploads/2024/01/uploaded_file_123.pdf',
  fileSize: 1024000,
  mimeType: 'application/pdf'
};

const testFileData2 = {
  filename: 'image_456.jpg',
  originalFilename: 'photo.jpg',
  filePath: '/uploads/2024/01/image_456.jpg',
  fileSize: 512000,
  mimeType: 'image/jpeg'
};

describe('uploadFile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  it('should upload a file successfully', async () => {
    const result = await uploadFile(
      testFileData.filename,
      testFileData.originalFilename,
      testFileData.filePath,
      testFileData.fileSize,
      testFileData.mimeType,
      userId
    );

    // Verify returned data
    expect(result.id).toBeDefined();
    expect(result.filename).toEqual(testFileData.filename);
    expect(result.original_filename).toEqual(testFileData.originalFilename);
    expect(result.file_path).toEqual(testFileData.filePath);
    expect(result.file_size).toEqual(testFileData.fileSize);
    expect(result.mime_type).toEqual(testFileData.mimeType);
    expect(result.uploaded_by).toEqual(userId);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save file metadata to database', async () => {
    const result = await uploadFile(
      testFileData.filename,
      testFileData.originalFilename,
      testFileData.filePath,
      testFileData.fileSize,
      testFileData.mimeType,
      userId
    );

    // Query database directly to verify data was saved
    const files = await db.select()
      .from(filesTable)
      .where(eq(filesTable.id, result.id))
      .execute();

    expect(files).toHaveLength(1);
    const savedFile = files[0];
    expect(savedFile.filename).toEqual(testFileData.filename);
    expect(savedFile.original_filename).toEqual(testFileData.originalFilename);
    expect(savedFile.file_path).toEqual(testFileData.filePath);
    expect(savedFile.file_size).toEqual(testFileData.fileSize);
    expect(savedFile.mime_type).toEqual(testFileData.mimeType);
    expect(savedFile.uploaded_by).toEqual(userId);
    expect(savedFile.created_at).toBeInstanceOf(Date);
  });

  it('should handle different file types correctly', async () => {
    // Upload PDF file
    const pdfResult = await uploadFile(
      testFileData.filename,
      testFileData.originalFilename,
      testFileData.filePath,
      testFileData.fileSize,
      testFileData.mimeType,
      userId
    );

    // Upload image file
    const imageResult = await uploadFile(
      testFileData2.filename,
      testFileData2.originalFilename,
      testFileData2.filePath,
      testFileData2.fileSize,
      testFileData2.mimeType,
      userId
    );

    // Verify both files were created with correct MIME types
    expect(pdfResult.mime_type).toEqual('application/pdf');
    expect(imageResult.mime_type).toEqual('image/jpeg');
    expect(pdfResult.id).not.toEqual(imageResult.id);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(uploadFile(
      testFileData.filename,
      testFileData.originalFilename,
      testFileData.filePath,
      testFileData.fileSize,
      testFileData.mimeType,
      nonExistentUserId
    )).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should handle large file sizes', async () => {
    const largeFileData = {
      ...testFileData,
      filename: 'large_file.zip',
      originalFilename: 'archive.zip',
      fileSize: 50000000, // 50MB
      mimeType: 'application/zip'
    };

    const result = await uploadFile(
      largeFileData.filename,
      largeFileData.originalFilename,
      largeFileData.filePath,
      largeFileData.fileSize,
      largeFileData.mimeType,
      userId
    );

    expect(result.file_size).toEqual(50000000);
    expect(typeof result.file_size).toBe('number');
  });
});

describe('getFilesByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId1: number;
  let userId2: number;

  beforeEach(async () => {
    // Create test users
    const userResult1 = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId1 = userResult1[0].id;

    const userResult2 = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();
    userId2 = userResult2[0].id;
  });

  it('should return empty array for user with no files', async () => {
    const files = await getFilesByUser(userId1);

    expect(files).toEqual([]);
  });

  it('should return all files uploaded by a user', async () => {
    // Upload files for user 1
    await uploadFile(
      testFileData.filename,
      testFileData.originalFilename,
      testFileData.filePath,
      testFileData.fileSize,
      testFileData.mimeType,
      userId1
    );

    await uploadFile(
      testFileData2.filename,
      testFileData2.originalFilename,
      testFileData2.filePath,
      testFileData2.fileSize,
      testFileData2.mimeType,
      userId1
    );

    // Upload file for user 2
    await uploadFile(
      'user2_file.txt',
      'document.txt',
      '/uploads/2024/01/user2_file.txt',
      5000,
      'text/plain',
      userId2
    );

    // Get files for user 1
    const user1Files = await getFilesByUser(userId1);

    expect(user1Files).toHaveLength(2);
    expect(user1Files.every(file => file.uploaded_by === userId1)).toBe(true);

    // Verify file details
    const pdfFile = user1Files.find(file => file.mime_type === 'application/pdf');
    const imageFile = user1Files.find(file => file.mime_type === 'image/jpeg');

    expect(pdfFile).toBeDefined();
    expect(pdfFile?.filename).toEqual(testFileData.filename);
    expect(pdfFile?.original_filename).toEqual(testFileData.originalFilename);

    expect(imageFile).toBeDefined();
    expect(imageFile?.filename).toEqual(testFileData2.filename);
    expect(imageFile?.original_filename).toEqual(testFileData2.originalFilename);
  });

  it('should return files only for the specified user', async () => {
    // Upload files for both users
    await uploadFile(
      testFileData.filename,
      testFileData.originalFilename,
      testFileData.filePath,
      testFileData.fileSize,
      testFileData.mimeType,
      userId1
    );

    await uploadFile(
      'user2_file.txt',
      'document.txt',
      '/uploads/2024/01/user2_file.txt',
      5000,
      'text/plain',
      userId2
    );

    // Get files for user 2
    const user2Files = await getFilesByUser(userId2);

    expect(user2Files).toHaveLength(1);
    expect(user2Files[0].uploaded_by).toEqual(userId2);
    expect(user2Files[0].filename).toEqual('user2_file.txt');
    expect(user2Files[0].mime_type).toEqual('text/plain');
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(getFilesByUser(nonExistentUserId))
      .rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should return files ordered by creation date', async () => {
    // Upload multiple files with slight delay
    const file1 = await uploadFile(
      'first_file.txt',
      'first.txt',
      '/uploads/first.txt',
      1000,
      'text/plain',
      userId1
    );

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const file2 = await uploadFile(
      'second_file.txt',
      'second.txt',
      '/uploads/second.txt',
      2000,
      'text/plain',
      userId1
    );

    const files = await getFilesByUser(userId1);

    expect(files).toHaveLength(2);
    
    // Files should be returned in order they were inserted
    expect(files[0].id).toEqual(file1.id);
    expect(files[1].id).toEqual(file2.id);
    expect(files[0].created_at.getTime()).toBeLessThanOrEqual(files[1].created_at.getTime());
  });

  it('should handle user with many files', async () => {
    // Upload multiple files
    const uploadPromises = [];
    for (let i = 1; i <= 10; i++) {
      uploadPromises.push(uploadFile(
        `file_${i}.txt`,
        `document_${i}.txt`,
        `/uploads/file_${i}.txt`,
        i * 1000,
        'text/plain',
        userId1
      ));
    }

    await Promise.all(uploadPromises);

    const files = await getFilesByUser(userId1);

    expect(files).toHaveLength(10);
    expect(files.every(file => file.uploaded_by === userId1)).toBe(true);
    
    // Verify all files have different names and sizes
    const filenames = files.map(file => file.filename);
    const uniqueFilenames = new Set(filenames);
    expect(uniqueFilenames.size).toEqual(10);
  });
});