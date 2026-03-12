import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.config";

interface AnnouncementAttributes {
  announcement_id: number;
  title: string;
  start_date?: Date | null;
  end_date?: Date | null;
  message: string;
  posted_by: string;
  created_by: number;
  created_at?: Date;
}

type AnnouncementCreationAttributes = Optional<
  AnnouncementAttributes,
  "announcement_id" | "created_at" | "start_date" | "end_date"
>;

export class Announcement extends Model<
  AnnouncementAttributes,
  AnnouncementCreationAttributes
> implements AnnouncementAttributes {
  public announcement_id!: number;
  public title!: string;
  public start_date!: Date | null;
  public end_date!: Date | null;
  public message!: string;
  public posted_by!: string;
  public created_by!: number;
  public created_at!: Date;
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
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
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
    }
  },
  {
    sequelize,
    tableName: "announcements",
    timestamps: false
  }
);

export default Announcement;
