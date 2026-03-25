ALTER TABLE document_types
ADD COLUMN IF NOT EXISTS is_free_first_time TINYINT(1) NOT NULL DEFAULT 0 AFTER estimated_processing_days;

INSERT INTO document_types (
  document_name,
  description,
  base_price,
  requirements,
  estimated_processing_days,
  is_free_first_time,
  is_active,
  created_at,
  updated_at
) VALUES
  ('Transfer Credentials', 'Official transfer credentials request from the printed registrar form.', 150.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Page of TOR (Transferee Only)', 'Per-page transcript request for transferee processing.', 125.00, 'Valid school ID, transferee reference if applicable', 5, 0, 1, NOW(), NOW()),
  ('Permit to Study', 'Official permit to study document from the registrar request form.', 150.00, 'Valid school ID', 5, 0, 1, NOW(), NOW()),
  ('Transcript of Records (1 yr. only)', 'Transcript of records covering first year only.', 250.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Transcript of Records (2 yrs. only)', 'Transcript of records covering two academic years only.', 350.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Transcript of Records (3 yrs. only)', 'Transcript of records covering three academic years only.', 450.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Transcript of Records (4 yrs. Grad.)', 'Full transcript of records for graduates.', 500.00, 'Valid school ID, clearance if required', 5, 0, 1, NOW(), NOW()),
  ('Diploma', 'Registrar-issued diploma copy request.', 350.00, 'Valid school ID', 7, 0, 1, NOW(), NOW()),
  ('Enrollment Certification', 'Certification of current or prior enrollment.', 150.00, 'Valid school ID', 3, 1, 1, NOW(), NOW()),
  ('Good Moral Certification', 'Certification of good moral character routed through registrar workflow.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Units Earned', 'Certification of earned academic units.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Graduation', 'Certification confirming graduation status.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Indorsement', 'Certification of indorsement from the registrar form.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Grades', 'Certification of grades for requested term or record set.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of Latin Honors', 'Certification of latin honors.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of List of Honors', 'Certification for list of honors inclusion.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification of General Weighted Average', 'Certification of general weighted average.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certified True Copy', 'Certified true copy request from registrar records.', 150.00, 'Original document copy if required', 3, 0, 1, NOW(), NOW()),
  ('Certification of Language as Medium of Instruction', 'Certification of language used as medium of instruction.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certificate of Registration (COR)', 'Certificate of registration from registrar records.', 150.00, 'Valid school ID', 2, 1, 1, NOW(), NOW()),
  ('Certification of Special Order Number', 'Certification of special order number.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Certification NSTP Serial Number', 'Certification of NSTP serial number.', 150.00, 'Valid school ID', 3, 0, 1, NOW(), NOW()),
  ('Adding, Dropping, Changing Subjects (ADC)', 'ADC registrar transaction request.', 150.00, 'Validated ADC form if applicable', 2, 0, 1, NOW(), NOW()),
  ('Filing NG Subjects', 'Registrar filing for NG subjects.', 100.00, 'Validated subject filing form if applicable', 2, 0, 1, NOW(), NOW()),
  ('Printing of Study Load', 'Printed study load service.', 10.00, 'Valid school ID', 1, 1, 1, NOW(), NOW()),
  ('Printing of Billing Statement/Assessment', 'Printed billing statement or assessment service.', 10.00, 'Valid school ID', 1, 1, 1, NOW(), NOW()),
  ('Printing of Grade Slip', 'Printed grade slip service.', 20.00, 'Valid school ID', 1, 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  base_price = VALUES(base_price),
  requirements = VALUES(requirements),
  estimated_processing_days = VALUES(estimated_processing_days),
  is_free_first_time = VALUES(is_free_first_time),
  is_active = VALUES(is_active),
  updated_at = NOW();
