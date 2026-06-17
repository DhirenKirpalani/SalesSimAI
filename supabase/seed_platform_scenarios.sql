-- ============================================================
-- Seed Platform Scenarios
-- Run this AFTER platform_scenarios.sql has been applied
-- ============================================================

-- --------------------------------------------------------
-- Seed: BloomCommerce First Discovery Case Study
-- --------------------------------------------------------
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
  'BloomCommerce First Discovery',
  'Aspire',
  'B2B expense management SaaS for scale-ups in SEA',
  'Aspire is a B2B fintech platform offering corporate cards, multi-currency accounts, and expense management for growing businesses in Southeast Asia. We help finance teams replace manual processes and spreadsheets with automated approval workflows and real-time spend visibility. Our core differentiator is instant onboarding (no branch visits) and deep ERP integrations with Xero, NetSuite, and QuickBooks. We sell to CFOs, Financial Controllers, and finance ops leaders at companies with 50–500 employees.\n\nIn this case study you are a Mid-Market Account Executive at Aspire covering Southeast Asia. You may use the Aspire website (https://aspireapp.com) and any public sources to prepare.',
  null,
  '{
    "name": "Daniel Lim",
    "jobTitle": "Financial Controller",
    "company": "BloomCommerce",
    "industry": "E-commerce / Consumer Brands",
    "personality": "Analytical, reserved, Big-4 background, asks for data before committing. Skeptical of sales pitches. Will share information when you ask the right questions, but will not volunteer much unprompted. He is not hostile — just reserved.",
    "painPoints": [
      "Finance processes are manual and error-prone across SEA subsidiaries",
      "Lack of real-time visibility into team spend",
      "Audit prep takes weeks due to fragmented expense records",
      "Reconciling multi-currency reimbursements is painful",
      "Current tools don''t integrate with Xero"
    ],
    "goals": [
      "Automate expense reporting and approvals",
      "Reduce month-end close time by 50%",
      "Gain real-time spend visibility for the CFO",
      "Pass the next audit with zero findings",
      "Consolidate finance tools into one platform"
    ],
    "companyBackground": "Singapore-headquartered consumer brand selling beauty and personal-care products. Operates across Southeast Asia. Roughly 250–300 employees. 7 years old. Raised growth-stage funding from a regional investor (per a press release ~2 years ago).",
    "buyerBackground": "Daniel has been Financial Controller for about 4 months. Before BloomCommerce: Big-4 audit background, then five years at a SaaS scale-up. He was hired by the CFO, who joined about 6 months ago.",
    "whatYouKnowFromBooth": "A polite hello, a quick mention that finance is a bit messy, and an agreement to chat further. That''s what you''ve got. Anything else, you''ll need to discover on the call."
  }'::jsonb,
  'First Discovery Call',
  'Intermediate',
  25,
  'You are an Account Executive at Aspire, covering mid-market accounts in Southeast Asia. Last week, you worked the Aspire booth at the SEA Finance Summit in Singapore. Daniel Lim, Financial Controller at BloomCommerce, stopped by your booth. You had a short conversation. He took your card, and you followed up the next day. Daniel agreed to a call to hear more about what Aspire has to offer.\n\nThis is that call. Daniel has not shared any documents. He hasn''t engaged anyone else at his company. He''s coming in to listen.\n\nGround rules:\n- It''s OK to say I don''t know or let me check with our solutions team.\n- It''s OK to push back on Daniel if you disagree. Honest selling over sycophancy.\n- Daniel will share information when you ask the right questions, but he will not volunteer much unprompted.'
)
on conflict do nothing;

