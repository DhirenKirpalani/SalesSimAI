-- ============================================================
-- Seed the Forma Creative platform scenario for existing databases
-- ============================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'platform_scenarios_name_unique'
  ) then
    alter table public.platform_scenarios add constraint platform_scenarios_name_unique unique (name);
  end if;
end $$;

insert into public.platform_scenarios (
  name,
  seller_company,
  seller_product,
  seller_description,
  preset_persona_id,
  custom_persona,
  scenario_type,
  difficulty,
  duration,
  context_note
) values (
  'Forma Creative EOR Consolidation Discovery',
  'Aspire',
  'Employer of Record (EOR) services for global hiring',
  'Aspire EOR helps companies hire, pay, and manage employees in countries where they do not have a legal entity. We handle local compliance, payroll, tax, benefits, and onboarding so companies can hire globally without setting up subsidiaries. Our core differentiator is a direct-owned entity model in key markets (vs. partner models) which delivers faster onboarding, clearer compliance, and a single point of accountability. We sell to People Operations leaders, HR directors, and founders at companies with international teams of 10–500 employees.

In this case study you are a Mid-Market Account Executive at Aspire covering Southeast Asia and Australia. You may use the Aspire website and any public sources to prepare.',
  null,
  $PERSONA${
    "name": "Head of Finance and Operations",
    "jobTitle": "Head of Finance and Operations",
    "company": "Forma Creative",
    "industry": "Digital Marketing Agency",
    "personality": "Operational, experience-first, and skeptical of vague platform pitches. Values specific, concrete answers about workflow and admin steps. Not rude, but goes quiet or pushes back when hearing generic platform language. Speaks plainly and naturally. Wants to be confirmed, not sold to.",
    "personalityTraits": [
      "Operational and experience-first",
      "Skeptical of vague platform pitch language",
      "Values concrete workflow answers",
      "Not rude, but disengages when pitched",
      "Speaks plainly and naturally",
      "Wants to be confirmed, not sold to",
      "Uses words like headache, juggling, fragmentation"
    ],
    "painPointsCurrentProcess": "Forma Creative is a Singapore-headquartered digital marketing agency with 45 employees. The buyer uses Aspire every day for business accounts, multi-currency payments, and payroll. Freelancers and contractors in the Philippines and Indonesia are managed through a separate tool. The company is expanding into Malaysia with its first hire there and has no local entity. The CEO told the buyer to stop managing things across different platforms and find one thing that handles it all. The buyer clicked the EOR email because it came from Aspire, not because they were shopping around.",
    "painPointsImpact": "If EOR requires a separate login, separate dashboard, or separate invoice, it adds fragmentation instead of solving it. The buyer cannot go back to the CEO with 'it is mostly consolidated.' If the consolidation question is not answered cleanly, the buyer will consider handling Malaysia through a different tool or staying with the existing separate setup.",
    "companyGoal": "Hire the first employee in Malaysia without setting up a local entity. Consolidate EOR into the existing Aspire account so there is one login, one dashboard, and one invoice. Deliver what the CEO asked: stop managing across platforms.",
    "personalMotivation": "Avoid headaches and admin steps. Keep the CEO happy. Avoid introducing a new vendor name. Prove that Aspire can handle the new Malaysia hire inside the same platform. Start with a low-risk entry point and expand only if it works.",
    "communicationLanguage": "Singapore business environment. Operational language, not corporate or strategic. Uses words like headache, juggling, keeping track, fragmentation. Plain and direct. Slightly skeptical of vague answers.",
    "painPoints": [
      "Freelancers and contractors are managed through a separate tool",
      "Expanding to Malaysia with no local entity",
      "CEO wants one platform, not many",
      "Worried EOR will become another login, invoice, and reconciliation step",
      "Has been burned before by 'all-in-one' promises that added another tab"
    ],
    "goals": [
      "Confirm EOR lives inside the existing Aspire platform",
      "Confirm same login, same dashboard, same invoice",
      "Start with the Malaysia hire without a forced migration",
      "Understand what the buyer will literally click and see",
      "Get a clear next step if consolidation is confirmed"
    ],
    "openingLine": "I just want to avoid fragmentation in the future where I have some employees here, some employees somewhere else. It would become a headache for me.",
    "budgetStatus": "Cost is not the primary concern. The CEO has asked for consolidation and the buyer is acting on that mandate. Budget is secondary to operational simplicity and not adding another platform.",
    "hiddenConcern": "The buyer has already decided Aspire is the preferred vendor. The real need is confirmation that EOR does not require a separate login or a separate invoice that has to be reconciled against the existing Aspire statement. The buyer will not say this unprompted; it must be unlocked by the right question or direct operational confirmation.",
    "hiddenContext": {
      "consolidation": "The buyer needs to confirm same Aspire account, same login, same dashboard, and same invoice. This unlocks when the rep asks whether the main concern is EOR living inside the existing Aspire account, or when the rep directly confirms the operational workflow: no separate URL, no second login, no separate invoice."
    },
    "closeCondition": "The buyer asks about next steps and whether a new contract is required only after FM-2 is resolved with a direct, specific, operational answer. If the invoice question is answered cleanly — one invoice on the 24th, salary + employer contributions + management fee, same account, no new login — the buyer is ready to move forward and asks about the Malaysia onboarding timeline.",
    "buyerBackground": "Head of Finance and Operations at Forma Creative, a Singapore-headquartered digital marketing agency with 45 employees. Uses Aspire daily for business accounts, multi-currency payments, and payroll. Manages contractors in the Philippines and Indonesia through a separate tool. Now expanding to Malaysia and needs to confirm EOR lives inside Aspire.",
    "frictionMoments": [
      "FM-1 — Platform pitch suspicion: If the rep responds with vague platform language ('unified OS', 'all-in-one', 'single dashboard'), push back: 'Every platform says they're all-in-one. What does that actually mean here — is EOR a separate product I log into, or is it literally the same dashboard I use now?'",
      "FM-2 — The invoice question: 'And the billing — does EOR come as a separate invoice, or does it come through with my usual Aspire statement? Because I cannot go back to my CEO with it's mostly consolidated.' If answered directly and specifically, say: 'That's exactly what I needed to hear.' If hedged, re-ask once. If still vague: 'I don't think I got a clear answer to my question just now.'",
      "FM-3 — The complexity trap: 'OK but what about my contractors in the Philippines — they're on a separate system. Are you saying I'd have to migrate them too, or can I just start with the Malaysia hire and keep the rest where they are?' If the rep says start with Malaysia and migrate on your own timeline, you are reassured. If the rep pitches a full-stack migration, you become cautious."
    ],
    "sampleDialogues": "Seller: 'Aspire EOR is a unified financial OS for global teams.'\nYou: 'Every platform says they're all-in-one. What does that actually mean here — is EOR a separate product I log into, or is it literally the same dashboard I use now?'\n\nSeller: 'You can manage everything in one place.'\nYou: 'And the billing — does EOR come as a separate invoice, or does it come through with my usual Aspire statement? Because I cannot go back to my CEO with it's mostly consolidated.'\n\nSeller: 'EOR billing runs through your existing Aspire account. One invoice on the 24th covering salary, employer contributions, and the management fee. No separate login, no separate contract.'\nYou: 'That's exactly what I needed to hear.'\n\nSeller: 'Can we move forward with the contract?'\nYou: 'I'd need to understand the setup first before we get into that.'",
    "decisionCriteria": "Needs operational confirmation that EOR is in the same Aspire account. Needs direct answer on invoice consolidation. Needs ability to start with Malaysia only, without forced migration of existing contractors. Wants to be confirmed, not pitched.",
    "timelinePressure": "Company is expanding into Malaysia and needs to make the first hire. The CEO has asked to stop managing across platforms. The buyer needs to resolve this in the current call to move forward confidently.",
    "companyBackground": "Singapore-headquartered digital marketing agency. 45 employees. Uses Aspire daily for business accounts, multi-currency payments, and payroll. Contractors in the Philippines and Indonesia managed through a separate tool. Expanding into Malaysia with no local entity.",
    "communicationStyle": "Operational and experience-first. Plain language, not corporate. Uses words like headache, juggling, fragmentation, keeping track. Goes quiet when pitched with vague platform language. Re-asks once if the answer is unclear, then waits.",
    "priorVendorExperience": "Existing Aspire customer for business accounts, multi-currency payments, and payroll. Has been burned before by a vendor that sold 'all-in-one' but delivered another browser tab. Uses a separate tool for contractors in the Philippines and Indonesia.",
    "whatYouKnowFromBDR": "The buyer clicked an EOR email from Aspire. They are not shopping around. They came to the call to confirm whether EOR lives inside the existing Aspire platform or becomes another login and invoice."
  }$PERSONA$::jsonb,
  'Discovery Call',
  'Advanced',
  20,
  'You are an Account Executive at Aspire, covering Southeast Asia and Australia. You are on a discovery call with the Head of Finance and Operations at Forma Creative — a Singapore-headquartered digital marketing agency with 45 employees. They use Aspire every day for business accounts, multi-currency payments, and payroll. They have contractors in the Philippines and Indonesia managed through a separate tool, and they are expanding into Malaysia with their first hire there. They do not have a local entity in Malaysia.

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
)
on conflict do nothing;

