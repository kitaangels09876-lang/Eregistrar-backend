import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.config";

interface AnnouncementAttributes {
  announcement_id: number;
  title: string;
  message: string;
  posted_by: string;
  created_by: number;
  created_at?: Date;
  updated_at?: Date | null;
}

type AnnouncementCreationAttributes = Optional<
  AnnouncementAttributes,
  "announcement_id" | "created_at" | "updated_at"
>;

export class Announcement extends Model<
  AnnouncementAttributes,
  AnnouncementCreationAttributes
> implements AnnouncementAttributes {
  public announcement_id!: number;
  public title!: string;
  public message!: string;
  public posted_by!: string;
  public created_by!: number;
  public created_at!: Date;
  public updated_at!: Date | null;
}

Announcement.init(
  {
    announcement_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    posted_by: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "announcements",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default Announcement;
