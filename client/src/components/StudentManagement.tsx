import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Course, 
  StudentProgress, 
  CreateUserInput 
} from '../../../server/src/schema';

export default function StudentManagement() {
  const [students, setStudents] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    password: 'student123',
    first_name: '',
    last_name: '',
    role: 'student'
  });

  const [enrollmentData, setEnrollmentData] = useState({
    studentId: 0,
    courseId: 0
  });

  const loadStudents = useCallback(async () => {
    try {
      const result = await trpc.getUsers.query({ role: 'student' });
      setStudents(result);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const result = await trpc.getCourses.query();
      setCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  const loadStudentProgress = useCallback(async (studentId: number) => {
    try {
      const result = await trpc.getStudentProgress.query({ studentId });
      setProgress(result);
    } catch (error) {
      console.error('Failed to load student progress:', error);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadCourses();
  }, [loadStudents, loadCourses]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentProgress(selectedStudent);
    }
  }, [selectedStudent, loadStudentProgress]);

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await trpc.createUser.mutate(formData);
      setStudents((prev: User[]) => [...prev, response]);
      setFormData({
        email: '',
        password: 'student123',
        first_name: '',
        last_name: '',
        role: 'student'
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create student:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.enrollStudent.mutate({
        studentId: enrollmentData.studentId,
        courseId: enrollmentData.courseId
      });
      
      // Refresh progress if the enrolled student is currently selected
      if (selectedStudent === enrollmentData.studentId) {
        loadStudentProgress(selectedStudent);
      }
      
      setEnrollmentData({ studentId: 0, courseId: 0 });
      setIsEnrollDialogOpen(false);
    } catch (error) {
      console.error('Failed to enroll student:', error);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">👥 Student Management</h2>
          <p className="text-gray-600 mt-1">Manage student accounts and track their progress</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>➕ Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>➕ Create New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First Name"
                    value={formData.first_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, first_name: e.target.value }))
                    }
                    required
                  />
                  <Input
                    placeholder="Last Name"
                    value={formData.last_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateUserInput) => ({ ...prev, last_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? 'Creating...' : 'Create Student'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">📚 Enroll Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>📚 Enroll Student in Course</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEnrollStudent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Student
                  </label>
                  <Select 
                    value={enrollmentData.studentId.toString()} 
                    onValueChange={(value) => setEnrollmentData(prev => ({ ...prev, studentId: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.first_name} {student.last_name} ({student.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Course
                  </label>
                  <Select 
                    value={enrollmentData.courseId.toString()} 
                    onValueChange={(value) => setEnrollmentData(prev => ({ ...prev, courseId: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading || !enrollmentData.studentId || !enrollmentData.courseId} 
                    className="flex-1"
                  >
                    {isLoading ? 'Enrolling...' : 'Enroll Student'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Students Directory</CardTitle>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👥</div>
                <p>No students yet. Add your first student!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student: User) => (
                  <div 
                    key={student.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedStudent === student.id 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedStudent(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {student.first_name} {student.last_name}
                        </h4>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined: {student.created_at.toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">Student</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Progress */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedStudent ? '📊 Student Progress' : '📊 Progress Overview'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedStudent ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Select a student to view their progress</p>
              </div>
            ) : progress.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>No progress data yet. Student needs to be enrolled in courses.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    {students.find(s => s.id === selectedStudent)?.first_name} {students.find(s => s.id === selectedStudent)?.last_name}
                  </h3>
                  <Badge variant="secondary">
                    {progress.length} lesson{progress.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                {progress.map((item: StudentProgress) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={item.completed ? '✅' : '⏱️'}>
                          {item.completed ? 'Completed' : 'In Progress'}
                        </span>
                        <span className="text-sm font-medium">
                          Lesson #{item.lesson_id}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.time_spent} min
                      </div>
                    </div>
                    
                    {item.completed && item.completion_date && (
                      <div className="text-xs text-green-600">
                        Completed: {item.completion_date.toLocaleDateString()}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-1">
                      Last updated: {item.updated_at.toLocaleDateString()}
                    </div>
                  </div>
                ))}

                {/* Progress Summary */}
                <div className="border-t pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {progress.filter(p => p.completed).length}
                      </div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {progress.reduce((sum, p) => sum + p.time_spent, 0)}
                      </div>
                      <div className="text-sm text-gray-600">Total Minutes</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}