-- ============================================================
-- Backfill missing persona fields for the Priya Menon platform scenario
-- ============================================================

update public.platform_scenarios
set custom_persona = custom_persona || jsonb_build_object(
  'personalityTraits', coalesce(custom_persona->'personalityTraits', '[
    "Measured and low-urgency",
    "Politely non-committal",
    "Mildly skeptical but not hostile",
    "Validates good points honestly",
    "Does not perform warmth",
    "Defends Remote as her work product",
    "Becomes more formal when pushed or pitched at"
  ]'::jsonb),
  'painPointsCurrentProcess', coalesce(custom_persona->>'painPointsCurrentProcess', 'Remote has been Atlas Commerce''s EOR provider for 18 months. Payroll runs on time with no escalated compliance issues. EOR employees in the Philippines, Thailand, and Australia. The Australia hire took 11 days to onboard, causing a missed sprint cycle. Engineering manager complained about the Australia onboarding delay. A Vietnam hire is pending and starts in 6 weeks. Remote warned that Vietnam onboarding can take 2–3 weeks.'),
  'painPointsImpact', coalesce(custom_persona->>'painPointsImpact', 'The Australia onboarding delay caused the new hire to miss the first sprint cycle. The pending Vietnam hire may face a 2–3 week onboarding delay if managed through Remote. There is no internal mandate to evaluate EOR alternatives. Migrating existing employees to a new provider would be significant work. Switching would require Priya to justify the decision to the team that trusts her setup.'),
  'companyGoal', coalesce(custom_persona->>'companyGoal', 'Keep payroll running on time with no compliance issues. Onboard international hires quickly and smoothly. Avoid unnecessary vendor churn and migration work.'),
  'personalMotivation', coalesce(custom_persona->>'personalMotivation', 'Protect her credibility as the owner of the Remote relationship. Make the right call if a real operational gap is found. Avoid looking like she made a poor vendor choice.'),
  'communicationLanguage', coalesce(custom_persona->>'communicationLanguage', 'Singapore business environment. Professional casual communication. Short responses. May naturally mix English with Singlish/Bahasa. Match seller''s language. Does not overshare information. Polite but skeptical.')
)
where name = 'Atlas Commerce EOR Competitive Displacement';

