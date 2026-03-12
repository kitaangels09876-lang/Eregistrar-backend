import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/db.config';

export interface AuditLogAttributes {
  log_id: number;
  user_id: number | null;
  action: string;
  table_name: string | null;
  record_id: number | null;
  old_value: any | null;
  new_value: any | null;
  timestamp: Date;
  ip_address: string | null;
  user_agent: string | null;
}

interface AuditLogCreationAttributes
  extends Optional<AuditLogAttributes, 'log_id' | 'timestamp' | 'user_id' | 'table_name' | 'record_id' | 'old_value' | 'new_value' | 'ip_address' | 'user_agent'> {}

export class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes {
  
  public log_id!: number;
  public user_id!: number | null;
  public action!: string;
  public table_name!: string | null;
  public record_id!: number | null;
  public old_value!: any | null;
  public new_value!: any | null;
  public timestamp!: Date;
  public ip_address!: string | null;
  public user_agent!: string | null;
}

AuditLog.init(
  {
    log_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    action: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    table_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    record_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    old_value: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    new_value: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ip_address: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false, 
  }
);