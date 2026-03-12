import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.config";

export class DocumentType extends Model {
  declare document_type_id: number;
  declare document_name: string;
  declare description: string;
  declare base_price: number;
  declare requirements: string;
  declare estimated_processing_days: number;
  declare is_active: boolean;
}

DocumentType.init(
  {
    document_type_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    document_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    base_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    estimated_processing_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: "document_types",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);
