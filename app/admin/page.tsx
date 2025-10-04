'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersTab } from '@/components/admin/UsersTab';
import { ApprovalRulesTab } from '@/components/admin/ApprovalRulesTab';
import { LogOut, Loader as Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const { user, profile, company, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (profile && profile.role !== 'admin') {
      if (profile.role === 'employee') {
        router.push('/dashboard');
      } else if (profile.role === 'manager') {
        router.push('/manager/approvals');
      }
    } else if (profile) {
      setLoading(false);
    }
  }, [user, profile, router]);

  if (loading || !profile || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-gray-800 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">
                {company.name} • {profile.email}
              </p>
            </div>
            <Button
              onClick={signOut}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-900"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="bg-gray-950 border-gray-800 mb-6">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="approval-rules"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Approval Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="approval-rules">
            <ApprovalRulesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
