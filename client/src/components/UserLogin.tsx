import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserRole } from '../../../server/src/schema';

interface UserLoginProps {
  onLogin: (email: string, role: UserRole) => Promise<void>;
  isLoading: boolean;
}

export default function UserLogin({ onLogin, isLoading }: UserLoginProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('administrator');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      await onLogin(email, role);
    }
  };

  const quickLogin = (demoRole: UserRole, demoEmail: string) => {
    setEmail(demoEmail);
    setRole(demoRole);
    onLogin(demoEmail, demoRole);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-indigo-600">
            🎓 EduPlatform
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Online Learning Management System
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>
            
            <div>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrator">👑 Administrator</SelectItem>
                  <SelectItem value="moderator">🛡️ Moderator</SelectItem>
                  <SelectItem value="student">🎓 Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="space-y-2">
            <p className="text-sm text-gray-500 text-center">Quick Demo Access:</p>
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() => quickLogin('administrator', 'admin@eduplatform.com')}
                disabled={isLoading}
                className="text-sm"
              >
                👑 Admin Demo
              </Button>
              <Button
                variant="outline"
                onClick={() => quickLogin('moderator', 'moderator@eduplatform.com')}
                disabled={isLoading}
                className="text-sm"
              >
                🛡️ Moderator Demo
              </Button>
              <Button
                variant="outline"
                onClick={() => quickLogin('student', 'student@eduplatform.com')}
                disabled={isLoading}
                className="text-sm"
              >
                🎓 Student Demo
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500">
            <p>Demo Version - No real authentication required</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}