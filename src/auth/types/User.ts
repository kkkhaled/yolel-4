import { Document } from 'mongoose';

export interface User extends Document {
  id?: string;
  deviceToken: string;
  notificationToken?: string;
  userPoints?: number;
  role: Role;
}

export enum AgeType {
  Child = 'child',
  Teenager = 'teenager',
  Youth = 'youth',
}

export enum Role {
  User = 'user',
  Admin = 'admin',
  Sub_Admin = 'sub_admin',
}
