import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db.config';

export class DocumentRequest extends Model {
    public request_id!: number;
    public student_id!: number;
    public document_type_id!: number;
    public purpose!: string;
    public delivery_method!: 'pickup' | 'delivery' | 'email';
    public delivery_address?: string;
    public quantity!: number;
    public total_amount!: number;
    public request_status!: 'pending' | 'processing' | 'releasing' | 'completed';
    public admin_id?: number;
    public rejection_reason?: string;
    public created_at!: Date;
    public updated_at!: Date;
}

DocumentRequest.init({
    request_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    student_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    document_type_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    purpose: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    delivery_method: {
        type: DataTypes.ENUM('pickup', 'delivery', 'email'),
        allowNull: false
    },
    delivery_address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    request_status: {
        type: DataTypes.ENUM('pending', 'processing', 'releasing', 'completed'),
        defaultValue: 'pending'
    },
    admin_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    tableName: 'document_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export class DocumentType extends Model {
    public document_type_id!: number;
    public document_name!: string;
    public description?: string;
    public base_price!: number;
    public requirements?: string;
    public estimated_processing_days!: number;
    public is_active!: boolean;
}

DocumentType.init({
    document_type_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    document_name: {
        type: DataTypes.STRING(255),
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
        defaultValue: 0.00
    },
    requirements: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    estimated_processing_days: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize,
    tableName: 'document_types',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

export class StudentProfile extends Model {
    public student_id!: number;
    public user_id!: number;
    public student_number!: string;
}

StudentProfile.init({
    student_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true
    },
    student_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    }
}, {
    sequelize,
    tableName: 'student_profiles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});