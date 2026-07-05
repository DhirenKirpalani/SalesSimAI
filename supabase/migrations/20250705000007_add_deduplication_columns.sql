-- Migration: add deduplication columns for company knowledge base
-- Supports file-level, content-level, and chunk-level deduplication

-- 1. Add hash columns to company_documents
ALTER TABLE public.company_documents
ADD COLUMN IF NOT EXISTS file_hash text,
ADD COLUMN IF NOT EXISTS content_hash text;

-- 2. Add hash column to company_document_chunks
ALTER TABLE public.company_document_chunks
ADD COLUMN IF NOT EXISTS chunk_hash text;

-- 3. Indexes for fast deduplication lookups
CREATE INDEX IF NOT EXISTS idx_company_documents_file_hash
  ON public.company_documents (organization_id, file_hash);

CREATE INDEX IF NOT EXISTS idx_company_documents_content_hash
  ON public.company_documents (organization_id, content_hash);

CREATE INDEX IF NOT EXISTS idx_company_document_chunks_chunk_hash
  ON public.company_document_chunks (chunk_hash);

-- 4. Backfill hashes for existing documents and chunks
UPDATE public.company_documents
SET file_hash = md5(file_path || organization_id::text),
    content_hash = md5(content)
WHERE file_hash IS NULL OR content_hash IS NULL;

UPDATE public.company_document_chunks
SET chunk_hash = md5(content)
WHERE chunk_hash IS NULL;

-- 5. Add comments for clarity
COMMENT ON COLUMN public.company_documents.file_hash IS 'SHA-256 hash of the uploaded file bytes for file-level deduplication';
COMMENT ON COLUMN public.company_documents.content_hash IS 'SHA-256 hash of the extracted text for content-level deduplication';
COMMENT ON COLUMN public.company_document_chunks.chunk_hash IS 'SHA-256 hash of the chunk text for exact chunk-level deduplication';
