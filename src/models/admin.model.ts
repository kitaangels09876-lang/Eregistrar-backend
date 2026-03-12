import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config';
import { User } from './user.model';

export interface AdminAttributes {
    admin_id?: number;
    user_id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    contact_number?: string;
}

export class Admin extends Model<AdminAttributes> implements AdminAttributes {
    public admin_id!: number;
    public user_id!: number;
    public first_name!: string;
    public middle_name?: string;
    public last_name!: string;
    public contact_number?: string;
}

Admin.init({
    admin_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    first_name: { type: DataTypes.STRING, allowNull: false },
    middle_name: { type: DataTypes.STRING },
    last_name: { type: DataTypes.STRING, allowNull: false },
    contact_number: { type: DataTypes.STRING }
}, { sequelize, tableName: 'admin_profiles', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

Admin.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
