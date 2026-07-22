export enum WorkflowStatus {
  IN_PIPELINE = 'in_pipeline',
  ASSESSMENT = 'assessment',
  DEVELOPMENT = 'development',
  UAT = 'uat',
  DEPLOYMENT = 'deployment',
  GO_LIVE = 'go_live',
  DROP = 'drop',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum UserRole {
  GUEST = 'guest',
  BUSINESS_USER = 'business_user',
  MANAGER = 'manager',
  BUSINESS_ANALYST = 'business_analyst',
  VENDOR = 'vendor',
  ADMINISTRATOR = 'administrator',
}

export enum NotificationType {
  ASSIGNMENT = 'assignment',
  MENTION = 'mention',
  COMMENT = 'comment',
  STATUS_CHANGE = 'status_change',
  DUE_DATE_REMINDER = 'due_date_reminder',
  GO_LIVE = 'go_live',
  DEPLOYMENT = 'deployment',
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ImpactLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  STATUS_CHANGE = 'status_change',
  ASSIGNMENT = 'assignment',
  DEPLOYMENT = 'deployment',
  COMMENT = 'comment',
  ATTACHMENT_UPLOAD = 'attachment_upload',
}
