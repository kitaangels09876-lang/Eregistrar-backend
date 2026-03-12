import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.config";

export interface RequestStatusLogAttributes {
  status_log_id: number;
  request_id: number;
  status: 'pending_payment' | 'pending_verification' | 'processing' | 'for_release' | 'ready_for_pickup' | 'completed' | 'rejected';
  message: string;
  created_by: number;
  created_at: Date;
  updated_at: Date | null;
}

interface RequestStatusLogCreationAttributes
  extends Optional<RequestStatusLogAttributes, "status_log_id" | "created_at" | "updated_at"> {}

export class RequestStatusLog
  extends Model<RequestStatusLogAttributes, RequestStatusLogCreationAttributes>
  implements RequestStatusLogAttributes {

  public status_log_id!: number;
  public request_id!: number;
  public status!: 'pending_payment' | 'pending_verification' | 'processing' | 'for_release' | 'ready_for_pickup' | 'completed' | 'rejected';
  public message!: string;
  public created_by!: number;
  public created_at!: Date;
  public updated_at!: Date | null;
}

RequestStatusLog.init(
  {
    status_log_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    request_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'document_requests',
        key: 'request_id'
      }
    },
    status: {
      type: DataTypes.ENUM(
        "pending_payment",
        "pending_verification",
        "processing",
        "for_release",
        "ready_for_pickup",
        "completed",
        "rejected"
      ),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'admin_profiles',
        key: 'admin_id'
      }
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "request_status_logs",
    timestamps: false,
  }
);