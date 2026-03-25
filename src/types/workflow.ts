export interface WorkflowFormEducationItem {
  level:
    | "primary"
    | "elementary"
    | "junior_high_school"
    | "senior_high_school";
  school_name?: string | null;
  school_address?: string | null;
  year_graduated?: string | null;
}

export interface WorkflowRequestAttachmentInput {
  attachment_label?: string | null;
  original_file_name: string;
  stored_file_name: string;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
}

export interface WorkflowRequestPayload {
  civil_status: string;
  gender: string;
  contact_number: string;
  address_line: string;
  purok?: string | null;
  barangay?: string | null;
  municipality?: string | null;
  province?: string | null;
  academic_year_label: string;
  place_of_birth?: string | null;
  date_of_birth?: string | null;
  guardian_name?: string | null;
  course_text?: string | null;
  last_semester_attended?: string | null;
  purpose: string;
  delivery_method: "pickup" | "email" | "courier";
  requested_document_ids: number[];
  educational_background: WorkflowFormEducationItem[];
  attachments?: WorkflowRequestAttachmentInput[];
}
