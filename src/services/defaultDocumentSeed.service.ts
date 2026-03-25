import { QueryTypes } from "sequelize";
import { DocumentType, sequelize } from "../models";

type DefaultDocumentSeed = {
  document_name: string;
  description: string;
  base_price: number;
  requirements: string | null;
  estimated_processing_days: number;
  is_free_first_time: boolean;
};

export const DEFAULT_DOCUMENT_TYPES: DefaultDocumentSeed[] = [
  {
    document_name: "Transfer Credentials",
    description: "Official transfer credentials request from the printed registrar form.",
    base_price: 150,
    requirements: "Valid school ID, clearance if required",
    estimated_processing_days: 5,
    is_free_first_time: false,
  },
  {
    document_name: "Page of TOR (Transferee Only)",
    description: "Per-page transcript request for transferee processing.",
    base_price: 125,
    requirements: "Valid school ID, transferee reference if applicable",
    estimated_processing_days: 5,
    is_free_first_time: false,
  },
  {
    document_name: "Permit to Study",
    description: "Official permit to study document from the registrar request form.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 5,
    is_free_first_time: false,
  },
  {
    document_name: "Transcript of Records (1 yr. only)",
    description: "Transcript of records covering first year only.",
    base_price: 250,
    requirements: "Valid school ID, clearance if required",
    estimated_processing_days: 5,
    is_free_first_time: false,
  },
  {
    document_name: "Transcript of Records (2 yrs. only)",
    description: "Transcript of records covering two academic years only.",
    base_price: 350,
    requirements: "Valid school ID, clearance if required",
    estimated_processing_days: 5,
    is_free_first_time: false,
  },
  {
    document_name: "Transcript of Records (3 yrs. only)",
    description: "Transcript of records covering three academic years only.",
    base_price: 450,
    requirements: "Valid school ID, clearance if required",
    estimated_processing_days: 5,
    is_free_first_time: false,
  },
  {
    document_name: "Transcript of Records (4 yrs. Grad.)",
    description: "Full transcript of records for graduates.",
    base_price: 500,
    requirements: "Valid school ID, clearance if required",
    estimated_processing_days: 5,
    is_free_first_time: false,
  },
  {
    document_name: "Diploma",
    description: "Registrar-issued diploma copy request.",
    base_price: 350,
    requirements: "Valid school ID",
    estimated_processing_days: 7,
    is_free_first_time: false,
  },
  {
    document_name: "Enrollment Certification",
    description: "Certification of current or prior enrollment.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: true,
  },
  {
    document_name: "Good Moral Certification",
    description: "Certification of good moral character routed through registrar workflow.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification of Units Earned",
    description: "Certification of earned academic units.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification of Graduation",
    description: "Certification confirming graduation status.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification of Indorsement",
    description: "Certification of indorsement from the registrar form.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification of Grades",
    description: "Certification of grades for requested term or record set.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification of Latin Honors",
    description: "Certification of latin honors.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification of List of Honors",
    description: "Certification for list of honors inclusion.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification of General Weighted Average",
    description: "Certification of general weighted average.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certified True Copy",
    description: "Certified true copy request from registrar records.",
    base_price: 150,
    requirements: "Original document copy if required",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification of Language as Medium of Instruction",
    description: "Certification of language used as medium of instruction.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certificate of Registration (COR)",
    description: "Certificate of registration from registrar records.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 2,
    is_free_first_time: true,
  },
  {
    document_name: "Certification of Special Order Number",
    description: "Certification of special order number.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Certification NSTP Serial Number",
    description: "Certification of NSTP serial number.",
    base_price: 150,
    requirements: "Valid school ID",
    estimated_processing_days: 3,
    is_free_first_time: false,
  },
  {
    document_name: "Adding, Dropping, Changing Subjects (ADC)",
    description: "ADC registrar transaction request.",
    base_price: 150,
    requirements: "Validated ADC form if applicable",
    estimated_processing_days: 2,
    is_free_first_time: false,
  },
  {
    document_name: "Filing NG Subjects",
    description: "Registrar filing for NG subjects.",
    base_price: 100,
    requirements: "Validated subject filing form if applicable",
    estimated_processing_days: 2,
    is_free_first_time: false,
  },
  {
    document_name: "Printing of Study Load",
    description: "Printed study load service.",
    base_price: 10,
    requirements: "Valid school ID",
    estimated_processing_days: 1,
    is_free_first_time: true,
  },
  {
    document_name: "Printing of Billing Statement/Assessment",
    description: "Printed billing statement or assessment service.",
    base_price: 10,
    requirements: "Valid school ID",
    estimated_processing_days: 1,
    is_free_first_time: true,
  },
  {
    document_name: "Printing of Grade Slip",
    description: "Printed grade slip service.",
    base_price: 20,
    requirements: "Valid school ID",
    estimated_processing_days: 1,
    is_free_first_time: true,
  },
];

export const ensureDefaultDocumentTypes = async () => {
  const columns: any[] = await sequelize.query(
    `SHOW COLUMNS FROM document_types LIKE 'is_free_first_time'`,
    { type: QueryTypes.SELECT }
  );

  if (columns.length === 0) {
    await sequelize.query(
      `
      ALTER TABLE document_types
      ADD COLUMN is_free_first_time TINYINT(1) NOT NULL DEFAULT 0 AFTER estimated_processing_days
      `
    );
  }

  for (const document of DEFAULT_DOCUMENT_TYPES) {
    const existing = await DocumentType.findOne({
      where: { document_name: document.document_name },
    });

    if (existing) {
      continue;
    }

    await DocumentType.create({
      document_name: document.document_name,
      description: document.description,
      base_price: document.base_price,
      requirements: document.requirements,
      estimated_processing_days: document.estimated_processing_days,
      is_free_first_time: document.is_free_first_time,
      is_active: true,
    });
  }
};
