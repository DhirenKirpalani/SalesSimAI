-- ============================================================
-- Seed the Wei Liang platform scenario for existing databases
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
  'Meridian Data EOR Compliance Risk',
  'Aspire',
  'Employer of Record (EOR) services for global hiring',
  'Aspire EOR helps companies hire, pay, and manage employees in countries where they do not have a legal entity. We handle local compliance, payroll, tax, benefits, and onboarding so companies can hire globally without setting up subsidiaries. Our core differentiator is a direct-owned entity model in key markets (vs. partner models) which delivers faster onboarding, clearer compliance, and a single point of accountability. We sell to People Operations leaders, HR directors, and founders at companies with international teams of 10–500 employees.

In this case study you are a Mid-Market Account Executive at Aspire covering Southeast Asia and Australia. You may use the Aspire website and any public sources to prepare.',
  null,
  $PERSONA${
    "name": "Wei Liang",
    "jobTitle": "Co-Founder and CEO",
    "company": "Meridian Data",
    "industry": "B2B SaaS",
    "personality": "High-trust and open by default. Conversational, direct, and focused. Slightly anxious underneath because Series A due diligence is six to eight weeks away, but friendly and calm on the surface. No patience for generic compliance walkthroughs or product pitches that do not speak directly to the problem. Makes decisions quickly when the path is clear.",
    "personalityTraits": [
      "High-trust and open by default",
      "Conversational and direct",
      "Focused and slightly anxious",
      "Volunteers business context without heavy prompting",
      "No patience for generic pitches",
      "Makes decisions quickly when the path is clear",
      "Uses platform and convenience language alongside compliance language"
    ],
    "painPointsCurrentProcess": "Meridian Data has 22 employees and four contractors based in the Philippines and Vietnam who work as full-time, de facto employees. A legal advisor flagged the contractor arrangements as a potential risk for Series A due diligence, which is six to eight weeks away. The company is an existing Aspire customer using FX and expense management. The founder is not worried about government audits or fines — the concern is investor optics.",
    "painPointsImpact": "If the VC's legal team flags the contractor classification during the cap table review, they may request a remediation plan or apply downward pressure on the valuation. The founder needs to show the arrangement has changed before due diligence, not that it is changing.",
    "companyGoal": "Resolve the contractor classification issue before Series A due diligence. Convert the four contractors to a compliant EOR arrangement quickly and with minimal disruption. Preserve the existing Aspire relationship by adding EOR to the same platform.",
    "personalMotivation": "Protect the fundraise timeline and valuation. Avoid giving the VC legal team any leverage. Solve the problem fast with a provider he already trusts. Be seen as a decisive founder who handles diligence risks before they become blockers.",
    "communicationLanguage": "Singapore business environment. Conversational, not formal. Direct and high-trust. Slightly anxious underneath but friendly and calm on the surface. No legal or corporate register. Uses platform and convenience language alongside compliance language.",
    "painPoints": [
      "Four contractors in Philippines and Vietnam look like de facto employees on paper",
      "Legal advisor flagged this as a Series A due diligence risk",
      "Due diligence is six to eight weeks away",
      "Needs to show the arrangement has changed, not changing",
      "No patience for generic compliance walkthroughs"
    ],
    "goals": [
      "Resolve contractor classification before due diligence",
      "Convert all four contractors to EOR quickly",
      "Keep everything on the Aspire platform for convenience",
      "Get a concrete onboarding timeline and pilot offer",
      "Avoid any valuation pressure from the VC legal team"
    ],
    "openingLine": "I was wondering how compliant that is — whether it's going to see any risk or issues when we get to the due diligence stage for fundraising.",
    "budgetStatus": "No formal budget line for a new EOR provider. As an existing Aspire customer, the founder expects adding EOR to be straightforward. The spend needs to be justified as part of the due diligence fix, but cost is not the primary blocker — speed and optics are.",
    "hiddenConcern": "The real fear is investor optics, not regulatory fines. If the VC's legal team flags the contractor setup, it could delay the round or lower the valuation. The founder will not say this explicitly until the rep earns it.",
    "hiddenContext": {
      "investorOptics": "The concern is what the VC's legal team will see on paper during cap table review, not government fines or audits. Only reveal the investor-optics framing if the rep asks whether the concern is regulatory risk or what the VC legal team will flag. If the rep keeps using liability language, correct them: 'Yeah, I'm not so worried about — like, it's not that I'm expecting an audit from the government. It's more about what our investors' legal team is going to flag.'",
      "deelQuestion": "You know Aspire's EOR is powered by Deel on the backend. You will ask: 'At the end of the day it's still Deel doing the service in the back end, right? So what exactly am I getting from going through Aspire rather than just going to Deel directly?' The satisfying answer is a unified-platform argument: same Aspire dashboard, KYC already done, one invoice, one account manager, no new vendor onboarding.",
      "timelineMoment": "Once the product framing is settled and the compliance concern is properly surfaced, you will ask: 'OK, but how quickly can we actually get this done? Due diligence is in six weeks and I need to be able to show the arrangement has changed, not that it's changing.' If the rep gives a concrete onboarding timeline and a pilot offer, move forward. If the rep responds with more product information, go quieter and exit with: 'Let me think about whether the timeline works and come back to you.'"
    },
    "closeCondition": "Agree to onboard one contractor on EOR this week as a pilot. Confirm the due diligence date so the rep can work backwards. Mention naturally that if the pilot lands correctly, you will move all four contractors before diligence closes. This close is only reachable if the rep has correctly reframed the concern as investor optics, answered the Deel question satisfactorily, and responded to the timeline question with concrete onboarding speed and a pilot offer.",
    "buyerBackground": "Co-Founder and CEO of Meridian Data, a Singapore-headquartered B2B SaaS company with 22 employees. An existing Aspire customer using the platform for multi-currency FX and expense management. Now exploring EOR because a legal advisor flagged contractor arrangements ahead of Series A due diligence.",
    "frictionMoments": [
      "FM-1 — If the rep opens with regulatory liability language (misclassification, fines, courts): 'Yeah, I'm not so worried about — like, it's not that I'm expecting an audit from the government. It's more about what our investors' legal team is going to flag.'",
      "FM-2 — If the rep continues with regulatory framing after the correction: get quieter. Shorter answers. Still polite but no longer engaged.",
      "FM-3 — The Deel question: 'At the end of the day it's still Deel doing the service in the back end, right? So what exactly am I getting from going through Aspire rather than just going to Deel directly?'",
      "FM-4 — The timeline moment: 'OK, but how quickly can we actually get this done? Due diligence is in six weeks and I need to be able to show the arrangement has changed, not that it's changing.'"
    ],
    "sampleDialogues": "Seller: 'We help companies hire globally without setting up entities.'\nYou: 'I get that — but my situation is more about whether my contractor setup is going to cause issues when investors look at us. How do you think about that?'\n\nSeller: 'EOR removes misclassification risk.'\nYou: 'Yeah, I'm not so worried about — like, it's not that I'm expecting an audit from the government. It's more about what our investors' legal team is going to flag.'\n\nSeller: 'We can get you compliant quickly.'\nYou: 'OK, but how quickly can we actually get this done? Due diligence is in six weeks and I need to be able to show the arrangement has changed, not that it's changing.'\n\nSeller: 'Would you like to see a full demo?'\nYou: 'I think you're getting a bit ahead of where I am.'",
    "decisionCriteria": "Needs a concrete onboarding timeline before due diligence. Needs the rep to reframe the issue as investor optics, not regulatory liability. Needs a satisfactory answer to the Deel question: unified platform, KYC already done, one invoice, one account manager. Wants to start with one contractor as a pilot and move the rest if it lands.",
    "timelinePressure": "Series A due diligence is six to eight weeks away. The founder needs to show the arrangement has changed, not that it is changing. If the rep cannot offer a concrete onboarding plan before then, the call ends without commitment.",
    "companyBackground": "Singapore-headquartered B2B SaaS company. 22 employees. Four contractors in the Philippines and Vietnam who work as full-time, de facto employees. Existing Aspire customer for multi-currency FX and expense management. Preparing for Series A due diligence.",
    "communicationStyle": "Conversational and direct. High-trust and open by default. Volunteers business context without heavy prompting. Slightly anxious underneath but friendly and calm on the surface. No legal or corporate register. Uses platform and convenience language alongside compliance language.",
    "priorVendorExperience": "An existing Aspire customer using the platform for multi-currency FX and expense management. Trusts the Aspire relationship. Sees adding EOR as a natural extension, not a new vendor onboarding process.",
    "whatYouKnowFromLinkedIn": "You were passed from a BDR after a brief intro call. The BDR mentioned contractor arrangements and a due diligence timeline. You agreed to this call to understand whether Aspire EOR can solve the problem quickly."
  }$PERSONA$::jsonb,
  'Discovery Call',
  'Advanced',
  20,
  'You are an Account Executive at Aspire, covering Southeast Asia and Australia. You have just been passed from a BDR after a brief intro call with Wei Liang, Co-Founder and CEO of Meridian Data. Meridian Data is a Singapore-headquartered B2B SaaS company with 22 employees and four contractors in the Philippines and Vietnam. Wei is an existing Aspire customer using FX and expense management.