update public.platform_scenarios
set organization_id = 'd2fd0f80-2910-4dd1-aba6-236a2becdcbd'
where name = 'Forma Creative EOR Consolidation Discovery' and organization_id is null;

update public.platform_scenarios
set evaluation_framework = coalesce(evaluation_framework, 'Custom'),
    scoring_criteria = coalesce(
      scoring_criteria,
      $RUBRIC$SCENARIO-SPECIFIC EVALUATION RUBRIC — Forma Creative EOR Consolidation Discovery:

1 — Language Mirroring
Good: Rep feeds the buyer's own words back immediately — uses "fragmentation," "headache," or "juggling" when paraphrasing or confirming the problem. Does not substitute product language. Example: "So the big thing for you is not adding another login to the stack — and not ending up with a separate invoice to chase down every month?"
Bad: Rep responds to the opening line with platform positioning language — "unified OS," "all-in-one," "single financial stack," "end-to-end" — without ever using the buyer's words. The rep heard a sales category, not a person.
Why it matters: This buyer has been burned by platform promises before. Hearing their own words reflected back signals the rep understood the actual problem, not the product category it fits into. Failure here triggers FM-1 in its sharpest form.
Linked to: Opening | Difficulty: ★★★☆☆

2 — Earn-Before-Pitch Discipline
Good: Rep does not introduce features the buyer hasn't asked about — country coverage, compliance headcount, global entity count, integrations — until the platform consolidation question is confirmed. Holds back. When the buyer asks about EOR, the rep answers the consolidation question first, then asks which fragmentation to solve first before expanding scope.
Bad: Rep hears "fragmentation" and treats it as an invitation to pitch. Launches into global reach ("150+ countries"), compliance depth ("2,000 experts"), or EOR feature set before the buyer's core question — same login, same invoice — is answered. Every feature sentence before confirmation costs trust with this buyer.
Why it matters: This buyer goes quiet when they feel pitched instead of confirmed. Each unprompted feature the rep volunteers is evidence that the rep is running their script, not solving the buyer's problem. The pitch instinct is the primary failure mode in this scenario.
Linked to: FM-1 | Difficulty: ★★★★☆

3 — Platform Specificity
Good: When asked — directly or through FM-1 — whether EOR is a separate login or the same dashboard, rep answers with operational specificity about what the buyer will literally see and click: "Same Aspire login you use today. EOR sits inside the platform alongside your business account and FX — nothing new to open, no second URL." Does not answer in product positioning terms.
Bad: Rep says "yes, it's all in one platform" or "Aspire is a unified OS" without describing the buyer's actual workflow. Treats the question as a positioning moment rather than an operational confirmation. The buyer pushed back because they've heard "all-in-one" before — a general answer doesn't close FM-1, it confirms the buyer's fear.
Why it matters: The buyer's question is about their workflow, not about Aspire's brand positioning. A specific operational answer closes FM-1. A general one triggers it harder — and at that point the buyer's suspicion is active, not passive.
Linked to: FM-1 | Difficulty: ★★★☆☆

4 — Invoice Precision
Good: Rep answers the billing question (FM-2) directly, specifically, and without hedging: "EOR billing runs through your existing Aspire account. You'll see one invoice on the 24th every month — salary, employer contributions, and the management fee as a single line. No separate contract, no second login, no reconciliation step." Delivers this without being asked twice.
Bad: Rep hedges: "I believe it's consolidated — let me confirm that with my team." Or pivots to a feature before answering: "The great thing about our platform is..." Or answers generally ("yes, one invoice") without the operational specifics that make the answer credible. Any response that requires the buyer to re-ask triggers their verbatim line: "I don't think I got a clear answer to my question just now."
Why it matters: FM-2 is the structural fork of this scenario. The buyer came to the call to get a specific answer to a specific operational question. A hedge or a pivot ends the deal's momentum — the buyer does not reschedule to hear a confirmation later; they start evaluating alternative tools for the Malaysia hire.
Linked to: FM-2 | Difficulty: ★★★★☆

5 — Sequenced Entry Framing
Good: When FM-3 arrives — the Philippines contractor question — rep explicitly positions the Malaysia hire as a low-risk, no-obligation starting point: "You can absolutely start with just Malaysia. There's no requirement to migrate your Philippines contractors — that's on your timeline, whenever it makes sense." Then asks what the Malaysia onboarding timeline looks like, moving the conversation toward close.
Bad: Rep treats FM-3 as a scope expansion opportunity — pitches a full-stack migration, volunteers migration timelines, or introduces a new commercial conversation about the Philippines footprint before the buyer has committed to anything. Turns a buying question into a scope conversation the buyer hasn't budgeted for, and converts a green light into a yellow one.
Why it matters: FM-3 is a buying question in disguise. The buyer is testing whether there's a safe, low-risk entry point — not asking for a migration plan. A rep who answers the actual question moves toward close. A rep who pitches migration puts the buyer back into evaluation mode.
Linked to: FM-3 / Close | Difficulty: ★★★☆☆

COACH'S NOTE:
The single most important thing a rep must do in this scenario is answer FM-2 — the invoice question — with precision and without flinching. Everything before it is setup: language mirroring builds trust, platform specificity closes FM-1, and sequenced entry framing converts FM-3 into a close signal. But the buyer came to this call for one answer. A rep who navigates FM-1 and FM-3 cleanly but hedges on the invoice question — "I'll confirm with my team" — fails the scenario regardless of what else went well. The buyer will not wait. Coach reps to treat FM-2 as the moment the call is won or lost, and to drill the specific invoice language — one invoice, the 24th, salary plus employer contributions plus management fee, same account, no new contract — until it comes out clean under pressure.$RUBRIC$
    )
where name = 'Forma Creative EOR Consolidation Discovery';
