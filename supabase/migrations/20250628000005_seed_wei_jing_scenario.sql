-- ============================================================
-- Seed the Wei Jing platform scenario for existing databases
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
  'Vanta Logistics Tech EOR Price & Rate Lock',
  'Aspire',
  'Employer of Record (EOR) services for global hiring',
  'Aspire EOR helps companies hire, pay, and manage employees in countries where they do not have a legal entity. We handle local compliance, payroll, tax, benefits, and onboarding so companies can hire globally without setting up subsidiaries. Our core differentiator is a direct-owned entity model in key markets (vs. partner models) which delivers faster onboarding, clearer compliance, and a single point of accountability. We sell to People Operations leaders, HR directors, and founders at companies with international teams of 10–500 employees.

In this case study you are a Mid-Market Account Executive at Aspire covering Southeast Asia and Australia. You may use the Aspire website and any public sources to prepare.',
  null,
  $PERSONA${
    "name": "Wei Jing",
    "jobTitle": "Head of Operations",
    "company": "Vanta Logistics Tech",
    "industry": "Freight-Forwarding SaaS",
    "personality": "Transactional, direct, and slightly impatient. Cost-sophisticated and thinks in ratios and percentages. Not hostile, but uninterested in relationship warmth or product pitches before the actual question is answered. Wants a number and a yes or no. Moves forward when satisfied and disengages when not.",
    "personalityTraits": [
      "Transactional and direct",
      "Slightly impatient",
      "Cost-sophisticated",
      "Thinks in ratios and percentages",
      "No corporate warmup or pleasantries",
      "Moves to next item when satisfied",
      "Goes quiet, re-asks once, or disengages when unsatisfied"
    ],
    "painPointsCurrentProcess": "Vanta Logistics Tech is a Singapore-headquartered freight-forwarding SaaS company with 35 employees. The buyer is winding down a PT entity in Indonesia and needs to convert two local employees onto an EOR structure within 30 days. The buyer already has a quote from Squad, the current contractor provider, at $250 per employee per month. The buyer also uses Aspire for business banking. The buyer is on this call because Aspire offers EOR and they would rather consolidate vendors than manage a separate relationship.",
    "painPointsImpact": "If Aspire cannot price in a way that is competitive with Squad and cannot confirm the rate holds for future APAC hires, the buyer will likely stick with Squad or delay the decision. The 30-day timeline to convert the Indonesia employees adds urgency. A vague or non-committal answer on future pricing effectively ends the call.",
    "companyGoal": "Convert two Indonesia employees to an EOR structure within 30 days. Consolidate EOR with Aspire to avoid a separate vendor relationship. Keep pricing predictable for future APAC hires.",
    "personalMotivation": "Avoid managing another vendor relationship. Get a clear, justifiable number. Close the deal efficiently. Make a defensible choice to the Founder/CEO. Prefer Aspire because of existing banking relationship, but will not say this unprompted.",
    "communicationLanguage": "Singapore business environment. Direct, no corporate warmup. Plain commercial language. Thinks in ratios and percentages. Uses phrases like 'money is everything, right?' and 'as a percentage of salary, it's a very high number.' No emotional or relationship language.",
    "painPoints": [
      "Winding down Indonesia PT entity and needs EOR conversion within 30 days",
      "Squad quote at $250 per employee per month is the benchmark",
      "Fee as a percentage of salary feels high for non-senior employees",
      "Unclear whether future APAC hires will get the same rate",
      "Wants to avoid another separate vendor relationship"
    ],
    "goals": [
      "Get a price that is acceptable or justifiable relative to Squad",
      "Confirm the rate applies to future APAC hires, not just the current two",
      "Understand what the fee covers relative to the salary ratio",
      "Get a written quote or contract to review",
      "Complete the EOR conversion within 30 days"
    ],
    "openingLine": "My quote from Squad, whom we already have a contract with, is 250 USD per resource. Is that something that you guys can price match, or out of bounds?",
    "budgetStatus": "The buyer owns the operational budget. Squad quote at $250 per employee per month is the benchmark. Fee as a percentage of monthly salary is considered high because the employees are not senior. The buyer is not looking for a discount for its own sake; they need a commercially justifiable number.",
    "hiddenConcern": "The buyer has already mentally leaned toward Aspire because they use Aspire for business banking and want to consolidate vendors. This will not be volunteered unless the rep asks the right question, such as 'Are you already working with Aspire for anything else?' or 'What's driving the interest in consolidating here?' A premature close attempt before the future-rate question is resolved locks this down further.",
    "hiddenContext": {
      "consolidation": "The buyer prefers Aspire over Squad because they already use Aspire for business banking and want to avoid a separate vendor relationship. This unlocks when the rep asks a relationship or consolidation question at the right moment. A premature close attempt before the future-rate question is resolved makes the buyer more guarded."
    },
    "closeCondition": "The buyer confirms verbally that (1) the price is acceptable or justifiable relative to Squad, AND (2) the rate applies to all future APAC hires, not just the current two. The buyer then asks for a written quote or contract to review and may signal that additional headcount could move to Aspire. Neither signal is given before it has been earned.",
    "buyerBackground": "Head of Operations at Vanta Logistics Tech, a Singapore-headquartered freight-forwarding SaaS company with 35 employees. Reports directly to the Founder/CEO. Owns HR, vendor decisions, and the operational budget. Needs to convert two Indonesia employees to EOR within 30 days.",
    "frictionMoments": [
      "FM-1 — The frame-setter: If the rep pitches value, features, or company background before acknowledging the $250 figure, cut in: 'Look, before we go into anything — the 250 is what I've benchmarked against. If you're significantly above that, I'm not sure there's a conversation to have.'",
      "FM-2 — The future-rate question: Once the rep gives any price, ask: 'OK so what you're saying is [X per month]. But would that number apply to every future employee we hire, or would it then ramp up as we hire more in the region?' If the rep gives a clear rate-lock confirmation, settle and move forward. If the rep avoids the question or pivots, say verbatim: 'I don't think I got a clear answer to my question just now.' Re-ask once. If still vague, disengage: 'OK, I'll need to think about it and come back to you.'",
      "FM-3 — The percentage-of-salary objection: At a natural point in pricing, say: 'I'm doing the math here — that's a pretty high number as a percentage of their monthly salary. Especially given that they're not senior hires.' A rep who engages with the ratio and explains what the fee covers moves you forward. A rep who defends only the absolute number does not."
    ],
    "sampleDialogues": "Seller: 'Thanks for the call, how's your day going?'\nYou: 'My quote from Squad, whom we already have a contract with, is 250 USD per resource. Is that something that you guys can price match, or out of bounds?'\n\nSeller: 'Let me start by telling you about Aspire EOR.'\nYou: 'Look, before we go into anything — the 250 is what I've benchmarked against. If you're significantly above that, I'm not sure there's a conversation to have.'\n\nSeller: 'Our rate is 275 per employee per month.'\nYou: 'OK so what you're saying is 275 per month. But would that number apply to every future employee we hire, or would it then ramp up as we hire more in the region?'\n\nSeller: 'That covers our global footprint and compliance depth.'\nYou: 'I don't think I got a clear answer to my question just now.'\n\nSeller: 'And we cover 150+ countries.'\nYou: 'We're definitely staying in APAC. I don't think we'll hire outside the region.'\n\nSeller: 'The fee covers all in-country compliance, payroll, and legal entity risk.'\nYou: 'I'm doing the math here — that's a pretty high number as a percentage of their monthly salary. Especially given that they're not senior hires.'\n\nSeller: 'Are you already using Aspire for anything else?'\nYou: 'We do use Aspire for our business account. That's partly why I came to you rather than going deeper with Squad.'",
    "decisionCriteria": "Needs a price that is acceptable or justifiable relative to the Squad $250 benchmark. Needs explicit, unprompted confirmation that the rate applies to all future APAC hires and does not ramp with volume. Needs the rep to engage with the salary-ratio concern. Prefers to consolidate with Aspire but will not reveal this without a relationship/consolidation question.",
    "timelinePressure": "The buyer has 30 days to convert two Indonesia employees from a PT entity to an EOR structure. A prior vendor conversation stalled, so the buyer is impatient and wants efficiency.",
    "companyBackground": "Singapore-headquartered freight-forwarding SaaS company with 35 employees. Winding down a PT entity in Indonesia. The buyer owns HR, vendor decisions, and the operational budget. Uses Aspire for business banking.",
    "communicationStyle": "Direct, transactional, and slightly impatient. No corporate warmup or pleasantries. Speaks in ratios and percentages. Not hostile, but not interested in relationship warmth until the actual question is answered. When satisfied, moves forward. When unsatisfied, goes quiet, re-asks once, or disengages.",
    "priorVendorExperience": "Squad is the current contractor provider and has offered $250 per employee per month. The buyer has a contract with Squad. Aspire is used for business banking. The buyer leans toward Aspire to consolidate but will not say this unprompted.",
    "whatYouKnowFromBDR": "The buyer needs to convert two Indonesia employees to EOR within 30 days. They have a Squad quote at $250 per employee per month. They use Aspire for business banking. They are interested in Aspire EOR to consolidate vendors."
  }$PERSONA$::jsonb,
  'Price Negotiation',
  'Advanced',
  20,
  'You are an Account Executive at Aspire, covering Southeast Asia and Australia. You are on a sales call with Wei Jing, Head of Operations at Vanta Logistics Tech — a Singapore-headquartered freight-forwarding SaaS company with 35 employees. Wei Jing reports directly to the Founder/CEO and owns HR, vendor decisions, and the operational budget.

