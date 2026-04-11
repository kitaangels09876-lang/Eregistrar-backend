import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config';

export interface UserAttributes {
    user_id?: number;
    email: string;
    password: string;
    account_type: 'student' | 'admin' | 'registrar';
    status?: 'active' | 'inactive';
    deleted_at?: Date | null;

    created_at?: Date;  
    updated_at?: Date;  
}

export class User extends Model<UserAttributes> implements UserAttributes {
    public user_id!: number;
    public email!: string;
    public password!: string;
    public account_type!: 'student' | 'admin' | 'registrar';
    public status!: 'active' | 'inactive';
    public deleted_at!: Date | null;

    public created_at!: Date; 
    public updated_at!: Date; 
}

User.init({
    user_id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    account_type: { type: DataTypes.ENUM('student','admin','registrar'), allowNull: false },
    status: { type: DataTypes.ENUM('active','inactive'), defaultValue: 'active' },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
}, { 
    sequelize, 
    tableName: 'users', 
    timestamps: true, 
    createdAt: 'created_at', 
    updatedAt: 'updated_at' 
});
