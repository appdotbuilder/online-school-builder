import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { User, Course, CreateCourseInput, UpdateCourseInput } from '../../../server/src/schema';

interface CourseManagementProps {
  currentUser: User;
}

export default function CourseManagement({ currentUser }: CourseManagementProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const [formData, setFormData] = useState<CreateCourseInput>({
    title: '',
    description: null,
    owner_id: currentUser.id,
    is_public: true,
    is_active: true
  });

  const loadCourses = useCallback(async () => {
    try {
      const result = await trpc.getCourses.query();
      setCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingCourse) {
        const updateData: UpdateCourseInput = {
          id: editingCourse.id,
          title: formData.title,
          description: formData.description,
          is_public: formData.is_public,
          is_active: formData.is_active
        };
        await trpc.updateCourse.mutate(updateData);
        setCourses((prev: Course[]) => 
          prev.map(course => 
            course.id === editingCourse.id 
              ? { ...course, ...updateData }
              : course
          )
        );
      } else {
        const response = await trpc.createCourse.mutate(formData);
        setCourses((prev: Course[]) => [...prev, response]);
      }
      
      // Reset form
      setFormData({
        title: '',
        description: null,
        owner_id: currentUser.id,
        is_public: true,
        is_active: true
      });
      setIsCreateDialogOpen(false);
      setEditingCourse(null);
    } catch (error) {
      console.error('Failed to save course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      owner_id: course.owner_id,
      is_public: course.is_public,
      is_active: course.is_active
    });
    setIsCreateDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: null,
      owner_id: currentUser.id,
      is_public: true,
      is_active: true
    });
    setEditingCourse(null);
    setIsCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📚 Course Management</h2>
          <p className="text-gray-600 mt-1">Create and manage your educational courses</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              ➕ Create New Course
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCourse ? '✏️ Edit Course' : '➕ Create New Course'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Title
                </label>
                <Input
                  placeholder="Enter course title"
                  value={formData.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCourseInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  placeholder="Course description (optional)"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateCourseInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Public Course
                </label>
                <Switch
                  checked={formData.is_public || false}
                  onCheckedChange={(checked: boolean) =>
                    setFormData((prev: CreateCourseInput) => ({ ...prev, is_public: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Active
                </label>
                <Switch
                  checked={formData.is_active || false}
                  onCheckedChange={(checked: boolean) =>
                    setFormData((prev: CreateCourseInput) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first course to start building your educational content.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create Your First Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course: Course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                  <div className="flex gap-1">
                    {course.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {course.is_public && (
                      <Badge variant="outline">Public</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {course.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {course.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>Created: {course.created_at.toLocaleDateString()}</span>
                  <span>Updated: {course.updated_at.toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(course)}
                    className="flex-1"
                  >
                    ✏️ Edit
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="flex-1"
                  >
                    📝 Lessons
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}