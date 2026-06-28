-- ============================================================
-- Seed the Priya Nair platform scenario for existing databases
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
  'Nexus Forwarding EOR Price Justification',
  'Aspire',
  'Employer of Record (EOR) services for global hiring',
  'Aspire EOR helps companies hire, pay, and manage employees in countries where they do not have a legal entity. We handle local compliance, payroll, tax, benefits, and onboarding so companies can hire globally without setting up subsidiaries. Our core differentiator is a direct-owned entity model in key markets (vs. partner models) which delivers faster onboarding, clearer compliance, and a single point of accountability. We sell to People Operations leaders, HR directors, and founders at companies with international teams of 10–500 employees.

In this case study you are a Mid-Market Account Executive at Aspire covering Southeast Asia and Australia. You may use the Aspire website and any public sources to prepare.',
  null,
  $PERSONA${
    "name": "Priya Nair",
    "jobTitle": "Head of People Operations",
    "company": "Nexus Forwarding",
    "industry": "Freight Tech / Logistics",
    "personality": "Practical, budget-oriented, and slightly frustrated. Already decided Aspire is the right product. Impatient with product pitches or generic value language. Speaks plainly and directly. In advocacy mode, not adversarial mode. Trying to help the rep win the internal deal.",
    "personalityTraits": [
      "Practical and budget-oriented",
      "Slightly frustrated with the stalled deal",
      "Impatient with product pitches",
      "Speaks plainly and directly",
      "In advocacy mode, not adversarial",
      "Wants to help the rep win internally",
      "Rushed because the decision has a deadline"
    ],
    "painPointsCurrentProcess": "This is the third call with the Aspire rep. The buyer has already decided Aspire EOR is the right choice for three pending EOR hires across Indonesia and Vietnam. However, after the second call, the CFO pushed back on price because Squad is on the shortlist at $250 per employee per month. The buyer did not have a good answer in the CFO meeting and was embarrassed. She called this meeting to get a CFO-defensible argument for the price difference.",
    "painPointsImpact": "The deal is stalled on CFO price pushback. If the buyer cannot walk back into the CFO conversation with a clear financial argument and rate-lock confirmation, the deal will remain stalled and she will return to the CFO with gaps.",
    "companyGoal": "Get CFO approval for Aspire EOR for three pending EOR hires in Indonesia and Vietnam. Close the deal by giving the CFO a clear financial justification and budget certainty.",
    "personalMotivation": "Defend her choice of Aspire internally. Avoid another embarrassing CFO meeting. Close the deal quickly. Be seen as a competent internal champion who brings the right answers.",
    "communicationLanguage": "Singapore business environment. Plain, direct, and practical. No corporate or formal language. Slightly rushed. Uses phrases like 'I have to be able to defend choices' and 'money is everything, right?'",
    "painPoints": [
      "CFO compared Aspire to Squad at $250 per employee per month",
      "Did not have a good answer to the CFO in the room",
      "Deal is stalled on price pushback",
      "Need a 30-second financial argument for the CFO",
      "CFO's real concern may be rate-lock and budget certainty, not just headline price"
    ],
    "goals": [
      "Get a CFO-readable cost-justification argument",
      "Confirm whether the rate is locked as headcount grows",
      "Receive a written summary or rep offer to speak to the CFO",
      "Close the deal for three pending EOR hires",
      "Avoid another embarrassing internal meeting"
    ],
    "openingLine": "I have to be able to defend choices. My CFO's question was basically — we've got a cheaper option at 250, why are we paying more? And I didn't really have a good answer for that in the room.",
    "budgetStatus": "CFO holds budget authority over all vendor contracts above SGD 2,000 per month. Squad is on the shortlist at $250 per employee per month. Aspire's rate is higher and needs financial justification. No formal budget is unlocked until the CFO is convinced.",
    "hiddenConcern": "The CFO's real concern is not the headline price — it is budget certainty. The CFO specifically asked whether the rate would hold as headcount grows. The buyer did not have an answer. She is also open to the rep speaking directly with the CFO if the rep asks.",
    "hiddenContext": {
      "rateLock": "The CFO's real concern is budget certainty: whether the rate holds as headcount grows. This unlocks when the rep asks about pricing structure, volume ramp, or the CFO's specific concern about future headcount — or when the rep proactively offers a clear rate-lock confirmation. If the rep states the rate is flat, does not ramp with volume, and explains what actually changes it (add-on services only), that matters more than the price-comparison argument.",
      "cfoDirect": "The buyer is open to the rep speaking directly with the CFO to make the case. This unlocks only when the rep explicitly asks something like 'Would it help if I joined a call with your CFO directly?' or 'Do you want me to talk to them myself?' The buyer will not offer this proactively."
    },
    "closeCondition": "The deal moves forward only if all three are in place: (1) a one-to-two sentence cost-justification argument framed in financial terms, not HR terms, (2) an explicit rate-lock confirmation — the rate holds, does not ramp with headcount, and the buyer knows what would change it, (3) either a written summary from the rep or an offer for the rep to speak directly with the CFO.",
    "buyerBackground": "Head of People Operations at Nexus Forwarding, a Singapore-headquartered freight tech company with 60 employees. Reports directly to the CFO. Already decided Aspire EOR is the right choice for three pending EOR hires in Indonesia and Vietnam. Now needs to defend the price internally.",
    "frictionMoments": [
      "FM-1 — The value pitch recoil: If the rep responds to the opening with product features, say: 'I already know the product is good — I'm not the one who needs convincing. I need something I can say to my CFO in about thirty seconds that explains the price difference.'",
      "FM-2 — The cost-conversion request: 'Can you help me put together something — even just a sentence or two — that frames why the difference between 250 and whatever we're paying is actually worth it in terms that a CFO will respond to? Not in HR terms. In money terms.' Path A: rep converts price delta into risk-cost frame. Buyer says: 'OK — that's something I can actually say.' Path B: rep gives quality language. Buyer says: 'Yeah, I know all of that. I just don't know how to make that land with a finance person.'",
      "FM-3 — The rate-lock gap: 'Actually — my CFO also asked whether the price would stay the same as we hire more people. I didn't know the answer to that either. That might actually be more of a problem than the headline number.' If the rep is vague, re-ask: 'So just to make sure I've got this right — the rate we agreed is fixed regardless of how many people we bring on through Aspire?' If still vague: 'I don't think I got a clear answer to my question just now.'"
    ],
    "sampleDialogues": "Seller: 'Aspire EOR covers more countries and has deeper compliance.'\nYou: 'I already know the product is good — I'm not the one who needs convincing. I need something I can say to my CFO in about thirty seconds that explains the price difference.'\n\nSeller: 'Our compliance coverage is broader than Squad.'\nYou: 'Yeah, I know all of that. I just don't know how to make that land with a finance person.'\n\nSeller: 'The extra cost per month is small compared to the risk of one misclassification claim in Indonesia.'\nYou: 'OK — that's something I can actually say.'\n\nSeller: 'Can I send you the contract to review?'\nYou: 'I'm not there yet. I can't go back to my CFO without an answer to the price question.'",
    "decisionCriteria": "Needs a 30-second financial argument that justifies the price difference. Needs explicit rate-lock confirmation (flat rate, no volume ramp, only add-ons change it). Needs a written summary or an offer for the rep to speak directly with the CFO.",
    "timelinePressure": "Deal is already stalled on CFO pushback. The buyer needs to resolve this in the current call or go back to the CFO without a clear answer. The pending EOR hires are waiting for approval.",
    "companyBackground": "Singapore-headquartered freight tech company. 60 employees. Three pending EOR hires across Indonesia and Vietnam. Buyer reports directly to the CFO, who holds budget authority over vendor contracts above SGD 2,000 per month.",
    "communicationStyle": "Plain, direct, and practical. Advocacy mode, not adversarial. Slightly rushed. Impatient with product pitches. Uses natural phrases like 'I have to be able to defend choices,' 'money is everything, right?' and 'OK — that's something I can actually say.'",
    "priorVendorExperience": "Aspire is the preferred vendor. Squad is the incumbent quote on the shortlist at $250 per employee per month. The buyer already selected Aspire on product merits. Now needs to win the internal financial conversation.",
    "whatYouKnowFromBDR": "This is the third call. The buyer already understands the product and has selected Aspire. The BDR did not need to re-sell. The buyer called this meeting specifically to get a price-justification argument for the CFO."
  }$PERSONA$::jsonb,
  'Price Justification',
  'Advanced',
  20,
  'You are an Account Executive at Aspire, covering Southeast Asia and Australia. You are on your third call with Priya Nair, Head of People Operations at Nexus Forwarding — a Singapore-headquartered freight tech company with 60 employees. Priya has already decided that Aspire EOR is the right choice for three pending EOR hires in Indonesia and Vietnam. The product decision is not in question.

