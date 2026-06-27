-- Migration: split company_documents into metadata (company_documents) + chunks (company_document_chunks)
-- Run this after company_documents.sql has already been applied.

-- 1. Create chunks table
CREATE TABLE IF NOT EXISTS public.company_document_chunks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL REFERENCES public.company_documents(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536),
  chunk_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_company_document_chunks_document_id
  ON public.company_document_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_company_document_chunks_embedding
  ON public.company_document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 3. RLS
ALTER TABLE public.company_document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org document chunks" ON public.company_document_chunks;
CREATE POLICY "Users can view org document chunks"
  ON public.company_document_chunks FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.company_documents
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can insert org document chunks" ON public.company_document_chunks;
CREATE POLICY "Users can insert org document chunks"
  ON public.company_document_chunks FOR INSERT WITH CHECK (
    document_id IN (
      SELECT id FROM public.company_documents
      WHERE organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Doc creator or admin can delete chunks" ON public.company_document_chunks;
CREATE POLICY "Doc creator or admin can delete chunks"
  ON public.company_document_chunks FOR DELETE USING (
    document_id IN (
      SELECT id FROM public.company_documents
      WHERE created_by = auth.uid()
         OR organization_id IN (
           SELECT id FROM public.organizations WHERE created_by = auth.uid()
         )
    )
  );

-- 4. Update doc_type check constraint to new allowed values and add document_type column
ALTER TABLE public.company_documents
DROP CONSTRAINT IF EXISTS company_documents_doc_type_check;

ALTER TABLE public.company_documents
ADD CONSTRAINT company_documents_doc_type_check
CHECK (doc_type IN ('payment', 'eor', 'cards'));

ALTER TABLE public.company_documents
ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'icp'
  CONSTRAINT company_documents_document_type_check
  CHECK (document_type IN ('icp', 'value_prop', 'competitive', 'objection_handling', 'product_pricing', 'process_methodology'));

-- 5. Migrate existing data: one document row per file_path + chunks in new table
DO $$
DECLARE
  v_file_path text;
  v_org_id uuid;
  v_doc_type text;
  v_created_by uuid;
  v_created_at timestamptz;
  v_base_name text;
  v_new_doc_id uuid;
BEGIN
  -- Groups with a file_path
  FOR v_file_path, v_org_id, v_doc_type, v_created_by, v_created_at IN
    SELECT
      file_path,
      organization_id,
      doc_type,
      created_by,
      MIN(created_at)
    FROM public.company_documents
    WHERE file_path IS NOT NULL
    GROUP BY file_path, organization_id, doc_type, created_by
  LOOP
    SELECT regexp_replace(name, '\s*\(part\s+\d+/\d+\)$', '')
    INTO v_base_name
    FROM public.company_documents
    WHERE file_path = v_file_path
    LIMIT 1;

    INSERT INTO public.company_documents (organization_id, name, content, doc_type, file_path, created_by, created_at)
    VALUES (v_org_id, v_base_name, '', v_doc_type, v_file_path, v_created_by, v_created_at)
    RETURNING id INTO v_new_doc_id;

    INSERT INTO public.company_document_chunks (document_id, content, embedding, chunk_index, created_at)
    SELECT
      v_new_doc_id,
      content,
      embedding,
      COALESCE((regexp_match(name, '\(part\s+(\d+)/\d+\)'))[1]::int - 1, 0),
      created_at
    FROM public.company_documents
    WHERE file_path = v_file_path;

    DELETE FROM public.company_documents
    WHERE file_path = v_file_path AND id != v_new_doc_id;
  END LOOP;

  -- Rows without a file_path: treat each as its own single-chunk document
  INSERT INTO public.company_document_chunks (document_id, content, embedding, chunk_index, created_at)
  SELECT
    id,
    content,
    embedding,
    0,
    created_at
  FROM public.company_documents
  WHERE file_path IS NULL;

  UPDATE public.company_documents
  SET content = '', embedding = null
  WHERE file_path IS NULL;
END $$;

-- 6. Update semantic search function to query chunks joined with documents
CREATE OR REPLACE FUNCTION public.match_company_docs(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_org_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  content text,
  doc_type text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    d.id,
    d.name,
    c.content,
    d.doc_type,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.company_document_chunks c
  JOIN public.company_documents d ON d.id = c.document_id
  WHERE d.organization_id = filter_org_id
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
