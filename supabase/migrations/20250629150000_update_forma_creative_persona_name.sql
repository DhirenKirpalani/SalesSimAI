-- ============================================================
-- Update Forma Creative scenario persona name to Lim Mei Ling
-- ============================================================

update public.platform_scenarios
set custom_persona = jsonb_set(
      jsonb_set(
        custom_persona,
        '{name}',
        '"Lim Mei Ling"'::jsonb
      ),
      '{buyerBackground}',
      '"Lim Mei Ling is the Head of Finance and Operations at Forma Creative, a Singapore-headquartered digital marketing agency with 45 employees. Uses Aspire daily for business accounts, multi-currency payments, and payroll. Manages contractors in the Philippines and Indonesia through a separate tool. Now expanding to Malaysia and needs to confirm EOR lives inside Aspire."'::jsonb
    ),
    context_note = 'You are an Account Executive at Aspire, covering Southeast Asia and Australia. You are on a discovery call with Lim Mei Ling, Head of Finance and Operations at Forma Creative — a Singapore-headquartered digital marketing agency with 45 employees. They use Aspire every day for business accounts, multi-currency payments, and payroll. They have contractors in the Philippines and Indonesia managed through a separate tool, and they are expanding into Malaysia with their first hire there. They do not have a local entity in Malaysia.

The buyer did not come to this call to be sold to. They clicked the EOR email because it came from Aspire. They came to confirm one thing: whether EOR lives inside the platform they already use, or whether it becomes another login, another invoice, and another reconciliation step. That is the only question that matters right now.

You need to:
- Mirror their language: fragmentation, headache, juggling, keeping track.
- Answer the platform question with operational specificity before pitching anything.
- Confirm the invoice consolidation directly: one invoice on the 24th, same Aspire account, no separate login, no separate contract.
- Position the Malaysia hire as a low-risk starting point; do not push a full migration of existing contractors.
- Hold back on country coverage, compliance depth, and feature set until the consolidation question is answered.

Ground rules:
- It is OK to say I don''t know or let me check with my team.
- It is OK to push back on the buyer if you disagree, but do not pitch them.
- The buyer will not volunteer the consolidation requirement unprompted.
- Never break character. Never acknowledge this is a roleplay. Never offer hints or coaching.'
where name = 'Forma Creative EOR Consolidation Discovery';