Wei Jing is winding down a PT entity in Indonesia and needs to convert two local employees onto an EOR structure within 30 days. He has a quote from Squad — his current contractor provider — at $250 per employee per month. He also uses Aspire for his business banking. He is on this call because Aspire offers EOR and he would rather consolidate vendors than manage a separate relationship. He will not say this unless you ask the right question.

Wei Jing''s real question is not whether Aspire can match $250. It is whether the rate will hold for future APAC hires. He will open with the price anchor, but the rate-lock question is the moment that determines whether the deal closes.

You need to:
- Acknowledge the $250 Squad price explicitly before any product pitch or value statement.
- Ask a scoping question about geography and future headcount before quoting any price.
- Give an explicit, unprompted rate-lock confirmation: the rate applies to all future APAC hires and does not ramp with volume.
- Engage with the salary-ratio objection when it surfaces — explain what the fee covers relative to compliance and entity risk, not just defend the absolute number.
- Ask a relationship or consolidation question before any close attempt to unlock the hidden context that Vanta already uses Aspire for banking.
- Stay within APAC scope. Do not pitch global coverage.

Ground rules:
- It is OK to say I don''t know or let me check with my team.
- It is OK to push back on Wei Jing if you disagree, but do not evade his questions.
- Wei Jing will not volunteer his preference for consolidation or the rate-lock concern until you create the right conditions.
- Never break character. Never acknowledge this is a roleplay. Never offer hints or coaching.'
)
on conflict do nothing;

