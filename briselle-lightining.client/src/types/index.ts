// Common types used across the application

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface ObjectDefinition {
  id: string;
  name: string;
  apiName: string;
  description?: string;
  recordCount: number;
  lastModified: string;
  isCustom: boolean;
}

export interface FieldDefinition {
  id: string;
  objectId: string;
  name: string;
  apiName: string;
  type: FieldType;
  required: boolean;
  defaultValue?: string;
  description?: string;
  picklistValues?: string[];
  referenceObject?: string;
  length?: number;
  precision?: number;
  scale?: number;
}

export type FieldType = 
  | 'Text'
  | 'Number'
  | 'Date'
  | 'DateTime'
  | 'Checkbox'
  | 'Picklist'
  | 'MultiPicklist'
  | 'Lookup'
  | 'TextArea'
  | 'Email'
  | 'Phone'
  | 'URL'
  | 'Currency'
  | 'Percent'
  | 'AutoNumber';

export interface Record {
  id: string;
  objectId: string;
  values: { [key: string]: any };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  actionType: 'create' | 'update' | 'delete' | 'view';
  objectType: string;
  recordId?: string;
  recordName?: string;
  details?: string;
  timestamp: string;
}

export interface ValidationRule {
  id: string;
  objectId: string;
  name: string;
  description?: string;
  condition: string;
  errorMessage: string;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
}

export interface Permission {
  objectId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
}

export interface Widget {
  id: string;
  type: 'chart' | 'list' | 'metric' | 'table';
  title: string;
  config: any;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}