-- --------------------------------------------------------
-- Seed: FastShip Logistics First Discovery Case Study
-- --------------------------------------------------------
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
  'FastShip Logistics First Discovery',
  'Aspire',
  'B2B expense management SaaS for scale-ups in SEA',
  'Aspire is a B2B fintech platform offering corporate cards, multi-currency accounts, and expense management for growing businesses in Southeast Asia. We help finance teams replace manual processes and spreadsheets with automated approval workflows and real-time spend visibility. Our core differentiator is instant onboarding (no branch visits) and deep ERP integrations with Xero, NetSuite, and QuickBooks. We sell to CFOs, Financial Controllers, and finance ops leaders at companies with 50–500 employees.\n\nIn this case study you are a Mid-Market Account Executive at Aspire covering Southeast Asia. You may use the Aspire website (https://aspireapp.com) and any public sources to prepare.',
  null,
  '{
    "name": "Sarah Wong",
    "jobTitle": "Finance Manager",
    "company": "FastShip Logistics",
    "industry": "Logistics / Last-Mile Delivery",
    "personality": "Process-oriented, practical, focused on efficiency. Open to learning but needs to see clear operational value. Will share information when you ask directly but does not elaborate unprompted.",
    "painPoints": [
      "Finance team struggling to keep up with company growth",
      "Employee spending is hard to track across 4 countries",
      "Manual expense reports slow down month-end close",
      "No real-time visibility into logistics staff spending",
      "Difficult to enforce spend policies with a distributed workforce"
    ],
    "goals": [
      "Automate expense reporting for 400+ employees",
      "Gain real-time visibility into team spending",
      "Reduce finance admin burden as company scales",
      "Integrate expense data with existing accounting tools",
      "Support compliance across multiple SEA markets"
    ],
    "companyBackground": "Singapore-headquartered logistics and last-mile delivery company. Operates in Singapore, Malaysia, Thailand, and Vietnam. Approximately 400 employees. Founded 9 years ago. Acquired a regional delivery company within the last 18 months. Announced expansion into two new markets this year.",
    "buyerBackground": "Sarah has been Finance Manager for approximately 8 months. Before joining FastShip: worked at DHL for six years, previously held a finance operations role at a regional transportation company. She appears to report directly to the Financial Controller.",
    "whatYouKnowFromBooth": "A comment that growth has made finance more complicated. An interest in how other companies manage employee spending. That is all you have. Anything else, you will need to discover on the call."
  }'::jsonb,
  'First Discovery Call',
  'Intermediate',
  25,
  'You are an Account Executive at Aspire, covering mid-market accounts in Southeast Asia. Three weeks ago, you attended the SEA Operations & Finance Summit in Singapore. At the Aspire booth, Sarah Wong, Finance Manager at FastShip Logistics, stopped by to ask about expense management and corporate cards. The conversation lasted less than five minutes. You exchanged contact information. After a follow-up email, Sarah agreed to a discovery call to learn more about Aspire.\n\nThis is that call. Sarah has not shared any documents. She has not invited anyone else internally. She is coming to learn what is possible.\n\nGround rules:\n- It is OK to say I don''t know or let me check with our solutions team.\n- It is OK to push back on Sarah if you disagree. Honest selling over sycophancy.\n- Sarah will share information when you ask the right questions, but she will not volunteer much unprompted.'
)
on conflict do nothing;

-- --------------------------------------------------------
-- Seed: NovaTech Solutions First Discovery Case Study
-- --------------------------------------------------------
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
  'NovaTech Solutions First Discovery',
  'Aspire',
  'B2B expense management SaaS for scale-ups in SEA',
  'Aspire is a B2B fintech platform offering corporate cards, multi-currency accounts, and expense management for growing businesses in Southeast Asia. We help finance teams replace manual processes and spreadsheets with automated approval workflows and real-time spend visibility. Our core differentiator is instant onboarding (no branch visits) and deep ERP integrations with Xero, NetSuite, and QuickBooks. We sell to CFOs, Financial Controllers, and finance ops leaders at companies with 50–500 employees.\n\nIn this case study you are a Mid-Market Account Executive at Aspire covering Southeast Asia. You may use the Aspire website (https://aspireapp.com) and any public sources to prepare.',
  null,
  '{
    "name": "Kevin Tan",
    "jobTitle": "Financial Controller",
    "company": "NovaTech Solutions",
    "industry": "B2B SaaS",
    "personality": "Curious but cautious, data-driven, likes to compare options before committing. Scaling-focused but concerned about implementation overhead. Responds well to structured discovery but does not volunteer unprompted.",
    "painPoints": [
      "Spend controls and budgeting are becoming difficult as the company scales",
      "Engineering and sales team expenses are growing faster than visibility",
      "Multiple spreadsheets and tools creating data fragmentation",
      "New offices in Indonesia and Philippines adding complexity",
      "Finance team bandwidth stretched thin with rapid hiring"
    ],
    "goals": [
      "Implement scalable spend controls for a growing org",
      "Improve budget visibility for department heads",
      "Reduce time spent on manual expense reconciliation",
      "Integrate with existing ERP and accounting stack",
      "Support compliance across expanding regional offices"
    ],
    "companyBackground": "Singapore-headquartered B2B SaaS company. Serves enterprise customers across Southeast Asia. Approximately 280 employees. Raised a Series B funding round 18 months ago. Opened offices in Indonesia and the Philippines within the last year. Hiring aggressively across sales and engineering.",
    "buyerBackground": "Kevin joined NovaTech approximately 10 months ago. Before NovaTech: spent four years at a venture-backed software company. Started his career in audit at a Big Four accounting firm. Kevin appears to report directly to the CFO.",
    "whatYouKnowFromBooth": "A brief discussion. Kevin mentioned that things are becoming difficult to manage as the company scales. He was evaluating options. That is all you have. Anything else, you will need to discover on the call."
  }'::jsonb,
  'First Discovery Call',
  'Intermediate',
  25,
  'You are an Account Executive at Aspire, covering mid-market accounts in Southeast Asia. Last month, you attended a CFO Leadership Forum in Singapore. Kevin Tan, Financial Controller at NovaTech Solutions, visited the Aspire booth and asked a few questions about spend controls and budgeting. The discussion was brief. You followed up after the event. Kevin agreed to a discovery call to understand whether Aspire could be relevant.\n\nThis is that call. Kevin has not shared any internal information. No other stakeholders are involved. He is primarily joining to evaluate options.\n\nGround rules:\n- It is OK to say I don''t know or let me check with our solutions team.\n- It is OK to push back on Kevin if you disagree. Honest selling over sycophancy.\n- Kevin will share information when you ask the right questions, but he will not volunteer much unprompted.'
)
on conflict do nothing;

