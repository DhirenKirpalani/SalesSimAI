-- Add optional doc_type filter to match_company_docs for more efficient RAG queries
CREATE OR REPLACE FUNCTION public.match_company_docs(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_org_id uuid,
  filter_doc_type text DEFAULT NULL
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
    AND (filter_doc_type IS NULL OR d.doc_type = filter_doc_type)
    AND c.embedding IS NOT NULL
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
