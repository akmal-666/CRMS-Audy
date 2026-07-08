import type {
  WorkflowStatus,
  Priority,
  UserRole,
  NotificationType,
  ComplexityLevel,
  RiskLevel,
  ImpactLevel,
  AuditAction,
} from './enums'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  departmentId?: string
  branchId?: string
  avatarUrl?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Department {
  id: string
  name: string
  code: string
  createdAt: Date
  updatedAt: Date
}

export interface Branch {
  id: string
  name: string
  code: string
  departmentId: string
  createdAt: Date
  updatedAt: Date
}

export interface Vendor {
  id: string
  name: string
  code: string
  contactPerson?: string
  email?: string
  phone?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WorkItem {
  id: string
  ticketNumber: string
  title: string
  description: string
  problemDescription: string
  expectedSolution?: string
  departmentId: string
  branchId?: string
  priority: Priority
  status: WorkflowStatus
  requesterName: string
  requesterEmail: string
  dueDate?: Date
  managerId?: string
  businessAnalystId?: string
  vendorId?: string
  developerId?: string
  qaId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Assessment {
  id: string
  workItemId: string
  estimatedManDays?: number
  estimatedHours?: number
  targetGoLive?: Date
  complexity?: ComplexityLevel
  risk?: RiskLevel
  impact?: ImpactLevel
  technicalNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  workItemId: string
  title: string
  description?: string
  isCompleted: boolean
  assigneeId?: string
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Subtask {
  id: string
  taskId: string
  title: string
  isCompleted: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  workItemId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Attachment {
  id: string
  workItemId: string
  fileName: string
  fileSize: number
  mimeType: string
  r2Key: string
  uploadedBy: string
  createdAt: Date
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  workItemId?: string
  isRead: boolean
  createdAt: Date
}

export interface ActivityLog {
  id: string
  workItemId: string
  userId?: string
  action: string
  description: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface AuditLog {
  id: string
  userId?: string
  action: AuditAction
  entityType: string
  entityId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface Deployment {
  id: string
  workItemId: string
  version: string
  deploymentDate: Date
  deploymentNotes?: string
  rollbackPlan?: string
  deployedBy: string
  createdAt: Date
  updatedAt: Date
}
