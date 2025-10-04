'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Expense } from '@/lib/supabase';

type ExpenseTableProps<T extends Expense = Expense> = {
  expenses: T[];
  onExpenseClick?: (expense: T) => void;
  showEmployee?: boolean;
  employeeNames?: { [key: string]: string };
};

export function ExpenseTable<T extends Expense = Expense>({
  expenses,
  onExpenseClick,
  showEmployee = false,
  employeeNames = {},
}: ExpenseTableProps<T>) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      case 'pending':
        return 'bg-yellow-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-gray-900">
            {showEmployee && <TableHead className="text-gray-400">Employee</TableHead>}
            <TableHead className="text-gray-400">Date</TableHead>
            <TableHead className="text-gray-400">Category</TableHead>
            <TableHead className="text-gray-400">Description</TableHead>
            <TableHead className="text-gray-400">Status</TableHead>
            <TableHead className="text-gray-400 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showEmployee ? 6 : 5}
                className="text-center text-gray-500 py-8"
              >
                No expenses found
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((expense) => (
              <TableRow
                key={expense.id}
                className="border-gray-800 hover:bg-gray-900 cursor-pointer"
                onClick={() => onExpenseClick?.(expense)}
              >
                {showEmployee && (
                  <TableCell className="text-gray-300">
                    {employeeNames[expense.employee_id] || 'Unknown'}
                  </TableCell>
                )}
                <TableCell className="text-gray-300">
                  {new Date(expense.expense_date).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-gray-300">{expense.category}</TableCell>
                <TableCell className="text-gray-300 max-w-xs truncate">
                  {expense.description}
                </TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(expense.status)} capitalize`}>
                    {expense.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-right font-medium">
                  {expense.currency} {expense.amount.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
