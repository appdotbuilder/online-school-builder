import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { User, UserRole } from '../../server/src/schema';

// Import components
import Dashboard from '@/components/Dashboard';
import CourseManagement from '@/components/CourseManagement';
import LessonManagement from '@/components/LessonManagement';
import StudentManagement from '@/components/StudentManagement';
import AssignmentManagement from '@/components/AssignmentManagement';
import UserLogin from '@/components/UserLogin';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);

  // Login function - handles user authentication
  const handleLogin = async (email: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Get existing user or create new one
      const users = await trpc.getUsers.query({ role });
      const user = users.find(u => u.email === email) || users[0];
      if (user) {
        setCurrentUser(user);
      } else {
        // Create a new user if none exists
        const newUser = await trpc.createUser.mutate({
          email,
          password: 'demo123',
          first_name: 'Demo',
          last_name: 'User',
          role
        });
        setCurrentUser(newUser);
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserLogin onLogin={handleLogin} isLoading={isLoading} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">🎓 EduPlatform</h1>
              <span className="ml-4 text-sm text-gray-500">
                Online Learning Management System
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {currentUser.first_name} {currentUser.last_name}
              </span>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
                {currentUser.role}
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-6 mb-8">
            <TabsTrigger value="dashboard" className="text-sm">
              📊 Dashboard
            </TabsTrigger>
            <TabsTrigger value="courses" className="text-sm">
              📚 Courses
            </TabsTrigger>
            <TabsTrigger value="lessons" className="text-sm">
              📝 Lessons
            </TabsTrigger>
            <TabsTrigger value="students" className="text-sm">
              👥 Students
            </TabsTrigger>
            <TabsTrigger value="assignments" className="text-sm">
              📋 Assignments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <CourseManagement currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="lessons" className="space-y-6">
            <LessonManagement />
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            <StudentManagement />
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <AssignmentManagement currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;