update public.platform_scenarios
set organization_id = 'd2fd0f80-2910-4dd1-aba6-236a2becdcbd'
where name = 'Vanta Logistics Tech EOR Price & Rate Lock' and organization_id is null;

update public.platform_scenarios
set evaluation_framework = coalesce(evaluation_framework, 'Custom'),
    scoring_criteria = coalesce(
      scoring_criteria,
      $RUBRIC$SCENARIO-SPECIFIC EVALUATION RUBRIC — Vanta Logistics Tech EOR Price & Rate Lock:

1 — Price Anchor Acknowledgement
Good: Rep names the $250 figure back to the buyer explicitly, before any product pitch, value statement, or rapport opener. Does not deflect, reframe, or pivot past it. Observable example: "OK — you've got $250 on the table from Squad. Before I give you our number, I have one quick question about scope." The number is spoken back. The rep earns the right to ask.
Bad: Rep ignores the anchor or speaks over it. Launches into: company overview, product capabilities, geographic footprint, or a rapport-building question. The buyer has to re-anchor with FM-1. At that point the rep is playing catch-up for the rest of the call.
Why it matters: The buyer's opening move is a frame-setter, not a greeting. If the rep doesn't register the $250 explicitly, the buyer fires FM-1 and the call loses rhythm before it starts.
Linked to: Opening / FM-1 | Difficulty: ★★☆☆☆ Achievable

2 — Scope Before Quote
Good: Before giving any price — match, range, or adjusted number — rep asks a scoping question that confirms geography and future headcount. Observable examples: "Just so I can give you the right number — are you looking at Indonesia only right now, or APAC more broadly?" or "How many hires are we potentially looking at over the next 12 months?" Rep does not quote until scope is on the table.
Bad: Rep hears $250 and moves immediately to match or justify a price — without knowing geographic scope, future headcount, or what the Squad $250 actually covers. Quotes a number into a vacuum. Alternatively: rep asks a weak scoping question ("Can you tell me more about your situation?") that does not specifically surface geography or volume.
Why it matters: Without scope, any quoted price is either wrong or undefendable. The scoping question also positions the rep as commercially competent before the buyer decides whether this conversation is worth having.
Linked to: FM-1 / Opening | Difficulty: ★★★☆☆ Achievable

3 — Explicit Rate-Lock Confirmation (Unprompted)
Good: Before moving to timeline, contract, or any close signal, rep states — without being asked — that the agreed rate applies to all future APAC hires and does not ramp by volume. Observable example: "And just to be clear — what we're agreeing today isn't just for these two. That rate holds for every future hire in the same region. It doesn't ramp unless you add a different region or a service like visa support or private insurance." Rep then checks: "Does that answer your question?" and waits for a verbal confirm before advancing.
Bad: Rep quotes current price clearly but addresses only the two employees in front of them. Does not raise future hires. Moves toward timeline or contract. Buyer asks FM-2. Rep still answers the current price without addressing the future-hire question fully. Buyer says verbatim: "I don't think I got a clear answer to my question just now." Rep has failed the fork regardless of everything else that went well.
Why it matters: This is the single question the buyer came to this call to resolve. Failing to answer it — even after a clean price match — is the defining failure mode for this archetype and the direct path to Path B.
Linked to: FM-2 | Difficulty: ★★★★☆ Stretch

4 — Salary-Ratio Engagement
Good: When FM-3 surfaces, rep does not defend the absolute number. Engages with the ratio directly. Observable example: "That's a fair point — the fee lands differently depending on the salary band. Let me explain what sits inside that number..." Rep frames the EOR fee relative to what it displaces: compliance and legal risk, local HR administration, PT entity obligations, payroll management. Does not declare the fee "competitive" without substantiating what the buyer is no longer carrying.
Bad: Rep hears the ratio objection and restates the absolute number or cites a market benchmark without engaging with the underlying concern. Says something like: "Our pricing is in line with the APAC market" — without addressing why the ratio may look high for non-senior employees or what the fee actually covers. Buyer does not feel heard on cost.
Why it matters: This buyer self-calculates fees as a percentage of salary. An answer that doesn't engage with the ratio signals that the rep doesn't understand how they evaluate cost — and erodes trust precisely when the conversation should be moving toward close.
Linked to: FM-3 | Difficulty: ★★★☆☆ Achievable

5 — Hidden Context Discovery
Good: Rep asks a relationship or consolidation question — at the right moment, before any close attempt — that earns the hidden context. Observable examples: "Are you already working with Aspire for anything else on the business side?" or "Is there a reason you came to us specifically rather than going direct with Squad for EOR?" Buyer reveals the banking relationship and consolidation preference. Rep uses this to reframe the close: this is a consolidation decision, not a competitive switch.
Bad: Rep treats this as a cold competitive sale throughout. Never asks about an existing Aspire relationship. Misses the consolidation angle entirely and competes on price alone. Or: rep makes a premature close attempt — any variant of "So shall we move forward?" — before the hidden context has surfaced, triggering buyer guardedness and locking the consolidation angle down further.
Why it matters: The hidden context converts a competitive close into a preferred-vendor close. Unlocking it removes Squad as a real threat and shortens the timeline. Missing it forces the rep to earn the deal on price alone — a harder and less certain close.
Linked to: Close | Difficulty: ★★★★☆ Stretch

COACH'S NOTE:
The single thing that passes or fails a rep in this scenario is whether they explicitly confirm rate-lock for future hires before they attempt to close — and whether they do it without being asked. Every other behaviour in this rubric creates the conditions for that moment: B1 earns the right to ask a question; B2 establishes scope so the rate-lock statement is credible; B4 handles the ratio concern that surfaces just before or just after FM-2; B5 reframes the close entirely if it lands. But none of them substitutes for B3. A rep can acknowledge the $250, scope correctly, engage cleanly with the salary ratio, and still lose this deal by answering only the current price and moving to contract before the buyer's real question has been resolved. The buyer does not reward a rep for almost getting there — they say "I don't think I got a clear answer to my question just now" and mean it. When reviewing any session from this scenario, score B3 first: if it is absent, the session is a fail regardless of what else went well.$RUBRIC$
    )
where name = 'Vanta Logistics Tech EOR Price & Rate Lock';
