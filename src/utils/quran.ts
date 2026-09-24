import type { CompletionStatus } from '@/types';
import { round1 } from './format';

/** نسبة الإنجاز = المنجز÷المطلوب×100، محسوبة دائمًا وليست مُدخلة يدويًا. آمنة إن كان المطلوب صفرًا. */
export function completionPercent(requiredPages: number, completedPages: number): number {
  if (!requiredPages || requiredPages <= 0) return completedPages > 0 ? 100 : 0;
  return round1(Math.max(0, Math.min(100, (completedPages / requiredPages) * 100)));
}

/** حالة الإنجاز المشتقة من النسبة: أتم المطلوب / أنجز جزئيًا / لم ينجز */
export function completionStatus(completion: number): CompletionStatus {
  if (completion >= 100) return 'completed';
  if (completion <= 0) return 'not_done';
  return 'partial';
}

export const completionStatusLabels: Record<CompletionStatus, string> = {
  completed: 'أتمّ المطلوب',
  partial: 'أنجز جزئيًا',
  not_done: 'لم يُنجز',
};

export const completionStatusTone: Record<CompletionStatus, 'green' | 'gold' | 'burgundy'> = {
  completed: 'green',
  partial: 'gold',
  not_done: 'burgundy',
};