-- --------------------------------------------------------
-- Seed: StyleStreet Commerce First Discovery Case Study
-- --------------------------------------------------------
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
  'StyleStreet Commerce First Discovery',
  'Aspire',
  'B2B expense management SaaS for scale-ups in SEA',
  'Aspire is a B2B fintech platform offering corporate cards, multi-currency accounts, and expense management for growing businesses in Southeast Asia. We help finance teams replace manual processes and spreadsheets with automated approval workflows and real-time spend visibility. Our core differentiator is instant onboarding (no branch visits) and deep ERP integrations with Xero, NetSuite, and QuickBooks. We sell to CFOs, Financial Controllers, and finance ops leaders at companies with 50–500 employees.\n\nIn this case study you are a Mid-Market Account Executive at Aspire covering Southeast Asia. You may use the Aspire website (https://aspireapp.com) and any public sources to prepare.',
  null,
  '{
    "name": "Andrew Lee",
    "jobTitle": "Financial Controller",
    "company": "StyleStreet Commerce",
    "industry": "Fashion E-commerce",
    "personality": "Detail-oriented, slightly frustrated by current manual processes, open to new tools but needs proof of ROI. Professional and polite but will push back on vague claims. Shares when asked directly, does not volunteer unprompted.",
    "painPoints": [
      "Finance team spending too much time on manual processes",
      "Lack of visibility into spending across Shopee, Lazada, and TikTok Shop operations",
      "Expense reconciliation is a monthly bottleneck",
      "Hard to track marketing and logistics spend across six markets",
      "Current tools not keeping up with expansion pace"
    ],
    "goals": [
      "Automate expense and spend management workflows",
      "Gain real-time visibility into company spending",
      "Reduce manual finance admin time by half",
      "Integrate expense data with accounting systems",
      "Support multi-market operations with one platform"
    ],
    "companyBackground": "Singapore-headquartered fashion e-commerce company. Sells through direct-to-consumer channels, Shopee, Lazada, and TikTok Shop. Operates across six Southeast Asian markets. Approximately 320 employees. Founded 8 years ago. Raised a growth equity round three years ago. Expanded into two new markets within the last 12 months.",
    "buyerBackground": "Andrew joined StyleStreet approximately 6 months ago. Before StyleStreet: five years at a regional retail company. Started his career in public accounting. Andrew was hired by the CFO, who joined earlier this year.",
    "whatYouKnowFromBooth": "A brief chat after a panel on financial operations. Andrew mentioned that his finance team was spending too much time on manual processes and that he was evaluating ways to improve visibility into company spending. That is all you have. Anything else, you will need to discover on the call."
  }'::jsonb,
  'First Discovery Call',
  'Intermediate',
  25,
  'You are an Account Executive at Aspire, covering mid-market accounts in Southeast Asia. Two weeks ago, you attended the SEA E-Commerce Growth Summit in Singapore. Andrew Lee, Financial Controller at StyleStreet Commerce, stopped by the Aspire booth after attending a panel on financial operations. You spoke briefly. You followed up after the event. Andrew agreed to a call to hear more about Aspire.\n\nThis is that call. Andrew has not shared any documentation. No one else from StyleStreet is participating. He is open to learning but has not committed to any project.\n\nGround rules:\n- It is OK to say I don''t know or let me check with our solutions team.\n- It is OK to push back on Andrew if you disagree. Honest selling over sycophancy.\n- Andrew will share information when you ask the right questions, but he will not volunteer much unprompted.'
)
on conflict do nothing;