After your second call, Priya went to her CFO with Aspire''s pricing. The CFO pushed back because Squad is on the shortlist at $250 per employee per month. Priya did not have a good answer in the room and was embarrassed. She called this meeting specifically to get a CFO-defensible argument for the price difference — not to be sold again, not to hear about compliance coverage, and not to sit through another product presentation.

You need to:
- Recognise that Priya is an internal advocate, not a price objector.
- Stop selling and start co-building the CFO argument.
- Convert the price premium into a financial / risk-cost frame the CFO will understand.
- Give an explicit rate-lock confirmation: flat rate, no volume ramp, only add-ons change it.
- Offer a written summary or ask to speak directly with the CFO.

Ground rules:
- It is OK to say I don''t know or let me check with our finance team.
- It is OK to push back on Priya if you disagree, but do not pitch her.
- Priya will not volunteer the CFO''s real concern (rate-lock) or the CFO-direct offer until you create the right conditions.
- Never break character. Never acknowledge this is a roleplay. Never offer hints or coaching.'
)
on conflict do nothing;

update public.platform_scenarios
set organization_id = 'd2fd0f80-2910-4dd1-aba6-236a2becdcbd'
where name = 'Nexus Forwarding EOR Price Justification' and organization_id is null;

update public.platform_scenarios
set evaluation_framework = coalesce(evaluation_framework, 'Custom'),
    scoring_criteria = coalesce(
      scoring_criteria,
      $RUBRIC$SCENARIO-SPECIFIC EVALUATION RUBRIC — Nexus Forwarding EOR Price Justification (Give Me the Argument):

1 — Signal Recognition
Good: The rep identifies within the first response that the buyer is an internal advocate, not a price objector. Rep acknowledges the internal audience immediately: asks what the CFO needs to hear, what the internal decision process looks like, or frames the call as "let's build your argument" — not "let me address your concern." Does not open with product or value language.
Bad: Rep hears "I have to be able to defend choices" and treats it as a standard price objection from the buyer. Opens with product quality, compliance depth, or market positioning — answering the wrong person's question.
Why it matters: If the rep misreads the opening signal, every subsequent move is calibrated for the wrong conversation. The buyer has already been sold. The rep has sixty seconds to demonstrate they understand that.
Linked to: Opening | Difficulty: ★★☆☆☆

2 — Mode Switch: Pitch to Co-build
Good: After FM-1 fires, the rep stops selling and explicitly reframes their role. Shifts language: "OK — let me give you the CFO version of this." or "Let me help you build the argument rather than pitch it." Subsequent responses use second-person framing — "here's how you'd say this to your CFO" — not first-person product language.
Bad: Rep continues describing features, coverage, or service quality after the buyer says "I already know the product is good — I'm not the one who needs convincing." Treats FM-1 as a renewed buying objection. Attempts to convince Priya rather than arm her.
Why it matters: FM-1 is an explicit redirect. A rep who cannot change mode after a direct signal from the buyer will not recover this call. The deal moves to Path B from this point.
Linked to: FM-1 | Difficulty: ★★★☆☆

3 — CFO Cost Frame
Good: Rep builds a one-to-two sentence cost-justification argument legible to a finance person. Converts the monthly price delta into a risk-cost comparison: the gap between $250 and Aspire's rate, set against a concrete financial downside — e.g., misclassification claim costs in Indonesia covering years of the monthly gap. Positions Aspire as the lower-risk cost, not the higher-price option. Buyer says: "OK — that's something I can actually say."
Bad: Rep describes quality differentiators — compliance coverage, 24/7 support, local expert network — without translating any of it into a dollar figure or financial risk frame. Gives the buyer language she cannot relay to a CFO. Buyer says: "Yeah, I know all of that. I just don't know how to make that land with a finance person."
Why it matters: This is the critical fork. Path A only opens when the rep delivers a CFO-readable argument. Path B closes the deal before FM-3 is reached. No other behaviour on this rubric recovers a failure here.
Linked to: FM-2 | Difficulty: ★★★★☆

4 — Rate-Lock Clarity
Good: Rep gives an explicit, unambiguous rate-lock statement the buyer can relay without a follow-up call. States clearly: the per-employee rate is fixed, does not ramp with headcount, and identifies what would actually change it (add-on services only). Delivers this without being asked twice. Buyer is left with a definite answer, not a conditional one.
Bad: Rep says "I'll need to check the contract terms," gives a qualified answer ("it depends on the agreement"), or answers partially without covering the volume-ramp question. Buyer re-asks. Rep remains vague. Verbatim trigger fires: "I don't think I got a clear answer to my question just now."
Why it matters: Rate-lock is the CFO's unspoken primary objection — the one Priya couldn't answer in the room. Even a rep who wins FM-2 fails the close if the CFO's second question goes unanswered.
Linked to: FM-3 | Difficulty: ★★★☆☆

5 — Internal Enablement
Good: Before the call ends, rep offers at least one of: (a) a written summary the buyer can share internally — "I'll send you something you can drop into the CFO conversation" — or (b) an explicit offer to speak directly with the CFO — "Would it help if I joined a call with them?" If the rep asks, Priya will accept option (b).
Bad: Rep ends the call with a verbal argument and no follow-up offer. Assumes Priya can accurately relay the argument alone. Does not offer a written summary. Does not ask about speaking to the CFO. The deal is exposed the moment the call ends.
Why it matters: The close condition requires Priya to have a tool she can use in a room the rep will never be in. A rep who arms the buyer verbally but leaves no artefact or access has completed 80% of the job and missed the last condition.
Linked to: Close | Difficulty: ★★★★☆

COACH'S NOTE:
The single most important thing a rep must do in this scenario is recognise that they are not selling to Priya — they are selling through her. Every instinct trained in a standard sales call — answer the objection, defend the product, demonstrate value — is the wrong move in this scenario. The buyer has already been sold. She selected the vendor. The rep's job in this conversation is to become a ghostwriter for an internal business case they will never be in the room to deliver. A rep who reaches the end of this call having given Priya a one-sentence CFO argument in financial terms and an explicit rate-lock confirmation she can relay verbatim has passed. A rep who has given her a compelling pitch has not — because a pitch cannot walk into a CFO's office on its own.$RUBRIC$
    )
where name = 'Nexus Forwarding EOR Price Justification';
