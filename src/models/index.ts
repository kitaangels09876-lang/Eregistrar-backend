import sequelize from '../config/db.config';
import { User } from './user.model';
import { Admin } from './admin.model';
import { Role } from './role.model';
import { AuditLog } from './auditlog.model'; 
import { Payment } from "./payment.model";
import { Announcement } from "./announcement.model";
import { DocumentType } from "./document-type.model";
import { PaymentMethod } from "./payment-method.model";
import { StudentProfile } from "./student.model";

export { 
  sequelize, 
  User, 
  Admin, 
  Role, 
  AuditLog,
  Payment,
  Announcement,
  DocumentType,
  PaymentMethod,
  StudentProfile,
};
