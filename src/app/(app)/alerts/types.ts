export type AlertType = 'REGULATORY' | 'STATUTORY' | 'LICENSE_RENEWAL' | 'CONTRACT_RENEWAL' | 'INSURANCE' | 'INSPECTION' | 'COMPLIANCE_FILING';

export type AlertStatus = 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export type Recurrence = 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';

export type EntityType = 'COMPANY' | 'SITE' | 'ASSET' | 'PROJECT' | 'OTHER';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface AlertEntityType {
  id: string;
  name: string;
  type: EntityType;
  jurisdiction?: string | null;
  isActive: boolean;
}

export interface AlertOwner {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}

export interface AlertReminderRule {
  id: string;
  alertId: string | null;
  daysBefore: number;
  isActive: boolean;
}

export interface AlertEscalationRule {
  id: string;
  alertId: string | null;
  afterDaysOverdue: number;
  escalateToRole: string | null;
  escalateToUserId?: string | null;
  isActive: boolean;
}

export interface AlertEvidence {
  id: string;
  alertId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedById: string;
  uploadedBy: { id: string; name?: string | null; email: string };
  createdAt: string;
}

export interface AlertComment {
  id: string;
  alertId: string;
  content: string;
  authorId: string;
  author: { id: string; name?: string | null; email: string };
  createdAt: string;
  deletedAt?: string | null;
}

export interface AlertStatusHistoryEntry {
  id: string;
  alertId: string;
  status: AlertStatus;
  changedById: string;
  changedBy: { id: string; name?: string | null; email: string };
  reason?: string | null;
  createdAt: string;
}

export interface Alert {
  id: string;
  alertNumber: number;
  alertNumberDisplay: string;
  title: string;
  reference?: string | null;
  description?: string | null;
  type: AlertType;
  status: AlertStatus;
  priority: Priority;
  regulatoryClause?: string | null;
  entityId: string;
  entity: AlertEntityType;
  ownerId: string;
  owner: AlertOwner;
  createdById: string;
  createdBy: { id: string; name?: string | null; email: string };
  departmentId?: string | null;
  department?: { id: string; name: string; code: string } | null;
  triggerDate: string;
  dueDate: string;
  recurrence: Recurrence;
  recurrenceIntervalDays?: number | null;
  recurrenceEndDate?: string | null;
  parentAlertId?: string | null;
  isOverdue: boolean;
  reminderRules: AlertReminderRule[];
  escalationRules: AlertEscalationRule[];
  comments: AlertComment[];
  evidence: AlertEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AlertStats {
  total: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  overdue: number;
  upcoming: number;
}

export interface RegulatoryTemplate {
  id: string;
  title: string;
  type: AlertType;
  jurisdiction: string;
  assetType?: string | null;
  regulatoryClause: string;
  defaultRecurrence: Recurrence;
  defaultLeadDays: number;
  isActive: boolean;
  createdAt: string;
}

export interface UserOption {
  id: string;
  name?: string | null;
  email: string;
  role: string;
}
