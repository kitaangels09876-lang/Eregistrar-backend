import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config';

export class Role extends Model {
    public role_id!: number;
    public role_name!: string;
    public role_description?: string;
}

Role.init({
    role_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    role_name: { type: DataTypes.STRING, allowNull: false, unique: true },
    role_description: { type: DataTypes.TEXT }
}, { sequelize, tableName: 'roles', timestamps: false });
