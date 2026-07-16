import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { WorkflowStatus, Priority } from '@crms/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!date) return '-'
  return format(new Date(date), fmt)
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const STATUS_LABELS: Record<WorkflowStatus, string> = {
  [WorkflowStatus.IN_PIPELINE]: 'In Pipeline',
  [WorkflowStatus.ASSESSMENT]: 'Assessment',
  [WorkflowStatus.DEVELOPMENT]: 'Development',
  [WorkflowStatus.UAT]: 'UAT',
  [WorkflowStatus.DEPLOYMENT]: 'Deployment',
  [WorkflowStatus.GO_LIVE]: 'Go Live',
  [WorkflowStatus.DROP]: 'Drop',
}

export const STATUS_COLORS: Record<WorkflowStatus, string> = {
  [WorkflowStatus.IN_PIPELINE]: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  [WorkflowStatus.ASSESSMENT]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  [WorkflowStatus.DEVELOPMENT]: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  [WorkflowStatus.UAT]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  [WorkflowStatus.DEPLOYMENT]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  [WorkflowStatus.GO_LIVE]: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  [WorkflowStatus.DROP]: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export const STATUS_DOT_COLORS: Record<WorkflowStatus, string> = {
  [WorkflowStatus.IN_PIPELINE]: 'bg-slate-400',
  [WorkflowStatus.ASSESSMENT]: 'bg-blue-500',
  [WorkflowStatus.DEVELOPMENT]: 'bg-violet-500',
  [WorkflowStatus.UAT]: 'bg-amber-500',
  [WorkflowStatus.DEPLOYMENT]: 'bg-orange-500',
  [WorkflowStatus.GO_LIVE]: 'bg-green-500',
  [WorkflowStatus.DROP]: 'bg-red-500',
}

export const STATUS_BORDER_COLORS: Record<WorkflowStatus, string> = {
  [WorkflowStatus.IN_PIPELINE]: 'border-l-slate-400',
  [WorkflowStatus.ASSESSMENT]: 'border-l-blue-500',
  [WorkflowStatus.DEVELOPMENT]: 'border-l-violet-500',
  [WorkflowStatus.UAT]: 'border-l-amber-500',
  [WorkflowStatus.DEPLOYMENT]: 'border-l-orange-500',
  [WorkflowStatus.GO_LIVE]: 'border-l-green-500',
  [WorkflowStatus.DROP]: 'border-l-red-500',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.LOW]: 'Low',
  [Priority.MEDIUM]: 'Medium',
  [Priority.HIGH]: 'High',
  [Priority.CRITICAL]: 'Critical',
}

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.LOW]: 'bg-slate-100 text-slate-600',
  [Priority.MEDIUM]: 'bg-blue-100 text-blue-700',
  [Priority.HIGH]: 'bg-amber-100 text-amber-700',
  [Priority.CRITICAL]: 'bg-red-100 text-red-700',
}

export const PRIORITY_DOT_COLORS: Record<Priority, string> = {
  [Priority.LOW]: 'bg-slate-400',
  [Priority.MEDIUM]: 'bg-blue-500',
  [Priority.HIGH]: 'bg-amber-500',
  [Priority.CRITICAL]: 'bg-red-500',
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
