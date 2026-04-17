-- Seed: Document requirements (11 categories)

INSERT INTO public.document_requirements (category, display_name, description, is_required, weight, limits_when_missing) VALUES
  ('deck', 'Pitch Deck / Investor Materials', 'Company overview, product positioning, market narrative, and growth metrics presented to investors.', true, 1.0, 'product credibility assessment and differentiation analysis'),
  ('architecture', 'Product Architecture Documentation', 'System design, infrastructure diagrams, tech stack, API architecture, and deployment topology.', true, 1.0, 'production readiness assessment and tooling exposure analysis'),
  ('security', 'Security & Compliance Documentation', 'SOC2 reports, ISO certifications, penetration test results, security policies, and compliance frameworks.', true, 1.0, 'governance posture and compliance exposure assessment'),
  ('model_ai', 'Model / AI System Documentation', 'Model cards, training data documentation, evaluation benchmarks, fine-tuning details, and AI system architecture.', true, 1.0, 'AI credibility assessment and model risk analysis'),
  ('data_privacy', 'Data Handling & Privacy Policies', 'Data classification, privacy policies, data flow diagrams, retention policies, and consent mechanisms.', true, 1.0, 'data sensitivity risk assessment and regulatory compliance'),
  ('customer_contracts', 'Customer Contracts (Sample/Redacted)', 'Representative customer agreements showing terms, SLAs, data handling provisions, and liability clauses.', false, 0.8, 'customer commitment validation and contractual risk assessment'),
  ('vendor_list', 'Vendor & API Dependency List', 'Complete inventory of third-party services, APIs, infrastructure providers, and their criticality levels.', true, 1.0, 'vendor concentration risk and switching cost analysis'),
  ('financial', 'Financial / Usage Metrics', 'Revenue, ARR, usage metrics, cost structure, unit economics, and growth trajectory data.', true, 0.9, 'production readiness signals and cost-per-inference economics'),
  ('incident_log', 'Incident Log / Post-Mortems', 'Historical incidents, outage reports, post-mortem analyses, and remediation actions.', false, 0.7, 'production stability and incident response maturity assessment'),
  ('team_bios', 'Team Bios / Technical Leadership', 'Background and credentials of technical leadership, AI/ML team composition, and key personnel.', false, 0.6, 'team capability assessment and key-person risk analysis'),
  ('demo', 'Demo Recordings / Product Walkthroughs', 'Video recordings, interactive demos, or detailed product walkthroughs showing actual system behavior.', false, 0.5, 'demo-to-production gap analysis and UX credibility assessment');
