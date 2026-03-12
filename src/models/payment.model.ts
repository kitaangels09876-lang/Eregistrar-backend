import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.config";

interface PaymentAttributes {
  payment_id: number;

  batch_id?: number | null;

  request_id?: number | null;

  student_id: number;
  amount: number;
  method_id: number;

  payment_proof?: string | null;
  payment_status: "pending" | "submitted" | "verified" | "rejected" | "refunded";
  verified_by?: number | null;
  verified_at?: Date | null;
  created_at?: Date;
}

interface PaymentCreationAttributes
  extends Optional<
    PaymentAttributes,
    | "payment_id"
    | "batch_id"
    | "request_id"
    | "payment_proof"
    | "verified_by"
    | "verified_at"
    | "created_at"
  > {}

export class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  public payment_id!: number;
  public batch_id!: number | null;
  public request_id!: number | null;
  public student_id!: number;
  public amount!: number;
  public method_id!: number;
  public payment_proof!: string | null;
  public payment_status!: "pending" | "submitted" | "verified" | "rejected" | "refunded";
  public verified_by!: number | null;
  public verified_at!: Date | null;
  public created_at!: Date;
}

Payment.init(
  {
    payment_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    batch_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    request_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },

    method_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    payment_proof: {
      type: DataTypes.STRING,
      allowNull: true
    },

    payment_status: {
      type: DataTypes.ENUM(
        "pending",
        "submitted",
        "verified",
        "rejected",
        "refunded"
      ),
      defaultValue: "pending"
    },

    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "payments",
    timestamps: false
  }
);

export default Payment;
