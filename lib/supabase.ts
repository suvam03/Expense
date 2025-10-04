import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  company_id: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  manager_id: string | null;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  country: string;
  default_currency: string;
  created_at: string;
};

export type Expense = {
  id: string;
  company_id: string;
  employee_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  expense_date: string;
  status: 'pending' | 'approved' | 'rejected';
  receipt_url: string | null;
  created_at: string;
};

export type ApprovalRule = {
  id: string;
  company_id: string;
  name: string;
  is_manager_approver: boolean;
  rule_type: 'percentage' | 'specific_approver' | 'hybrid' | null;
  percentage_required: number | null;
  specific_approver_id: string | null;
  created_at: string;
};

export type ApprovalStep = {
  id: string;
  approval_rule_id: string;
  approver_id: string;
  step_order: number;
  created_at: string;
};

export type ExpenseApproval = {
  id: string;
  expense_id: string;
  approver_id: string;
  step_order: number;
  status: 'pending' | 'approved' | 'rejected' | 'waiting';
  comments: string | null;
  action_date: string | null;
  created_at: string;
};