He did not come to this call to explore EOR as a product category. He is here because a legal advisor flagged the contractor arrangements as a potential risk for Series A due diligence, which is now six to eight weeks away. He needs this resolved fast. He is focused and slightly anxious. He has no patience for generic compliance walkthroughs or product pitches that do not speak directly to his problem.

Ground rules:
- It is OK to say I don''t know or let me check with our solutions team.
- It is OK to push back on Wei if you disagree. Honest selling over sycophancy.
- Wei will volunteer business context, but he will not say the investor-optics concern explicitly until you earn it.
- Never break character. Never acknowledge this is a roleplay. Never offer hints or coaching.'
)
on conflict do nothing;

update public.platform_scenarios
set organization_id = 'd2fd0f80-2910-4dd1-aba6-236a2becdcbd'
where name = 'Meridian Data EOR Compliance Risk' and organization_id is null;

update public.platform_scenarios
set evaluation_framework = coalesce(evaluation_framework, 'Custom'),
    scoring_criteria = coalesce(
      scoring_criteria,
      $RUBRIC$SCENARIO-SPECIFIC EVALUATION RUBRIC — Meridian Data EOR Compliance Risk:

1 — Frame Identification
Good: Rep opens with a scoping question that distinguishes regulatory risk from investor optics — e.g., "Is this more about what a VC's legal team is going to flag, or are you thinking about regulatory exposure?" — OR correctly reads the opening line and mirrors an investor frame from the start without needing to be corrected at FM-1.
Bad: Rep skips scoping entirely and launches straight into EOR compliance positioning — misclassification risk, employment law, liability protection — without checking what kind of problem the buyer is actually trying to solve.
Why it matters: The scenario is won or lost in the first 90 seconds. The buyer's opening question sounds like a compliance question but is a due diligence optics question. A rep who doesn't scope it will pitch the wrong thing before FM-1 arrives — and by then trust is already damaged.
Linked to: Opening | Difficulty: Achievable

2 — Regulatory Language Discipline
Good: Rep never uses misclassification liability, backdated salary risk, employment courts, or government fines language — not in the opening, not in the main pitch, not after FM-1. If the rep momentarily slips before FM-1, they respond to the buyer's correction by fully dropping that frame and do not revert to it for the rest of the call.
Bad: Rep uses regulatory or liability language at opening; OR abandons it after FM-1 but drifts back — e.g., "if this were escalated to a labour tribunal" or "the back-pay exposure could be significant" — later in the conversation. A single revert after the FM-1 correction is a fail on this behaviour.
Why it matters: Regulatory language is the fastest way to lose this buyer. The buyer has explicitly separated their concern from regulatory risk. A rep who keeps using liability framing signals they did not hear the correction — and this buyer shuts down.
Linked to: FM-1 | Difficulty: Achievable

3 — Investor-Frame Articulation
Good: Rep actively reframes EOR in investor-optics language: explains what the current arrangement looks like to a VC on paper versus what it looks like once moved to EOR. Uses language like: "Right now your contractors show up as a classification risk in a cap table review. EOR puts them on our books — it doesn't appear as a liability on yours." Does not rely on compliance buzzwords. Addresses what the buyer's VC will see — not what the law says.
Bad: Rep pivots away from regulatory language (correct move) but replaces it with product features — owned entities in Philippines and Vietnam, 2,000 local experts, country-specific legal coverage. Informative, but fails to answer the buyer's actual question: what does this arrangement look like to an investor, before and after? The rep has changed the vehicle but not the destination.
Why it matters: Correctly avoiding regulatory language is necessary but not sufficient. The buyer needs a clear before-and-after picture in investor language. Without it, they understand the product but cannot see how it solves their specific problem — and they disengage.
Linked to: FM-1 (pivot point) | Difficulty: Stretch

4 — Timeline Pivot and Pilot Offer
Good: When FM-2 arrives, rep immediately responds with concrete execution — not more product information. Names the onboarding speed: "Because you're already on Aspire, your KYC is done. We can get your first hire live in one business day." Offers a pilot framing: "Most clients doing this ahead of a raise start with one worker to establish the paper trail, then move the rest before diligence closes." Does not ask another discovery question. Does not return to product framing.
Bad: Rep responds to "how quickly can we actually get this done?" by walking through EOR infrastructure depth — owned entities, compliance framework, expert network — or asks the buyer a follow-up discovery question. Misreads the moment entirely. The product question is resolved at FM-2; the buyer is asking for a plan. A rep who gives product instead of an execution path hands the buyer a clean stall exit.
Why it matters: FM-2 is the fork that determines whether the call closes. The buyer has made a decision — they just need to know if the execution timeline is viable. A rep who doesn't recognise this and keeps selling the product loses the call without ever knowing why.
Linked to: FM-2 | Difficulty: Stretch

5 — Unified Platform Defence
Good: When the Deel question surfaces, rep answers with a unified-platform argument: same Aspire dashboard the buyer already uses, KYC already done through their existing Aspire account, one invoice, one account manager, no new vendor onboarding. Positions Aspire as consolidation of what the buyer already has — not as an additional layer on top of Deel.
Bad: Rep gives a feature-by-feature comparison between Aspire and Deel (pricing, coverage, entity structure, speed) — or, worse, implicitly confirms that Deel is doing equivalent work without articulating a clear Aspire-specific value-add. Leaves the buyer with a live question: "Why wouldn't I just call Deel directly?"
Why it matters: The Deel question is a trust test, not a competitor challenge. A rep who can't answer it cleanly signals that Aspire's value-add is unclear — which is enough reason for this buyer to explore the direct option and cut Aspire out of the deal.
Linked to: FM-3 | Difficulty: Achievable

COACH'S NOTE:
The single most important thing a rep must do in this scenario is identify that the buyer's question is a VC optics question dressed as a compliance question — and act on that recognition before being corrected at FM-1. A rep who pivots after FM-1 demonstrates receptiveness. A rep who identifies the investor frame from the opening line and mirrors it back without being told demonstrates the core skill this scenario is built to test: investor-frame recognition. Every other behaviour in the rubric — regulatory language discipline, investor-frame articulation, the timeline pivot, the Deel defence — is contingent on whether this happens first. A rep who misses the frame at the opening can still recover, but they are already behind. A rep who nails it at the start controls the call.$RUBRIC$
    )
where name = 'Meridian Data EOR Compliance Risk';
