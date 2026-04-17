-- Seed: 10 synthetic benchmark case anchors

INSERT INTO public.benchmark_cases (case_anchor_id, vertical, deal_size_band, ai_architecture_type, composite_score, dimension_scores_json, war_story_summary, tags) VALUES

('CASE-001', 'legal_tech', '25m_100m', 'rag_heavy', 2.8,
 '{"product_credibility": 3.2, "tooling_exposure": 1.8, "data_sensitivity": 3.0, "governance_safety": 2.5, "production_readiness": 3.0, "open_validation": 3.3}',
 'RAG-heavy legal AI startup processing contract review. Heavy reliance on single LLM provider with no fallback strategy. Strong domain-specific training data but vendor concentration risk rated critical. Impressive demo but production deployment limited to 3 customers.',
 ARRAY['rag', 'legal', 'vendor_concentration', 'single_provider_risk']),

('CASE-002', 'sales_tech', '25m_100m', 'agentic', 2.3,
 '{"product_credibility": 2.5, "tooling_exposure": 2.0, "data_sensitivity": 2.8, "governance_safety": 1.5, "production_readiness": 2.5, "open_validation": 2.5}',
 'Agentic sales automation tool with autonomous email generation and CRM updates. Minimal human-in-the-loop for outbound communications. No output monitoring or hallucination detection. Governance posture significantly below benchmark for deal size.',
 ARRAY['agentic', 'sales', 'weak_governance', 'autonomous_output', 'no_hitl']),

('CASE-003', 'healthcare', '100m_500m', 'fine_tuned', 3.8,
 '{"product_credibility": 4.0, "tooling_exposure": 3.5, "data_sensitivity": 4.2, "governance_safety": 4.5, "production_readiness": 3.5, "open_validation": 3.0}',
 'Vertical healthcare AI for radiology assistance with FDA 510(k) clearance. Best-in-class compliance and governance. Strong moat through regulatory barriers. Concern: narrow clinical applicability and high cost-per-inference limiting scaling economics.',
 ARRAY['healthcare', 'fine_tuned', 'regulatory_moat', 'fda_cleared', 'high_compliance']),

('CASE-004', 'devtools', '25m_100m', 'fine_tuned', 2.5,
 '{"product_credibility": 3.0, "tooling_exposure": 2.5, "data_sensitivity": 1.8, "governance_safety": 2.5, "production_readiness": 3.0, "open_validation": 2.2}',
 'Fine-tuned code assistant trained on customer codebases. Training data provenance gaps — unclear licensing for open-source code used in fine-tuning. Customer data isolation concerns between tenants sharing the same fine-tuned model.',
 ARRAY['devtools', 'fine_tuned', 'training_data_provenance', 'licensing_risk', 'tenant_isolation']),

('CASE-005', 'vertical_saas', 'under_25m', 'workflow_plus_ai', 2.0,
 '{"product_credibility": 1.5, "tooling_exposure": 2.5, "data_sensitivity": 2.0, "governance_safety": 2.0, "production_readiness": 2.5, "open_validation": 1.5}',
 'Workflow SaaS for property management with AI bolt-on for tenant communications. Core value is the workflow — AI is a feature, not the product. Differentiation defensibility weak; any competitor could add similar AI capabilities in weeks.',
 ARRAY['vertical_saas', 'ai_bolt_on', 'weak_moat', 'workflow_wrapper', 'commodity_ai']),

('CASE-006', 'fintech', '100m_500m', 'multi_model', 3.5,
 '{"product_credibility": 3.8, "tooling_exposure": 3.0, "data_sensitivity": 4.0, "governance_safety": 3.5, "production_readiness": 3.2, "open_validation": 3.5}',
 'Multi-model fintech platform for credit risk assessment. Uses ensemble of proprietary and foundation models. Strong data handling for PII/financial data. Concern: model drift monitoring immature — no automated retraining pipeline. Regulatory scrutiny from OCC likely.',
 ARRAY['fintech', 'multi_model', 'credit_risk', 'pii_handling', 'model_drift', 'regulatory']),

('CASE-007', 'edtech', 'under_25m', 'single_model_api', 3.0,
 '{"product_credibility": 3.5, "tooling_exposure": 2.0, "data_sensitivity": 3.5, "governance_safety": 3.0, "production_readiness": 3.0, "open_validation": 3.0}',
 'EdTech adaptive learning platform using single API provider for content generation. COPPA compliance requirements well-handled. Switching cost concern: entire prompt library and evaluation suite built around one provider API. No portable abstraction layer.',
 ARRAY['edtech', 'single_api', 'coppa', 'switching_cost', 'vendor_lock_in']),

('CASE-008', 'cybersecurity', '25m_100m', 'hybrid', 3.2,
 '{"product_credibility": 3.5, "tooling_exposure": 3.5, "data_sensitivity": 3.0, "governance_safety": 3.0, "production_readiness": 3.5, "open_validation": 2.7}',
 'Hybrid AI cybersecurity platform combining on-premise anomaly detection with cloud-based threat intelligence. Good architecture for data sensitivity. Production track record strong with 50+ enterprise deployments. Team depth concern: two key ML engineers hold all institutional knowledge.',
 ARRAY['cybersecurity', 'hybrid', 'on_premise', 'key_person_risk', 'enterprise']),

('CASE-009', 'hr_tech', '25m_100m', 'rag_heavy', 2.6,
 '{"product_credibility": 2.8, "tooling_exposure": 2.5, "data_sensitivity": 2.5, "governance_safety": 2.2, "production_readiness": 2.8, "open_validation": 3.0}',
 'HR/recruiting AI using RAG over job descriptions and resumes. Bias detection framework exists but is self-assessed, not independently audited. EEOC exposure if adverse impact claims arise. PII handling adequate but data retention policies overly broad.',
 ARRAY['hr_tech', 'rag', 'bias_risk', 'eeoc_exposure', 'pii', 'self_assessed_fairness']),

('CASE-010', 'supply_chain', 'over_500m', 'agentic', 3.6,
 '{"product_credibility": 4.0, "tooling_exposure": 3.5, "data_sensitivity": 3.2, "governance_safety": 3.5, "production_readiness": 3.8, "open_validation": 3.5}',
 'Large-scale supply chain optimization platform with agentic procurement capabilities. Autonomous purchase order generation with configurable approval thresholds. Strong production track record and incident response. Open question: agentic actions in financial workflows create liability ambiguity not yet tested in courts.',
 ARRAY['supply_chain', 'agentic', 'autonomous_purchasing', 'financial_liability', 'enterprise_scale']);
