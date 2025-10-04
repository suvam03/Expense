'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ExpenseTable } from '@/components/ExpenseTable';
import { ApprovalModal } from '@/components/ApprovalModal';
import { supabase, Expense, ExpenseApproval } from '@/lib/supabase';
import { LogOut, Loader as Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { convertCurrency } from '@/services/api';

type ExpenseWithApproval = Expense & {
  approval: ExpenseApproval;
};

export default function ManagerApprovalsPage() {
  const { user, profile, company, signOut } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseWithApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithApproval | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<number | undefined>();
  const [employeeNames, setEmployeeNames] = useState<{ [key: string]: string }>({});
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (profile && profile.role === 'employee') {
      router.push('/dashboard');
    } else if (profile && profile.role === 'admin') {
      router.push('/admin');
    }
  }, [user, profile, router]);

  useEffect(() => {
    if (user && profile?.role === 'manager') {
      loadPendingApprovals();
    }
  }, [user, profile]);

  const loadPendingApprovals = async () => {
    try {
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('expense_approvals')
        .select('*, expenses(*)')
        .eq('approver_id', user?.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (approvalsError) throw approvalsError;

      if (approvalsData) {
        const expensesWithApprovals: ExpenseWithApproval[] = approvalsData.map((approval: any) => ({
          ...approval.expenses,
          approval: {
            id: approval.id,
            expense_id: approval.expense_id,
            approver_id: approval.approver_id,
            step_order: approval.step_order,
            status: approval.status,
            comments: approval.comments,
            action_date: approval.action_date,
            created_at: approval.created_at,
          },
        }));

        setExpenses(expensesWithApprovals);

        const employeeIds = Array.from(new Set(expensesWithApprovals.map((e) => e.employee_id)));
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', employeeIds);

        if (profilesData) {
          const names: { [key: string]: string } = {};
          profilesData.forEach((p) => {
            names[p.id] = p.email;
          });
          setEmployeeNames(names);
        }
      }
    } catch (error) {
      console.error('Failed to load approvals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending approvals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseClick = async (expense: ExpenseWithApproval) => {
    setSelectedExpense(expense);

    if (company && expense.currency !== company.default_currency) {
      try {
        const converted = await convertCurrency(
          expense.amount,
          expense.currency,
          company.default_currency
        );
        setConvertedAmount(converted);
      } catch (error) {
        console.error('Failed to convert currency:', error);
        setConvertedAmount(undefined);
      }
    } else {
      setConvertedAmount(undefined);
    }

    setApprovalOpen(true);
  };

  const handleApprove = async (expenseId: string, comments: string) => {
    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      await supabase
        .from('expense_approvals')
        .update({
          status: 'approved',
          comments,
          action_date: new Date().toISOString(),
        })
        .eq('id', expense.approval.id);

      const { data: allApprovals } = await supabase
        .from('expense_approvals')
        .select('*')
        .eq('expense_id', expenseId)
        .order('step_order', { ascending: true });

      if (allApprovals) {
        const currentIndex = allApprovals.findIndex((a) => a.id === expense.approval.id);
        const nextApproval = allApprovals[currentIndex + 1];

        if (nextApproval && nextApproval.status === 'waiting') {
          await supabase
            .from('expense_approvals')
            .update({ status: 'pending' })
            .eq('id', nextApproval.id);
        } else if (!nextApproval) {
          const { data: ruleData } = await supabase
            .from('approval_rules')
            .select('*')
            .eq('company_id', profile?.company_id)
            .maybeSingle();

          let finalStatus = 'approved';

          if (ruleData?.rule_type) {
            const approvedCount = allApprovals.filter((a) => a.status === 'approved').length + 1;
            const totalCount = allApprovals.length;

            if (ruleData.rule_type === 'percentage' && ruleData.percentage_required) {
              const percentage = (approvedCount / totalCount) * 100;
              if (percentage < ruleData.percentage_required) {
                finalStatus = 'pending';
              }
            } else if (ruleData.rule_type === 'specific_approver') {
              if (user?.id !== ruleData.specific_approver_id) {
                finalStatus = 'pending';
              }
            } else if (ruleData.rule_type === 'hybrid') {
              const percentage = (approvedCount / totalCount) * 100;
              const percentageMet =
                ruleData.percentage_required && percentage >= ruleData.percentage_required;
              const specificApproverMet = user?.id === ruleData.specific_approver_id;

              if (!percentageMet && !specificApproverMet) {
                finalStatus = 'pending';
              }
            }
          }

          await supabase.from('expenses').update({ status: finalStatus }).eq('id', expenseId);
        }
      }

      toast({
        title: 'Success',
        description: 'Expense approved successfully',
      });

      loadPendingApprovals();
    } catch (error: any) {
      console.error('Failed to approve expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve expense',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleReject = async (expenseId: string, comments: string) => {
    try {
      const expense = expenses.find((e) => e.id === expenseId);
      if (!expense) return;

      await supabase
        .from('expense_approvals')
        .update({
          status: 'rejected',
          comments,
          action_date: new Date().toISOString(),
        })
        .eq('id', expense.approval.id);

      await supabase.from('expenses').update({ status: 'rejected' }).eq('id', expenseId);

      toast({
        title: 'Success',
        description: 'Expense rejected',
      });

      loadPendingApprovals();
    } catch (error: any) {
      console.error('Failed to reject expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject expense',
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
              <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
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
        <div className="mb-6">
          <p className="text-gray-400 text-sm">Company Currency</p>
          <p className="text-white font-medium">{company.default_currency}</p>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-12 bg-gray-950 rounded-lg border border-gray-800">
            <p className="text-gray-400">No pending approvals</p>
          </div>
        ) : (
          <ExpenseTable
            expenses={expenses}
            onExpenseClick={handleExpenseClick}
            showEmployee={true}
            employeeNames={employeeNames}
          />
        )}
      </main>

      <ApprovalModal
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        expense={selectedExpense}
        convertedAmount={convertedAmount}
        companyCurrency={company?.default_currency}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