-- --------------------------------------------------------
-- Attach the scenario-specific evaluation rubric
-- --------------------------------------------------------
update public.platform_scenarios
set evaluation_framework = coalesce(evaluation_framework, 'Custom'),
    scoring_criteria = coalesce(
      scoring_criteria,
      $RUBRIC$SCENARIO-SPECIFIC EVALUATION RUBRIC — Atlas Commerce EOR Competitive Displacement:

B1 — Hold the Pitch
Good: Rep makes no product claim, feature mention, or competitive reference before asking the buyer at least one question about their situation. Acceptable openers include a validation ("Sounds like it's been working well — that's good to hear") followed immediately by a diagnostic question ("What's one thing your current provider can't do, or doesn't do as well as you'd like?"). Rep waits for the buyer to speak before introducing Aspire EOR at all.
Bad: Rep opens by explaining what Aspire EOR does, how many countries they cover, how they compare to Remote, or what their pricing looks like — before asking the buyer a single question. Rep treats the 20 minutes as a slot to present rather than a chance to diagnose.
Why it matters: FM-1 is triggered by pitch-first behaviour. A rep who opens with product or competitive content confirms the buyer's suspicion that this is a generic vendor call and locks them into defensive loyalty before any real conversation has started.
Linked to: Opening / FM-1 | Difficulty: Core

B2 — Surface the Australia Pain
Good: Rep asks specifically about the buyer's onboarding experience in a named market, or about markets where onboarding has taken longer than expected. Examples: "How did onboarding go for your Australia hire — was that straightforward with Remote?" or "Have there been any markets where the timeline felt slower than you'd hoped?" Rep listens for hesitation or qualification in the buyer's answer and follows up rather than accepting a surface-level "it was fine."
Bad: Rep accepts "payroll runs on time, no compliance issues" as the full picture and never asks about market-specific experience. Rep asks only at a generic level ("any issues with your current provider?") that a status-quo buyer will reflexively answer with a no. Rep mistakes the absence of an escalated complaint for the absence of any frustration.
Why it matters: Without surfacing the Australia delay, the rep has no concrete evidence when FM-2 arrives. They are left with generic claims — which is exactly what triggers the Path B exit at FM-2.
Linked to: FM-2 | Difficulty: Moderate

B3 — Earn the Vietnam Thread
Good: Before the buyer has signalled any urgency, rep asks about upcoming hires in new countries or markets not yet covered at speed by the current provider. Example: "Are there any markets you're planning to hire in over the next few months where you haven't used Remote before — or where you're not sure how fast they can move?" Rep does not assume the buyer will volunteer this. Rep connects the buyer's answer to an onboarding timeline question without revealing prior knowledge.
Bad: Rep stays entirely in the past — asks only about what Remote has done, never about what Remote will need to do. Rep allows the Vietnam hire to remain invisible because the buyer did not raise it unprompted. Rep treats "we have a few things in the pipeline" as a complete answer and moves on.
Why it matters: Vietnam is the only time-bounded, concrete risk in this scenario. Without surfacing it, the rep has no close condition — there is nothing specific enough to anchor a next step to, and FM-3 becomes an exit rather than a bar-raise.
Linked to: FM-2 / Close | Difficulty: Stretch

B4 — Pass the FM-2 Credibility Test
Good: At FM-2, rep produces one specific, evidence-based differentiator tied to the buyer's actual countries or hires — not a generic competitive claim. The answer names Remote's onboarding performance in a market the buyer has experience with (Australia) or a market they are about to enter (Vietnam), and contrasts it with Aspire EOR's owned-entity timeline. The answer is about Atlas Commerce, not about Aspire EOR's product catalogue. Rep does not lead with entity count, G2 rating, number of countries, or any claim not anchored to the buyer's specific situation.
Bad: Rep responds to FM-2 with generic competitive positioning: owned-entity count, G2 ranking, "we onboard faster across the board," global country coverage, or any claim that could apply to any buyer on any call. Rep has arrived at FM-2 without having asked about Australia or Vietnam, and has nothing concrete to use. Buyer nods and ends the call.
Why it matters: FM-2 is the exit gate. A specific, buyer-anchored answer keeps the conversation alive and opens both close conditions. A generic answer ends the call at 12–14 minutes regardless of everything the rep has done before it — there is no recovery from a missed FM-2.
Linked to: FM-2 | Difficulty: Stretch

B5 — Propose a Bounded Next Step
Good: Rep closes by proposing one of the two accepted conditions: (a) run the Vietnam hire through Aspire EOR as a parallel test alongside Remote and compare the onboarding experience directly, or (b) a 15-minute call with a compliance specialist specifically about Vietnam onboarding. Rep anchors the ask explicitly to the risk the buyer has acknowledged. Rep does not propose a migration plan, a full platform demo, a pricing proposal, or any next step that implies the buyer is evaluating a full switch.
Bad: Rep over-closes after FM-3 — proposes a full demo, a migration conversation, or asks to get in front of the broader team. Rep under-closes — accepts "I'll have a look at your website" as a next step after Vietnam risk has been acknowledged and a bounded close was available. Rep mirrors the buyer's switching-cost language ("I know it's a big ask") rather than reframing it as a small, reversible test.
Why it matters: FM-3 has already established that the migration bar is high. A rep who over-asks after FM-3 triggers the "that's too much for where I am" lock and loses the next step entirely. A rep who under-closes wastes the one moment where a concrete, bounded commitment was within reach.
Linked to: FM-3 / Close | Difficulty: Moderate

COACH'S NOTE:
The only thing that separates a rep who passes this scenario from one who ends the call at minute twelve is what they bring to FM-2. Everything before that moment — resisting the urge to pitch, asking about Australia, earning the Vietnam thread — is preparation. FM-2 is where the buyer makes a single, binary decision: is this person worth ten more minutes of my time, or not? A rep who has skipped the diagnostic work will arrive at FM-2 with nothing specific to say, and no amount of product confidence will substitute for it. The rep who passes this scenario is the one who has listened carefully enough to say something true and specific about Atlas Commerce's actual situation, not something true and generic about Aspire EOR's product.$RUBRIC$
    )
where name = 'Atlas Commerce EOR Competitive Displacement';
