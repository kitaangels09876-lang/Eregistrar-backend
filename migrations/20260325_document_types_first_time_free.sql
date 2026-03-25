ALTER TABLE document_types
ADD COLUMN IF NOT EXISTS is_free_first_time TINYINT(1) NOT NULL DEFAULT 0 AFTER estimated_processing_days;
