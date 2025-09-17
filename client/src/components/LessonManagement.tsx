import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { 
  Course, 
  Lesson, 
  LessonContent,
  CreateLessonInput,
  CreateLessonContentInput,
  ContentType
} from '../../../server/src/schema';

export default function LessonManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonContent, setLessonContent] = useState<LessonContent[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateLessonDialogOpen, setIsCreateLessonDialogOpen] = useState(false);
  const [isCreateContentDialogOpen, setIsCreateContentDialogOpen] = useState(false);

  const [lessonFormData, setLessonFormData] = useState<CreateLessonInput>({
    course_id: 0,
    title: '',
    description: null,
    order_index: 1
  });

  const [contentFormData, setContentFormData] = useState<CreateLessonContentInput>({
    lesson_id: 0,
    content_type: 'text',
    title: '',
    content_data: '',
    order_index: 1
  });

  // Load courses
  const loadCourses = useCallback(async () => {
    try {
      const result = await trpc.getCourses.query();
      setCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  // Load lessons for selected course
  const loadLessons = useCallback(async (courseId: number) => {
    try {
      const result = await trpc.getLessonsByCourse.query({ courseId });
      setLessons(result);
    } catch (error) {
      console.error('Failed to load lessons:', error);
    }
  }, []);

  // Load content for selected lesson
  const loadLessonContent = useCallback(async (lessonId: number) => {
    try {
      const result = await trpc.getLessonContent.query({ lessonId });
      setLessonContent(result);
    } catch (error) {
      console.error('Failed to load lesson content:', error);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (selectedCourse) {
      loadLessons(selectedCourse);
      setSelectedLesson(null);
      setLessonContent([]);
    }
  }, [selectedCourse, loadLessons]);

  useEffect(() => {
    if (selectedLesson) {
      loadLessonContent(selectedLesson);
    }
  }, [selectedLesson, loadLessonContent]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    
    setIsLoading(true);
    try {
      const response = await trpc.createLesson.mutate({
        ...lessonFormData,
        course_id: selectedCourse
      });
      setLessons((prev: Lesson[]) => [...prev, response]);
      setLessonFormData({
        course_id: selectedCourse,
        title: '',
        description: null,
        order_index: lessons.length + 1
      });
      setIsCreateLessonDialogOpen(false);
    } catch (error) {
      console.error('Failed to create lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson) return;
    
    setIsLoading(true);
    try {
      // Parse content data based on type
      let contentData = contentFormData.content_data;
      if (contentFormData.content_type === 'test') {
        // For test content, we'll store it as JSON
        contentData = JSON.stringify({
          instructions: contentFormData.content_data,
          questions: [] // Will be populated later
        });
      }

      const response = await trpc.createLessonContent.mutate({
        ...contentFormData,
        lesson_id: selectedLesson,
        content_data: contentData
      });
      setLessonContent((prev: LessonContent[]) => [...prev, response]);
      setContentFormData({
        lesson_id: selectedLesson,
        content_type: 'text',
        title: '',
        content_data: '',
        order_index: lessonContent.length + 1
      });
      setIsCreateContentDialogOpen(false);
    } catch (error) {
      console.error('Failed to create content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContentPreview = (content: LessonContent) => {
    switch (content.content_type) {
      case 'text':
        return (
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700">{content.content_data}</p>
          </div>
        );
      case 'video':
        return (
          <div className="bg-gray-100 p-4 rounded">
            <div className="text-center text-gray-600">
              🎥 Video: {content.content_data}
            </div>
          </div>
        );
      case 'file':
        return (
          <div className="bg-gray-100 p-4 rounded">
            <div className="text-center text-gray-600">
              📁 File: {content.content_data}
            </div>
          </div>
        );
      case 'test':
        return (
          <div className="bg-blue-50 p-4 rounded">
            <div className="text-center text-blue-700">
              📝 Test/Quiz Content
            </div>
          </div>
        );
      default:
        return <div>Unknown content type</div>;
    }
  };

  const getContentTypeIcon = (type: ContentType) => {
    switch (type) {
      case 'text': return '📄';
      case 'video': return '🎥';
      case 'file': return '📁';
      case 'test': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📝 Lesson Management</h2>
          <p className="text-gray-600 mt-1">Create and manage lessons with diverse content types</p>
        </div>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCourse ? selectedCourse.toString() : 'none'} onValueChange={(value) => setSelectedCourse(Number(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a course to manage lessons" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  📚 {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCourse && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Lessons Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>📚 Lessons</CardTitle>
              <Dialog open={isCreateLessonDialogOpen} onOpenChange={setIsCreateLessonDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">➕ Add Lesson</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>➕ Create New Lesson</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateLesson} className="space-y-4">
                    <Input
                      placeholder="Lesson title"
                      value={lessonFormData.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLessonFormData((prev: CreateLessonInput) => ({ ...prev, title: e.target.value }))
                      }
                      required
                    />
                    <Textarea
                      placeholder="Lesson description (optional)"
                      value={lessonFormData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setLessonFormData((prev: CreateLessonInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                      rows={3}
                    />
                    <Input
                      type="number"
                      placeholder="Order index"
                      value={lessonFormData.order_index}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLessonFormData((prev: CreateLessonInput) => ({ 
                          ...prev, 
                          order_index: parseInt(e.target.value) || 1 
                        }))
                      }
                      min="1"
                      required
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading} className="flex-1">
                        {isLoading ? 'Creating...' : 'Create Lesson'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsCreateLessonDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-3">
              {lessons.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📚</div>
                  <p>No lessons yet. Create your first lesson!</p>
                </div>
              ) : (
                lessons.map((lesson: Lesson) => (
                  <div 
                    key={lesson.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLesson === lesson.id 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedLesson(lesson.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{lesson.order_index}. {lesson.title}</h4>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{lesson.order_index}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Lesson Content Panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedLesson ? '📄 Lesson Content' : '📄 Content'}
              </CardTitle>
              {selectedLesson && (
                <Dialog open={isCreateContentDialogOpen} onOpenChange={setIsCreateContentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">➕ Add Content</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>➕ Add Lesson Content</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateContent} className="space-y-4">
                      <Select 
                        value={contentFormData.content_type} 
                        onValueChange={(value: ContentType) =>
                          setContentFormData((prev: CreateLessonContentInput) => ({ ...prev, content_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">📄 Text Content</SelectItem>
                          <SelectItem value="video">🎥 Video</SelectItem>
                          <SelectItem value="file">📁 File</SelectItem>
                          <SelectItem value="test">📝 Test/Quiz</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder="Content title"
                        value={contentFormData.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setContentFormData((prev: CreateLessonContentInput) => ({ ...prev, title: e.target.value }))
                        }
                        required
                      />

                      {contentFormData.content_type === 'text' && (
                        <Textarea
                          placeholder="Enter your text content here..."
                          value={contentFormData.content_data}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setContentFormData((prev: CreateLessonContentInput) => ({ 
                              ...prev, 
                              content_data: e.target.value 
                            }))
                          }
                          rows={5}
                          required
                        />
                      )}

                      {contentFormData.content_type === 'video' && (
                        <Input
                          placeholder="Video URL or identifier"
                          value={contentFormData.content_data}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setContentFormData((prev: CreateLessonContentInput) => ({ 
                              ...prev, 
                              content_data: e.target.value 
                            }))
                          }
                          required
                        />
                      )}

                      {contentFormData.content_type === 'file' && (
                        <Input
                          placeholder="File name or path"
                          value={contentFormData.content_data}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setContentFormData((prev: CreateLessonContentInput) => ({ 
                              ...prev, 
                              content_data: e.target.value 
                            }))
                          }
                          required
                        />
                      )}

                      {contentFormData.content_type === 'test' && (
                        <Textarea
                          placeholder="Test instructions or description"
                          value={contentFormData.content_data}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setContentFormData((prev: CreateLessonContentInput) => ({ 
                              ...prev, 
                              content_data: e.target.value 
                            }))
                          }
                          rows={3}
                          required
                        />
                      )}

                      <Input
                        type="number"
                        placeholder="Content order"
                        value={contentFormData.order_index}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setContentFormData((prev: CreateLessonContentInput) => ({ 
                            ...prev, 
                            order_index: parseInt(e.target.value) || 1 
                          }))
                        }
                        min="1"
                        required
                      />

                      <div className="flex gap-2">
                        <Button type="submit" disabled={isLoading} className="flex-1">
                          {isLoading ? 'Adding...' : 'Add Content'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateContentDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {!selectedLesson ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">👈</div>
                  <p>Select a lesson to view its content</p>
                </div>
              ) : lessonContent.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📄</div>
                  <p>No content yet. Add some content to this lesson!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {lessonContent.map((content: LessonContent) => (
                    <div key={content.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getContentTypeIcon(content.content_type)}</span>
                          <h4 className="font-medium">{content.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{content.order_index}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {content.content_type}
                          </Badge>
                        </div>
                      </div>
                      {renderContentPreview(content)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}