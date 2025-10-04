'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, ApprovalRule, ApprovalStep, Profile } from '@/lib/supabase';
import { Plus, Trash2, GripVertical, Loader as Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ApprovalStepWithProfile = ApprovalStep & {
  profile?: Profile;
};

export function ApprovalRulesTab() {
  const { profile: currentProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rule, setRule] = useState<ApprovalRule | null>(null);
  const [steps, setSteps] = useState<ApprovalStepWithProfile[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [isManagerApprover, setIsManagerApprover] = useState(false);
  const [ruleType, setRuleType] = useState<'sequential' | 'percentage' | 'specific_approver' | 'hybrid'>('sequential');
  const [percentageRequired, setPercentageRequired] = useState(60);
  const [specificApproverId, setSpecificApproverId] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: managersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', currentProfile?.company_id)
        .in('role', ['manager', 'admin'])
        .order('email');

      setManagers(managersData || []);

      const { data: ruleData } = await supabase
        .from('approval_rules')
        .select('*')
        .eq('company_id', currentProfile?.company_id)
        .maybeSingle();

      if (ruleData) {
        setRule(ruleData);
        setIsManagerApprover(ruleData.is_manager_approver);

        if (ruleData.rule_type) {
          setRuleType(ruleData.rule_type as any);
          if (ruleData.percentage_required) {
            setPercentageRequired(ruleData.percentage_required);
          }
          if (ruleData.specific_approver_id) {
            setSpecificApproverId(ruleData.specific_approver_id);
          }
        }

        const { data: stepsData } = await supabase
          .from('approval_steps')
          .select('*, profiles(*)')
          .eq('approval_rule_id', ruleData.id)
          .order('step_order');

        if (stepsData) {
          setSteps(
            stepsData.map((step: any) => ({
              id: step.id,
              approval_rule_id: step.approval_rule_id,
              approver_id: step.approver_id,
              step_order: step.step_order,
              created_at: step.created_at,
              profile: step.profiles,
            }))
          );
        }
      }
    } catch (error) {
      console.error('Failed to load approval rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approval rules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: `temp-${Date.now()}`,
        approval_rule_id: rule?.id || '',
        approver_id: '',
        step_order: steps.length + 1,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps.map((step, i) => ({ ...step, step_order: i + 1 })));
  };

  const updateStepApprover = (index: number, approverId: string) => {
    const newSteps = [...steps];
    const selectedManager = managers.find((m) => m.id === approverId);
    newSteps[index] = {
      ...newSteps[index],
      approver_id: approverId,
      profile: selectedManager,
    };
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

    setSteps(newSteps.map((step, i) => ({ ...step, step_order: i + 1 })));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      let ruleId = rule?.id;

      if (!ruleId) {
        const { data: newRule, error: ruleError } = await supabase
          .from('approval_rules')
          .insert({
            company_id: currentProfile?.company_id,
            name: 'Default Approval Rule',
            is_manager_approver: isManagerApprover,
            rule_type: ruleType === 'sequential' ? null : ruleType,
            percentage_required: ruleType === 'percentage' || ruleType === 'hybrid' ? percentageRequired : null,
            specific_approver_id: ruleType === 'specific_approver' || ruleType === 'hybrid' ? specificApproverId : null,
          })
          .select()
          .single();

        if (ruleError) throw ruleError;
        ruleId = newRule.id;
        setRule(newRule);
      } else {
        await supabase
          .from('approval_rules')
          .update({
            is_manager_approver: isManagerApprover,
            rule_type: ruleType === 'sequential' ? null : ruleType,
            percentage_required: ruleType === 'percentage' || ruleType === 'hybrid' ? percentageRequired : null,
            specific_approver_id: ruleType === 'specific_approver' || ruleType === 'hybrid' ? specificApproverId : null,
          })
          .eq('id', ruleId);
      }

      await supabase.from('approval_steps').delete().eq('approval_rule_id', ruleId);

      if (steps.length > 0) {
        const stepsToInsert = steps
          .filter((step) => step.approver_id)
          .map((step) => ({
            approval_rule_id: ruleId,
            approver_id: step.approver_id,
            step_order: step.step_order,
          }));

        if (stepsToInsert.length > 0) {
          await supabase.from('approval_steps').insert(stepsToInsert);
        }
      }

      toast({
        title: 'Success',
        description: 'Approval rules saved successfully',
      });

      loadData();
    } catch (error: any) {
      console.error('Failed to save approval rules:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save approval rules',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Approval Workflow Configuration</h2>
        <p className="text-sm text-gray-400 mt-1">
          Define multi-level approvals and conditional rules
        </p>
      </div>

      <Card className="bg-gray-950 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Manager Approval</CardTitle>
          <CardDescription className="text-gray-400">
            Require direct manager approval before other approvers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="manager-approver"
              checked={isManagerApprover}
              onCheckedChange={(checked) => setIsManagerApprover(checked as boolean)}
              className="border-gray-700"
            />
            <label
              htmlFor="manager-approver"
              className="text-sm text-gray-300 cursor-pointer"
            >
              Employee's direct manager must approve first
            </label>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-950 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Approval Sequence</CardTitle>
          <CardDescription className="text-gray-400">
            Define the order of approvers for expense claims
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800"
            >
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveStep(index, 'up')}
                  disabled={index === 0}
                  className="h-6 px-2 hover:bg-gray-800"
                >
                  <GripVertical className="h-3 w-3 text-gray-400" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveStep(index, 'down')}
                  disabled={index === steps.length - 1}
                  className="h-6 px-2 hover:bg-gray-800"
                >
                  <GripVertical className="h-3 w-3 text-gray-400" />
                </Button>
              </div>

              <div className="flex-1">
                <Label className="text-gray-400 text-xs">Step {step.step_order}</Label>
                <Select
                  value={step.approver_id}
                  onValueChange={(value) => updateStepApprover(index, value)}
                >
                  <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
                    <SelectValue placeholder="Select approver" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-800 text-white">
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.email} ({manager.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeStep(index)}
                className="text-red-500 hover:bg-red-950 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            onClick={addStep}
            variant="outline"
            className="w-full border-gray-700 text-gray-300 hover:bg-gray-900"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Approval Step
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-950 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Conditional Approval Rules</CardTitle>
          <CardDescription className="text-gray-400">
            Set up flexible approval conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Rule Type</Label>
            <Select value={ruleType} onValueChange={(value: any) => setRuleType(value)}>
              <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800 text-white">
                <SelectItem value="sequential">Sequential (All must approve in order)</SelectItem>
                <SelectItem value="percentage">Percentage (Approval threshold)</SelectItem>
                <SelectItem value="specific_approver">Specific Approver (Auto-approve)</SelectItem>
                <SelectItem value="hybrid">Hybrid (Percentage OR Specific)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(ruleType === 'percentage' || ruleType === 'hybrid') && (
            <div className="space-y-2">
              <Label htmlFor="percentage">Percentage Required (%)</Label>
              <Input
                id="percentage"
                type="number"
                min="0"
                max="100"
                value={percentageRequired}
                onChange={(e) => setPercentageRequired(parseInt(e.target.value) || 0)}
                className="bg-gray-900 border-gray-800 text-white"
              />
              <p className="text-xs text-gray-500">
                If {percentageRequired}% of approvers approve, the expense is approved
              </p>
            </div>
          )}

          {(ruleType === 'specific_approver' || ruleType === 'hybrid') && (
            <div className="space-y-2">
              <Label htmlFor="specific-approver">Specific Approver</Label>
              <Select value={specificApproverId} onValueChange={setSpecificApproverId}>
                <SelectTrigger className="bg-gray-900 border-gray-800 text-white">
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-800 text-white">
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.email} ({manager.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                If this person approves, the expense is auto-approved
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Approval Rules'
        )}
      </Button>
    </div>
  );
}
