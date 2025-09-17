import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Course, 
  Lesson,
  Assignment, 
  AssignmentSubmission,
  CreateAssignmentInput,
  GradeAssignmentInput,
  EvaluationType
} from '../../../server/src/schema';

interface AssignmentManagementProps {
  currentUser: User;
}

export default function AssignmentManagement({ currentUser }: AssignmentManagementProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);

  const [assignmentFormData, setAssignmentFormData] = useState<CreateAssignmentInput>({
    lesson_id: 0,
    title: '',
    description: null,
    evaluation_type: 'manual',
    due_date: null,
    max_points: 100
  });

  const [gradingFormData, setGradingFormData] = useState<GradeAssignmentInput>({
    submission_id: 0,
    score: 0,
    feedback: null,
    graded_by: currentUser.id
  });

  const loadCourses = useCallback(async () => {
    try {
      const result = await trpc.getCourses.query();
      setCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  const loadLessons = useCallback(async (courseId: number) => {
    try {
      const result = await trpc.getLessonsByCourse.query({ courseId });
      setLessons(result);
    } catch (error) {
      console.error('Failed to load lessons:', error);
    }
  }, []);

  const loadSubmissions = useCallback(async (assignmentId: number) => {
    try {
      const result = await trpc.getAssignmentSubmissions.query({ assignmentId });
      setSubmissions(result);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    if (selectedCourse) {
      loadLessons(selectedCourse);
      // Reset assignments when course changes
      setAssignments([]);
      setSelectedAssignment(null);
    }
  }, [selectedCourse, loadLessons]);

  useEffect(() => {
    if (selectedAssignment) {
      loadSubmissions(selectedAssignment);
    }
  }, [selectedAssignment, loadSubmissions]);

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await trpc.createAssignment.mutate(assignmentFormData);
      setAssignments((prev: Assignment[]) => [...prev, response]);
      setAssignmentFormData({
        lesson_id: 0,
        title: '',
        description: null,
        evaluation_type: 'manual',
        due_date: null,
        max_points: 100
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create assignment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    
    setIsLoading(true);
    
    try {
      await trpc.gradeAssignment.mutate({
        ...gradingFormData,
        submission_id: gradingSubmission.id
      });
      
      // Update submissions list
      setSubmissions((prev: AssignmentSubmission[]) =>
        prev.map(sub => 
          sub.id === gradingSubmission.id
            ? { 
                ...sub, 
                status: 'graded', 
                score: gradingFormData.score,
                feedback: gradingFormData.feedback,
                graded_at: new Date(),
                graded_by: currentUser.id
              }
            : sub
        )
      );
      
      setGradingSubmission(null);
      setGradingFormData({
        submission_id: 0,
        score: 0,
        feedback: null,
        graded_by: currentUser.id
      });
    } catch (error) {
      console.error('Failed to grade submission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'graded': return 'text-green-600 bg-green-100';
      case 'returned': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'submitted': return '📤';
      case 'graded': return '✅';
      case 'returned': return '🔄';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📋 Assignment Management</h2>
          <p className="text-gray-600 mt-1">Create assignments and manage submissions</p>
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
              <SelectValue placeholder="Choose a course to manage assignments" />
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
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList>
            <TabsTrigger value="assignments">📋 Assignments</TabsTrigger>
            <TabsTrigger value="submissions">📤 Submissions</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Course Assignments</h3>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>➕ Create Assignment</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>➕ Create New Assignment</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAssignment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lesson
                      </label>
                      <Select 
                        value={assignmentFormData.lesson_id ? assignmentFormData.lesson_id.toString() : 'none'} 
                        onValueChange={(value) => 
                          setAssignmentFormData((prev: CreateAssignmentInput) => ({ 
                            ...prev, 
                            lesson_id: Number(value) 
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lesson" />
                        </SelectTrigger>
                        <SelectContent>
                          {lessons.map((lesson) => (
                            <SelectItem key={lesson.id} value={lesson.id.toString()}>
                              {lesson.order_index}. {lesson.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      placeholder="Assignment title"
                      value={assignmentFormData.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setAssignmentFormData((prev: CreateAssignmentInput) => ({ 
                          ...prev, 
                          title: e.target.value 
                        }))
                      }
                      required
                    />

                    <Textarea
                      placeholder="Assignment description (optional)"
                      value={assignmentFormData.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setAssignmentFormData((prev: CreateAssignmentInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                      rows={3}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Evaluation Type
                      </label>
                      <Select 
                        value={assignmentFormData.evaluation_type} 
                        onValueChange={(value: EvaluationType) =>
                          setAssignmentFormData((prev: CreateAssignmentInput) => ({ 
                            ...prev, 
                            evaluation_type: value 
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">✏️ Manual Grading</SelectItem>
                          <SelectItem value="automatic">🤖 Automatic Grading</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Due Date
                        </label>
                        <Input
                          type="date"
                          value={assignmentFormData.due_date?.toISOString().split('T')[0] || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setAssignmentFormData((prev: CreateAssignmentInput) => ({
                              ...prev,
                              due_date: e.target.value ? new Date(e.target.value) : null
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Points
                        </label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={assignmentFormData.max_points}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setAssignmentFormData((prev: CreateAssignmentInput) => ({ 
                              ...prev, 
                              max_points: parseInt(e.target.value) || 100 
                            }))
                          }
                          min="1"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading || !assignmentFormData.lesson_id} className="flex-1">
                        {isLoading ? 'Creating...' : 'Create Assignment'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {assignments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create assignments for your course lessons.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    Create Your First Assignment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assignments.map((assignment: Assignment) => (
                  <Card 
                    key={assignment.id} 
                    className={`hover:shadow-lg transition-shadow cursor-pointer ${
                      selectedAssignment === assignment.id ? 'ring-2 ring-indigo-500' : ''
                    }`}
                    onClick={() => setSelectedAssignment(assignment.id)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{assignment.title}</CardTitle>
                        <div className="flex gap-2">
                          <Badge variant={assignment.evaluation_type === 'automatic' ? 'default' : 'secondary'}>
                            {assignment.evaluation_type === 'automatic' ? '🤖 Auto' : '✏️ Manual'}
                          </Badge>
                          <Badge variant="outline">
                            {assignment.max_points} pts
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {assignment.description && (
                        <p className="text-gray-600 text-sm mb-3">{assignment.description}</p>
                      )}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Lesson #{assignment.lesson_id}</span>
                        {assignment.due_date && (
                          <span>Due: {assignment.due_date.toLocaleDateString()}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            {!selectedAssignment ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">📤</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select an assignment</h3>
                  <p className="text-gray-600">
                    Choose an assignment to view its submissions.
                  </p>
                </CardContent>
              </Card>
            ) : submissions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
                  <p className="text-gray-600">
                    Students haven't submitted this assignment yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Assignment Submissions</h3>
                {submissions.map((submission: AssignmentSubmission) => (
                  <Card key={submission.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getStatusIcon(submission.status)}</span>
                          <div>
                            <h4 className="font-medium">Student #{submission.student_id}</h4>
                            <p className="text-sm text-gray-600">
                              Submitted: {submission.submitted_at.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status}
                          </Badge>
                          {submission.score !== null && (
                            <Badge variant="outline">
                              {submission.score} pts
                            </Badge>
                          )}
                        </div>
                      </div>

                      {submission.feedback && (
                        <div className="bg-blue-50 p-3 rounded mb-3">
                          <p className="text-sm font-medium text-blue-900 mb-1">Feedback:</p>
                          <p className="text-sm text-blue-800">{submission.feedback}</p>
                        </div>
                      )}

                      {submission.status === 'submitted' && (
                        <div className="flex justify-end">
                          <Button 
                            size="sm" 
                            onClick={() => {
                              setGradingSubmission(submission);
                              setGradingFormData(prev => ({
                                ...prev,
                                submission_id: submission.id,
                                score: 0
                              }));
                            }}
                          >
                            ✏️ Grade
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Grading Dialog */}
      {gradingSubmission && (
        <Dialog open={!!gradingSubmission} onOpenChange={() => setGradingSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>✏️ Grade Submission</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGradeSubmission} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Score (out of {assignments.find(a => a.id === selectedAssignment)?.max_points || 100})
                </label>
                <Input
                  type="number"
                  value={gradingFormData.score}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setGradingFormData((prev: GradeAssignmentInput) => ({ 
                      ...prev, 
                      score: parseInt(e.target.value) || 0 
                    }))
                  }
                  min="0"
                  max={assignments.find(a => a.id === selectedAssignment)?.max_points || 100}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback (optional)
                </label>
                <Textarea
                  value={gradingFormData.feedback || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setGradingFormData((prev: GradeAssignmentInput) => ({
                      ...prev,
                      feedback: e.target.value || null
                    }))
                  }
                  rows={4}
                  placeholder="Provide feedback for the student..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Grading...' : 'Submit Grade'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setGradingSubmission(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}