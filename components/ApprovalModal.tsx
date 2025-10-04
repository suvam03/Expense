'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Expense } from '@/lib/supabase';
import { Loader as Loader2 } from 'lucide-react';

type ApprovalModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  convertedAmount?: number;
  companyCurrency?: string;
  onApprove: (expenseId: string, comments: string) => Promise<void>;
  onReject: (expenseId: string, comments: string) => Promise<void>;
};

export function ApprovalModal({
  open,
  onOpenChange,
  expense,
  convertedAmount,
  companyCurrency,
  onApprove,
  onReject,
}: ApprovalModalProps) {
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  if (!expense) return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(expense.id, comments);
      setComments('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(expense.id, comments);
      setComments('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 border-gray-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Review Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-900 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Original Amount</span>
              <span className="font-semibold">
                {expense.currency} {expense.amount.toFixed(2)}
              </span>
            </div>

            {convertedAmount !== undefined && companyCurrency && expense.currency !== companyCurrency && (
              <div className="flex justify-between border-t border-gray-800 pt-3">
                <span className="text-gray-400">Converted Amount</span>
                <span className="font-semibold">
                  {companyCurrency} {convertedAmount.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between border-t border-gray-800 pt-3">
              <span className="text-gray-400">Category</span>
              <span className="text-white">{expense.category}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span className="text-white">
                {new Date(expense.expense_date).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-2">Description</p>
            <p className="text-white bg-gray-900 rounded-lg p-3">{expense.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (Optional)</Label>
            <Textarea
              id="comments"
              placeholder="Add your comments here..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="bg-gray-900 border-gray-800 text-white min-h-[100px]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleReject}
              disabled={loading}
              variant="outline"
              className="flex-1 border-red-700 text-red-500 hover:bg-red-950"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Reject'
              )}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Approve'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
