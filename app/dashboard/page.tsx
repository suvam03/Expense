'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ExpenseTable } from '@/components/ExpenseTable';
import { NewExpenseModal } from '@/components/NewExpenseModal';
import { ExpenseDetailModal } from '@/components/ExpenseDetailModal';
import { supabase, Expense, ExpenseApproval } from '@/lib/supabase';
import { Plus, LogOut, Loader as Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EmployeeDashboard() {
  const { user, profile, company, signOut } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvals, setApprovals] = useState<ExpenseApproval[]>([]);
  const [approverNames, setApproverNames] = useState<{ [key: string]: string }>({});
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (profile && profile.role !== 'employee') {
      if (profile.role === 'admin') {
        router.push('/admin');
      } else if (profile.role === 'manager') {
        router.push('/manager/approvals');
      }
    }
  }, [user, profile, router]);

  useEffect(() => {
    if (user && profile?.role === 'employee') {
      loadExpenses();
    }
  }, [user, profile]);

  const loadExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('employee_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load expenses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseClick = async (expense: Expense) => {
    setSelectedExpense(expense);

    try {
      const { data: approvalsData } = await supabase
        .from('expense_approvals')
        .select('*')
        .eq('expense_id', expense.id)
        .order('step_order', { ascending: true });

      if (approvalsData) {
        setApprovals(approvalsData);

        const approverIds = Array.from(new Set(approvalsData.map((a) => a.approver_id)));
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', approverIds);

        if (profilesData) {
          const names: { [key: string]: string } = {};
          profilesData.forEach((p) => {
            names[p.id] = p.email;
          });
          setApproverNames(names);
        }
      }

      setDetailOpen(true);
    } catch (error) {
      console.error('Failed to load approvals:', error);
    }
  };

  const handleNewExpense = async (expenseData: {
    amount: number;
    currency: string;
    category: string;
    description: string;
    expense_date: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          company_id: profile?.company_id,
          employee_id: user?.id,
          ...expenseData,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const { data: ruleData } = await supabase
          .from('approval_rules')
          .select('*, approval_steps(*)')
          .eq('company_id', profile?.company_id)
          .maybeSingle();

        if (ruleData) {
          const approvalRecords = [];

          if (ruleData.is_manager_approver && profile?.manager_id) {
            approvalRecords.push({
              expense_id: data.id,
              approver_id: profile.manager_id,
              step_order: 0,
              status: 'pending',
            });
          }

          if (ruleData.approval_steps) {
            for (const step of ruleData.approval_steps) {
              approvalRecords.push({
                expense_id: data.id,
                approver_id: step.approver_id,
                step_order: step.step_order + (ruleData.is_manager_approver ? 1 : 0),
                status: ruleData.is_manager_approver || step.step_order > 1 ? 'waiting' : 'pending',
              });
            }
          }

          if (approvalRecords.length > 0) {
            await supabase.from('expense_approvals').insert(approvalRecords);
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Expense submitted successfully',
      });

      loadExpenses();
    } catch (error: any) {
      console.error('Failed to submit expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit expense',
        variant: 'destructive',
      });
      throw error;
    }
  };

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
              <h1 className="text-2xl font-bold text-white">My Expenses</h1>
              <p className="text-sm text-gray-400 mt-1">{profile.email}</p>
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-gray-400 text-sm">Default Currency</p>
            <p className="text-white font-medium">{company.default_currency}</p>
          </div>
          <Button
            onClick={() => setNewExpenseOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Expense
          </Button>
        </div>

        <ExpenseTable expenses={expenses} onExpenseClick={handleExpenseClick} />
      </main>

      <NewExpenseModal
        open={newExpenseOpen}
        onOpenChange={setNewExpenseOpen}
        onSubmit={handleNewExpense}
        defaultCurrency={company.default_currency}
      />

      <ExpenseDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        expense={selectedExpense}
        approvals={approvals}
        approverNames={approverNames}
      />
    </div>
  );
}
