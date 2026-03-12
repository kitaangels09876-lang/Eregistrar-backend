import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.config";

export class PaymentMethod extends Model {
  public method_id!: number;
  public method_name!: string;
  public send_to!: string;
  public sender_name!: string;
  public is_active!: boolean;
  public created_at!: Date;
}

PaymentMethod.init(
  {
    method_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    method_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    send_to: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    sender_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "payment_methods",
    timestamps: false, // matches your table definition
  }
);
