-- Add transcript as a valid document_type for company_documents
alter table public.company_documents drop constraint if exists company_documents_document_type_check;
alter table public.company_documents add constraint company_documents_document_type_check
  check (document_type in ('icp','value_prop','competitive','objection_handling','product_pricing','process_methodology','transcript'));
