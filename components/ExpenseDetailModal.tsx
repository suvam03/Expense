'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Expense, ExpenseApproval } from '@/lib/supabase';
import { Check, X, Clock } from 'lucide-react';

type ExpenseDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  approvals: ExpenseApproval[];
  approverNames: { [key: string]: string };
};

export function ExpenseDetailModal({
  open,
  onOpenChange,
  expense,
  approvals,
  approverNames,
}: ExpenseDetailModalProps) {
  if (!expense) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'waiting':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const sortedApprovals = [...approvals].sort((a, b) => a.step_order - b.step_order);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Expense Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Amount</p>
              <p className="text-lg font-semibold">
                {expense.currency} {expense.amount.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Status</p>
              <Badge
                className={`mt-1 ${
                  expense.status === 'approved'
                    ? 'bg-green-600'
                    : expense.status === 'rejected'
                    ? 'bg-red-600'
                    : 'bg-yellow-600'
                } capitalize`}
              >
                {expense.status}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-gray-400">Category</p>
              <p className="text-white">{expense.category}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Date</p>
              <p className="text-white">
                {new Date(expense.expense_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">Description</p>
            <p className="text-white">{expense.description}</p>
          </div>

          {sortedApprovals.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-3">Approval Chain</p>
              <div className="space-y-3">
                {sortedApprovals.map((approval, index) => (
                  <div
                    key={approval.id}
                    className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800"
                  >
                    <div className="flex-shrink-0 mt-0.5">{getStatusIcon(approval.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-white">
                          Step {approval.step_order}: {approverNames[approval.approver_id] || 'Unknown'}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            approval.status === 'approved'
                              ? 'border-green-600 text-green-500'
                              : approval.status === 'rejected'
                              ? 'border-red-600 text-red-500'
                              : approval.status === 'pending'
                              ? 'border-yellow-600 text-yellow-500'
                              : 'border-gray-600 text-gray-500'
                          }`}
                        >
                          {approval.status}
                        </Badge>
                      </div>
                      {approval.comments && (
                        <p className="text-sm text-gray-400 mt-1">{approval.comments}</p>
                      )}
                      {approval.action_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(approval.action_date).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
