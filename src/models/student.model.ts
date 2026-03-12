import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/db.config";

interface StudentProfileAttributes {
  student_id: number;
  user_id: number;

  student_number: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  extension_name?: string | null;

  birthdate?: Date | null;
  gender?: "male" | "female" | "other" | null;
  contact_number?: string | null;
  profile_picture?: string | null;

  course_id?: number | null;
  year_level?: "1st" | "2nd" | "3rd" | "4th" | "graduate" | null;

  enrollment_status?: "enrolled" | "graduated" | "dropped" | "transferred";
  created_at?: Date;
  updated_at?: Date | null;
}


interface StudentProfileCreationAttributes
  extends Optional<
    StudentProfileAttributes,
    "student_id" | "updated_at"
  > {}


export class StudentProfile
  extends Model<StudentProfileAttributes, StudentProfileCreationAttributes>
  implements StudentProfileAttributes
{
  public student_id!: number;
  public user_id!: number;

  public student_number!: string;
  public first_name!: string;
  public middle_name!: string | null;
  public last_name!: string;
  public extension_name!: string | null;

  public birthdate!: Date | null;
  public gender!: "male" | "female" | "other" | null;
  public contact_number!: string | null;
  public profile_picture!: string | null;

  public course_id!: number | null;
  public year_level!: "1st" | "2nd" | "3rd" | "4th" | "graduate" | null;

  public enrollment_status!: "enrolled" | "graduated" | "dropped" | "transferred";
  public readonly created_at!: Date;
  public readonly updated_at!: Date | null;
}


StudentProfile.init(
  {
    student_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    student_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    middle_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    extension_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    birthdate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM("male", "female", "other"),
      allowNull: true,
    },
    contact_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    year_level: {
      type: DataTypes.ENUM("1st", "2nd", "3rd", "4th", "graduate"),
      allowNull: true,
    },
    enrollment_status: {
      type: DataTypes.ENUM(
        "enrolled",
        "graduated",
        "dropped",
        "transferred"
      ),
      defaultValue: "enrolled",
    },
    created_at: {
      type: DataTypes.DATE,
    },
    updated_at: {
      type: DataTypes.DATE,
    },
  },
  {
    sequelize,
    tableName: "student_profiles",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);
