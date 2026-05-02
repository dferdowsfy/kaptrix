import Link from "next/link";

export const metadata = {
  title: "Sample Read — Company Readiness (Orbital Ops) | Kaptrix",
  description:
    "A sample Kaptrix Company Readiness Report for Orbital Ops (LexiFlow AI).",
};

function ScoreBar({
  label,
  value,
  max = 5,
  tone = "indigo",
}: {
  label: string;
  value: number;
  max?: number;
  tone?: "indigo" | "amber" | "sky";
}) {
  const pct = Math.round((value / max) * 100);
  const barColor =
    tone === "amber"
      ? "bg-amber-500"
      : tone === "sky"
        ? "bg-sky-500"
        : "bg-indigo-500";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-lg font-bold text-slate-900">
          {value.toFixed(1)}
          <span className="ml-0.5 text-xs font-normal text-slate-500">
            /{max}
          </span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "critical" | "high" | "medium" | "low";
}) {
  const styles = {
    critical: "bg-rose-100 text-rose-700 ring-rose-200",
    high: "bg-orange-100 text-orange-700 ring-orange-200",
    medium: "bg-amber-100 text-amber-800 ring-amber-200",
    low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  }[tone];
  return (
    <span
      className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles}`}
    >
      {children}
    </span>
  );
}

function SectionEyebrow({ n, title }: { n: string; title: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-600">
      {n} · {title}
    </p>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">
      {children}
    </code>
  );
}

export default function SampleReportPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar with Back button */}
      <div className="print-hide sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-600">
            Sample Read
          </span>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Title */}
        <header className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Company Readiness Report — Orbital Ops
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            Orbital Ops · Generated 4/20/2026, 9:50:10 PM
          </p>
        </header>

        {/* Decision Snapshot */}
        <section className="mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-6 text-white shadow-lg sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300">
            Decision Snapshot
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Proceed with Conditions
            </h2>
            <Pill tone="medium">Medium</Pill>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-indigo-100 sm:text-base">
            Orbital Ops&apos; LexiFlow AI has a commercially credible
            product-market fit, but diligence evidence indicates gaps in
            infrastructure resiliency and data sensitivity that require
            contractual and technical conditions to validate tenant
            isolation and multi-model fallback.
          </p>

          <div className="mt-6">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                Confidence
              </span>
              <span className="text-xl font-bold">
                60<span className="text-xs font-normal text-indigo-300">/100</span>
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[60%] bg-indigo-400" />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-inset ring-emerald-400/30">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Key Strengths
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-indigo-50">
                <li>• Real customer base with 128% net dollar retention</li>
                <li>• Healthy retention signal across 18 enterprise logos</li>
                <li>• Positioned for durable workflow lock-in</li>
              </ul>
            </div>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-inset ring-rose-400/30">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">
                Key Risks
              </p>
              <ul className="mt-2 space-y-2 text-sm text-indigo-50">
                <li>
                  Shared embeddings tenancy model carries elevated
                  data-sensitivity risk
                  <Pill tone="critical">Critical</Pill>
                </li>
                <li>
                  Marketed multi-provider failover is not architecturally
                  present
                  <Pill tone="high">High</Pill>
                </li>
                <li>
                  SOC 2 Type II observation window still open
                  <Pill tone="medium">Medium</Pill>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <h2 className="mt-12 border-b border-slate-200 pb-3 text-2xl font-bold tracking-tight">
          Company Readiness Report for Orbital Ops
        </h2>

        {/* 1. System & AI Architecture Reality */}
        <section className="mt-10 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="01" title="1. System & AI Architecture Reality" />
          <h3 className="text-xl font-bold text-slate-900">
            1. System & AI Architecture Reality
          </h3>
          <p>
            The actual system architecture of Orbital Ops&apos; LexiFlow AI
            is reconstructed from various artifacts, including the{" "}
            <Code>Architecture_Overview.docx</Code> and{" "}
            <Code>Vendor_Dependencies.xlsx</Code>. The stated architecture,
            as claimed in the <Code>LexiFlow_Investor_Deck.pdf</Code>, is
            compared to the observed architecture, revealing discrepancies.
            A key mismatch is the claimed multi-model failover, which is
            not reflected in the architecture documentation. Specifically,
            the deck claims &ldquo;production multi-model failover&rdquo;
            (p.12), while the architecture overview shows a single
            Anthropic path with manual fallback runbooks (§3.2).
          </p>
          <p>
            The following table summarizes the components, stated claims,
            observed reality, evidence, and gaps:
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Component</th>
                  <th className="px-4 py-3 font-semibold">Stated</th>
                  <th className="px-4 py-3 font-semibold">Observed</th>
                  <th className="px-4 py-3 font-semibold">Evidence</th>
                  <th className="px-4 py-3 font-semibold">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 align-top">Multi-model failover</td>
                  <td className="px-4 py-3 align-top">Yes (p.12)</td>
                  <td className="px-4 py-3 align-top">No (§3.2)</td>
                  <td className="px-4 py-3 align-top text-xs">
                    LexiFlow_Investor_Deck.pdf, Architecture_Overview.docx
                  </td>
                  <td className="px-4 py-3 align-top">
                    No abstraction layer found
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 align-top">Tenant isolation</td>
                  <td className="px-4 py-3 align-top">Logical (§4.1)</td>
                  <td className="px-4 py-3 align-top">Shared embeddings (§4.1)</td>
                  <td className="px-4 py-3 align-top text-xs">
                    Architecture_Overview.docx
                  </td>
                  <td className="px-4 py-3 align-top">
                    Inadequate for privileged legal content
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">Data store</td>
                  <td className="px-4 py-3 align-top">Pinecone index (§3.2)</td>
                  <td className="px-4 py-3 align-top">
                    Single Pinecone index (§3.2)
                  </td>
                  <td className="px-4 py-3 align-top text-xs">
                    Architecture_Overview.docx
                  </td>
                  <td className="px-4 py-3 align-top">No clear data separation</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 align-top">Model provider</td>
                  <td className="px-4 py-3 align-top">Anthropic, OpenAI (p.12)</td>
                  <td className="px-4 py-3 align-top">Anthropic only (§3.2)</td>
                  <td className="px-4 py-3 align-top text-xs">
                    LexiFlow_Investor_Deck.pdf, Architecture_Overview.docx
                  </td>
                  <td className="px-4 py-3 align-top">
                    Single-provider concentration risk
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            The single architectural decision most likely to break at 3x
            tenant growth is the shared embeddings infrastructure, which
            may lead to data sensitivity concerns and scalability issues.
            As the number of tenants increases, the risk of data exposure
            and cross-tenant contamination grows, potentially compromising
            the confidentiality and integrity of sensitive legal data.
          </p>

          <blockquote className="border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3 text-sm italic text-slate-700">
            The architecture of LexiFlow AI, as observed, does not fully
            support the claimed multi-model failover and tenant isolation,
            introducing significant risks for data sensitivity and
            scalability. The lack of abstraction layers and reliance on a
            single model provider exacerbate these concerns.
          </blockquote>

          <p>
            <strong>Decision:</strong> The architecture does not support
            the deal thesis as-is, due to the identified gaps and risks,
            and requires conditions to be met, including the
            implementation of true multi-model failover, enhanced tenant
            isolation, and mitigation of single-provider concentration
            risk.
          </p>
        </section>

        {/* 2. Product Credibility Breakdown */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="02" title="2. Product Credibility Breakdown" />
          <h3 className="text-xl font-bold text-slate-900">
            2. Product Credibility Breakdown
          </h3>
          <p>
            The product credibility of Orbital Ops&apos; LexiFlow AI is
            evaluated by analyzing the extent to which AI drives value
            versus being a thin wrapper around deterministic rules.
            According to the <Code>LexiFlow_Investor_Deck.pdf</Code>{" "}
            (p.12), the platform reduces contract review time by 72% for
            enterprise legal teams, implying significant AI-driven value.
            However, the <Code>Architecture_Overview.docx</Code> (§4.1)
            reveals that customer workspaces share a single Pinecone index
            with per-tenant namespaces, suggesting a potential
            demo-vs-production gap.
          </p>
          <p>
            To quantify the AI-driven value, we estimate that approximately
            60% of the workflow is touched by the model, while 40% relies
            on deterministic rules. The claimed accuracy of the model is
            95%, but observed benchmarks are not provided, introducing
            uncertainty. We identify 10 named customers using the AI
            feature in production, including three AmLaw 100 firms, which
            supports the product-market fit thesis. Reference-call findings
            from these customers indicate an average reduction of 60% in
            contract review time, aligning with the claimed benefits.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Product credibility (AI value vs wrapper)" value={3.6} />
            <ScoreBar label="Demo-production gap" value={3.4} tone="sky" />
            <ScoreBar label="Customer vs claimed" value={4.0} />
            <ScoreBar label="Differentiation" value={3.4} tone="sky" />
          </div>

          <p>
            Stress-testing the demo-vs-production gap reveals potential
            failures under adversarial input, long-tail data, or production
            concurrency. For instance, the shared embeddings infrastructure
            may struggle with tenant isolation under high concurrency,
            leading to data sensitivity concerns. Additionally, the lack of
            observed benchmarks for the model&apos;s accuracy introduces
            uncertainty about its performance under real-world conditions.
          </p>

          <p>Two specific missing proofs are:</p>
          <ol className="ml-6 list-decimal space-y-1">
            <li>
              A detailed benchmarking report for the model&apos;s accuracy
              under various production scenarios, which would be provided
              in a <Code>Model_Benchmarking_Report.pdf</Code> artifact.
            </li>
            <li>
              A customer-facing attestation of the tenant isolation program,
              which would be provided in a{" "}
              <Code>Tenant_Isolation_Attestation.pdf</Code> artifact.
            </li>
          </ol>

          <p>
            <strong>Decision:</strong> credible-with-conditions, as the
            product demonstrates significant AI-driven value, but the
            demo-vs-production gap and missing proofs introduce
            uncertainty, requiring additional validation to fully support
            the deal thesis.
          </p>
        </section>

        {/* 3. Data Advantage vs Illusion */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="03" title="3. Data Advantage vs Illusion" />
          <h3 className="text-xl font-bold text-slate-900">
            3. Data Advantage vs Illusion
          </h3>
          <p>
            The data advantage of Orbital Ops&apos; LexiFlow AI is evaluated
            by analyzing the volume, growth rate, and uniqueness of the
            data. According to the <Code>LexiFlow_Investor_Deck.pdf</Code>{" "}
            (p.19), the platform has 18 paying enterprise logos, including
            three AmLaw 100 firms, which contributes to a significant data
            asset. However, the <Code>Architecture_Overview.docx</Code>{" "}
            (§4.1) reveals that customer workspaces share a single Pinecone
            index with per-tenant namespaces, suggesting a potential data
            sensitivity concern.
          </p>
          <p>
            The data volume is estimated to be around 10 TB, with a growth
            rate of 20% YoY, based on{" "}
            <Code>Vendor_Dependencies.xlsx</Code> (Sheet1) and{" "}
            <Code>SOC2_Summary.pdf</Code> (§3). The unique rights to the
            data are granted through contract clauses, such as the one
            mentioned in the <Code>LexiFlow_Investor_Deck.pdf</Code>{" "}
            (p.12), which states that the company has the right to use and
            train models on customer data. However, the absence of a clear
            data ownership clause in <Code>Vendor_Dependencies.xlsx</Code>{" "}
            (Sheet1) introduces uncertainty.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data asset</th>
                  <th className="px-4 py-3 font-semibold">Classification</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                  <th className="px-4 py-3 font-semibold">Exclusivity</th>
                  <th className="px-4 py-3 font-semibold">
                    Replication cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 align-top">Customer contracts</td>
                  <td className="px-4 py-3 align-top">Operational</td>
                  <td className="px-4 py-3 align-top text-xs">
                    LexiFlow_Investor_Deck.pdf (p.19)
                  </td>
                  <td className="px-4 py-3 align-top">Medium</td>
                  <td className="px-4 py-3 align-top">$1M – $2M</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 align-top">Model training data</td>
                  <td className="px-4 py-3 align-top">Proprietary</td>
                  <td className="px-4 py-3 align-top text-xs">
                    Architecture_Overview.docx (§4.1)
                  </td>
                  <td className="px-4 py-3 align-top">High</td>
                  <td className="px-4 py-3 align-top">$5M – $10M</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">Pinecone index</td>
                  <td className="px-4 py-3 align-top">Commoditized</td>
                  <td className="px-4 py-3 align-top text-xs">
                    Vendor_Dependencies.xlsx (Sheet1)
                  </td>
                  <td className="px-4 py-3 align-top">Low</td>
                  <td className="px-4 py-3 align-top">$100K – $500K</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            Stress-testing the data advantage reveals that if a well-funded
            competitor spent $5M and 6 months, they could potentially
            replicate around 30% of the data advantage, primarily the
            commoditized Pinecone index and some operational customer
            contracts. However, the proprietary model training data would
            remain exclusive, providing a significant moat.
          </p>

          <p>
            <strong>Decision:</strong> The data advantage of Orbital
            Ops&apos; LexiFlow AI is classified as operational but
            replaceable, as while the company has a significant data
            asset, a well-funded competitor could potentially replicate a
            substantial portion of it, and the absence of clear data
            ownership clauses introduces uncertainty.
          </p>
        </section>

        {/* 4. Vendor & Model Dependency Risk */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="04" title="4. Vendor & Model Dependency Risk" />
          <h3 className="text-xl font-bold text-slate-900">
            4. Vendor & Model Dependency Risk
          </h3>
          <p>
            The vendor and model dependency risk of Orbital Ops&apos;
            LexiFlow AI is evaluated by analyzing the concentration of
            spend, contract terms, and switching costs. According to{" "}
            <Code>Vendor_Dependencies.xlsx</Code> (Sheet1), the company has
            a significant dependency on Anthropic, with 80% of compute
            spend allocated to this vendor. The contract term is 2 years,
            with auto-renewal terms and price protection for the first
            year. However, the absence of a clear termination clause
            introduces uncertainty.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Dependency</th>
                  <th className="px-4 py-3 font-semibold">Term</th>
                  <th className="px-4 py-3 font-semibold">Switching cost</th>
                  <th className="px-4 py-3 font-semibold">Fallback</th>
                  <th className="px-4 py-3 font-semibold">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 align-top">Anthropic</td>
                  <td className="px-4 py-3 align-top">Primary model provider</td>
                  <td className="px-4 py-3 align-top">2 years</td>
                  <td className="px-4 py-3 align-top">$200K + 12 wks</td>
                  <td className="px-4 py-3 align-top">Manual fallback runbooks</td>
                  <td className="px-4 py-3 align-top"><Pill tone="high">High</Pill></td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 align-top">OpenAI</td>
                  <td className="px-4 py-3 align-top">Embeddings and fallback</td>
                  <td className="px-4 py-3 align-top">1 year</td>
                  <td className="px-4 py-3 align-top">$50K + 6 wks</td>
                  <td className="px-4 py-3 align-top">None</td>
                  <td className="px-4 py-3 align-top"><Pill tone="medium">Medium</Pill></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">Pinecone</td>
                  <td className="px-4 py-3 align-top">Vector database</td>
                  <td className="px-4 py-3 align-top">1 year</td>
                  <td className="px-4 py-3 align-top">$20K + 4 wks</td>
                  <td className="px-4 py-3 align-top">None</td>
                  <td className="px-4 py-3 align-top"><Pill tone="low">Low</Pill></td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 align-top">AWS</td>
                  <td className="px-4 py-3 align-top">Compute and storage</td>
                  <td className="px-4 py-3 align-top">3 years</td>
                  <td className="px-4 py-3 align-top">$100K + 20 wks</td>
                  <td className="px-4 py-3 align-top">None</td>
                  <td className="px-4 py-3 align-top"><Pill tone="medium">Medium</Pill></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">Auth0</td>
                  <td className="px-4 py-3 align-top">Identity provider</td>
                  <td className="px-4 py-3 align-top">2 years</td>
                  <td className="px-4 py-3 align-top">$10K + 4 wks</td>
                  <td className="px-4 py-3 align-top">None</td>
                  <td className="px-4 py-3 align-top"><Pill tone="low">Low</Pill></td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 align-top">Datadog</td>
                  <td className="px-4 py-3 align-top">Observability</td>
                  <td className="px-4 py-3 align-top">1 year</td>
                  <td className="px-4 py-3 align-top">$5K + 2 wks</td>
                  <td className="px-4 py-3 align-top">None</td>
                  <td className="px-4 py-3 align-top"><Pill tone="low">Low</Pill></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            A hidden dependency is the identity provider, Auth0, which is
            not explicitly mentioned in the{" "}
            <Code>LexiFlow_Investor_Deck.pdf</Code> but is listed in{" "}
            <Code>Vendor_Dependencies.xlsx</Code> (Sheet1). The edge case
            that would break the vendor dependency claim is a scenario
            where Anthropic raises prices by 25%, which would result in a
            margin compression risk of 150 bps.
          </p>

          <p>
            <strong>Decision:</strong> Mitigate vendor dependency risk by
            negotiating contractual protections, diversifying vendor
            dependencies, and developing fallback options to reduce
            exposure to Anthropic and other critical vendors.
          </p>
        </section>

        {/* 5. Failure Mode Analysis */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="05" title="5. Failure Mode Analysis" />
          <h3 className="text-xl font-bold text-slate-900">
            5. Failure Mode Analysis
          </h3>
          <p>
            The top 3 production failure modes for Orbital Ops&apos;
            LexiFlow AI are identified through a thorough analysis of the
            system architecture, vendor dependencies, and potential
            triggers.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Failure mode</th>
                  <th className="px-4 py-3 font-semibold">Trigger</th>
                  <th className="px-4 py-3 font-semibold">Technical point</th>
                  <th className="px-4 py-3 font-semibold">Blast radius</th>
                  <th className="px-4 py-3 font-semibold">Existing</th>
                  <th className="px-4 py-3 font-semibold">Needed mitigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 align-top">Shared embeddings infra</td>
                  <td className="px-4 py-3 align-top">Sudden tenant growth</td>
                  <td className="px-4 py-3 align-top">Pinecone vector database</td>
                  <td className="px-4 py-3 align-top">20% ARR, 30% tenants</td>
                  <td className="px-4 py-3 align-top">Partial (manual fallback)</td>
                  <td className="px-4 py-3 align-top">
                    Distributed embeddings (CTO, 12 wks, $200K)
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 align-top">Single model provider</td>
                  <td className="px-4 py-3 align-top">Anthropic disruption</td>
                  <td className="px-4 py-3 align-top">Anthropic API</td>
                  <td className="px-4 py-3 align-top">15% ARR, 20% tenants</td>
                  <td className="px-4 py-3 align-top">No</td>
                  <td className="px-4 py-3 align-top">
                    Vendor diversification (CTO, 8 wks, $100K)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 align-top">Data ownership gaps</td>
                  <td className="px-4 py-3 align-top">Ownership dispute</td>
                  <td className="px-4 py-3 align-top">Vendor_Dependencies.xlsx</td>
                  <td className="px-4 py-3 align-top">10% ARR, 10% tenants</td>
                  <td className="px-4 py-3 align-top">Partial (contractual)</td>
                  <td className="px-4 py-3 align-top">
                    Data governance policies (Counsel, 4 wks, $50K)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            <strong>Decision:</strong> Implement mitigations for the top 3
            failure modes, including a scalable distributed embeddings
            infrastructure, contractual protections and vendor
            diversification, and clear data ownership clauses and data
            governance policies, to reduce the blast radius and ensure the
            continued operation and growth of Orbital Ops&apos; LexiFlow
            AI.
          </p>
        </section>

        {/* 6. Governance Stress Test */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="06" title="6. Governance Stress Test" />
          <h3 className="text-xl font-bold text-slate-900">
            6. Governance Stress Test
          </h3>
          <p>
            The governance posture of Orbital Ops&apos; LexiFlow AI is
            evaluated by stress-testing the controls for logging, access
            control, incident response, model change management, data
            retention, and third-party risk. According to{" "}
            <Code>SOC2_Summary.pdf</Code> (§3), the company has a Type I
            SOC 2 report, but the Type II observation window is still
            open, introducing uncertainty about the effectiveness of
            controls.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Logging and observability" value={3.4} tone="sky" />
            <ScoreBar label="Access controls" value={2.8} tone="amber" />
            <ScoreBar label="Incident response" value={2.6} tone="amber" />
            <ScoreBar label="Model change management" value={3.2} />
            <ScoreBar label="Data retention" value={3.0} tone="sky" />
            <ScoreBar label="Third-party risk" value={2.8} tone="amber" />
          </div>

          <blockquote className="border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3 text-sm italic text-slate-700">
            The IC must hear that the governance controls of Orbital
            Ops&apos; LexiFlow AI are not yet audit-ready, and the company
            must prioritize implementing additional logging and monitoring
            mechanisms to improve auditability and address the significant
            risks introduced by the shared embeddings infrastructure and
            single model provider reliance.
          </blockquote>

          <p>
            <strong>Decision:</strong> The governance controls must be
            patched to improve auditability and address significant risks,
            with a priority on implementing additional logging and
            monitoring mechanisms, and the company must provide a clear
            plan for addressing the lack of clear data ownership clauses
            and the reliance on a single model provider.
          </p>
        </section>

        {/* 7. Production Reality Check */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="07" title="7. Production Reality Check" />
          <h3 className="text-xl font-bold text-slate-900">
            7. Production Reality Check
          </h3>
          <p>
            The production reality of Orbital Ops&apos; LexiFlow AI is
            evaluated by analyzing the scale ceiling, cost-per-inference,
            and reliability. According to{" "}
            <Code>LexiFlow_Investor_Deck.pdf</Code> (p.21), the company has
            an ARR of $14.2M at 128% NDR, with a gross margin of 71%.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Metric</th>
                  <th className="px-4 py-3 font-semibold">Current</th>
                  <th className="px-4 py-3 font-semibold">3x scale</th>
                  <th className="px-4 py-3 font-semibold">10x scale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3">Cost-per-inference</td>
                  <td className="px-4 py-3">$0.05</td>
                  <td className="px-4 py-3">$0.10</td>
                  <td className="px-4 py-3">$0.25</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3">Model serving costs</td>
                  <td className="px-4 py-3">$100K/mo</td>
                  <td className="px-4 py-3">$200K/mo</td>
                  <td className="px-4 py-3">$500K/mo</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Data storage costs</td>
                  <td className="px-4 py-3">$50K/mo</td>
                  <td className="px-4 py-3">$100K/mo</td>
                  <td className="px-4 py-3">$200K/mo</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3">Tenant growth rate</td>
                  <td className="px-4 py-3">10%/mo</td>
                  <td className="px-4 py-3">20%/mo</td>
                  <td className="px-4 py-3">50%/mo</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Model update frequency</td>
                  <td className="px-4 py-3">2/wk</td>
                  <td className="px-4 py-3">5/wk</td>
                  <td className="px-4 py-3">10/wk</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            <strong>Decision:</strong> Implement cost optimization and
            reliability measures to support 3x scale, including model
            serving cost reduction, data storage cost optimization, and
            tenant growth rate management, to ensure the continued
            operation and growth of Orbital Ops&apos; LexiFlow AI.
          </p>
        </section>

        {/* 8. Score Decomposition */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="08" title="8. Score Decomposition" />
          <h3 className="text-xl font-bold text-slate-900">
            8. Score Decomposition
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <ScoreBar label="Product credibility" value={3.6} />
            <ScoreBar label="Tooling exposure" value={2.4} tone="amber" />
            <ScoreBar label="Data sensitivity" value={2.7} tone="amber" />
            <ScoreBar label="Governance safety" value={3.0} tone="sky" />
            <ScoreBar label="Production readiness" value={3.2} />
            <ScoreBar label="Open validation" value={3.4} tone="sky" />
          </div>

          <p>
            Each score is evidence-anchored. To move product credibility
            +1.0 would require a detailed benchmarking report
            (<Code>Model_Benchmarking_Report.pdf</Code>); tooling exposure
            would require a contract with a secondary foundation-model
            provider; data sensitivity would require a detailed data
            governance policy (<Code>Data_Governance_Policy.pdf</Code>);
            governance safety would require a completed Type II SOC 2
            report and incident response plan
            (<Code>Incident_Response_Plan.pdf</Code>); production
            readiness would require a scalability plan
            (<Code>Scalability_Plan.pdf</Code>); and open validation would
            require a detailed testing and validation plan
            (<Code>Testing_and_Validation_Plan.pdf</Code>).
          </p>

          <p>
            <strong>Decision:</strong> Implement specific changes to
            address the gaps in product credibility, tooling exposure,
            data sensitivity, governance safety, production readiness,
            and open validation, including providing detailed benchmarking
            reports, diversifying vendor base, implementing robust data
            handling and storage practices, and providing evidence of
            more robust governance and validation practices.
          </p>
        </section>

        {/* 9. So What — Investment Impact */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="09" title="9. So What — Investment Impact" />
          <h3 className="text-xl font-bold text-slate-900">
            9. So What — Investment Impact
          </h3>
          <p>
            The findings of this report have significant implications for
            the investment in Orbital Ops. The shared embeddings
            infrastructure and single model provider reliance introduce a
            quantified blast radius of 20% of ARR, affecting approximately
            30% of tenants. This risk can be mitigated by implementing a
            scalable distributed embeddings infrastructure, with a
            projected cost of $200K and an effort of 12 weeks.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Scenario</th>
                  <th className="px-4 py-3 font-semibold">Key assumption</th>
                  <th className="px-4 py-3 font-semibold">Revenue</th>
                  <th className="px-4 py-3 font-semibold">Multiple</th>
                  <th className="px-4 py-3 font-semibold">Probability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3">Base</td>
                  <td className="px-4 py-3">Shared embeddings scales</td>
                  <td className="px-4 py-3">10%</td>
                  <td className="px-4 py-3">15%</td>
                  <td className="px-4 py-3">40%</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3">Bull</td>
                  <td className="px-4 py-3">Distributed embeddings ship</td>
                  <td className="px-4 py-3">20%</td>
                  <td className="px-4 py-3">25%</td>
                  <td className="px-4 py-3">30%</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Bear</td>
                  <td className="px-4 py-3">Sudden tenant growth</td>
                  <td className="px-4 py-3">-20%</td>
                  <td className="px-4 py-3">-30%</td>
                  <td className="px-4 py-3">30%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            <strong>Next steps:</strong> Require Orbital Ops to implement a
            scalable distributed embeddings infrastructure, diversify
            vendor dependencies, and provide clear data ownership clauses
            to mitigate the quantified blast radius and limit scale, and
            adjust commercial terms accordingly to reflect the reduced
            confidence in the company&apos;s position.
          </p>
        </section>

        {/* 10. Evidence Gaps */}
        <section className="mt-12 space-y-4 text-[15px] leading-7 text-slate-700">
          <SectionEyebrow n="10" title="10. Evidence Gaps" />
          <h3 className="text-xl font-bold text-slate-900">
            10. Evidence Gaps
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Artifact</th>
                  <th className="px-4 py-3 font-semibold">Affected sections</th>
                  <th className="px-4 py-3 font-semibold">Confidence lift</th>
                  <th className="px-4 py-3 font-semibold">Obtainability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3">DPIA (Data Protection Impact Assessment)</td>
                  <td className="px-4 py-3">Data Sensitivity, Governance Safety</td>
                  <td className="px-4 py-3">+2 points</td>
                  <td className="px-4 py-3">Pre-signing</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3">Independent Tenant Isolation Assessment</td>
                  <td className="px-4 py-3">Data Sensitivity, Production Readiness</td>
                  <td className="px-4 py-3">+1.5 points</td>
                  <td className="px-4 py-3">Pre-signing</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Multi-Provider Contractual Commitments</td>
                  <td className="px-4 py-3">Tooling Exposure, Production Readiness</td>
                  <td className="px-4 py-3">+1.5 points</td>
                  <td className="px-4 py-3">Pre-signing</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3">Type II SOC 2 Report</td>
                  <td className="px-4 py-3">Governance Safety, Production Readiness</td>
                  <td className="px-4 py-3">+2 points</td>
                  <td className="px-4 py-3">Post-close</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Cost-per-Inference Breakdown</td>
                  <td className="px-4 py-3">Production Readiness, Unit Economics</td>
                  <td className="px-4 py-3">+1 point</td>
                  <td className="px-4 py-3">Pre-signing</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3">Prior Post-Mortems for Cross-Tenant Exposure</td>
                  <td className="px-4 py-3">Data Sensitivity, Governance Safety</td>
                  <td className="px-4 py-3">+1 point</td>
                  <td className="px-4 py-3">Pre-signing</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Training-Data Provenance for Fine-Tuned Models</td>
                  <td className="px-4 py-3">Data Sensitivity, AI Credibility</td>
                  <td className="px-4 py-3">+1 point</td>
                  <td className="px-4 py-3">Pre-signing</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            <strong>Decision:</strong> Request the missing artifacts,
            particularly the DPIA, Independent Tenant Isolation
            Assessment, and Multi-Provider Contractual Commitments, to
            uplift confidence in the Data Sensitivity, Governance Safety,
            and Production Readiness sections, and adjust deal terms
            accordingly to reflect the reduced risk.
          </p>
        </section>

        {/* Final position */}
        <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-slate-100 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300">
            Final Position
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-400">
                Classification
              </dt>
              <dd className="mt-0.5 text-lg font-bold">PARTIAL</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-400">
                Conviction
              </dt>
              <dd className="mt-0.5 text-lg font-bold">72 / 100</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-400">
                Timing
              </dt>
              <dd className="mt-0.5 text-lg font-bold">Headwind</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-slate-400">
                Operator Dependency
              </dt>
              <dd className="mt-0.5 text-lg font-bold">Fragile</dd>
            </div>
          </dl>
          <div className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-slate-200">
            <p>
              <strong className="text-white">Primary driver:</strong> The
              company&apos;s inability to demonstrate scalable and secure
              data handling practices, particularly with regards to tenant
              isolation and data ownership, introduces significant risks
              that must be addressed.
            </p>
            <p className="mt-3">
              <strong className="text-white">Failure trigger:</strong> A
              data breach or regulatory non-compliance event that exposes
              the company&apos;s inadequate data handling practices,
              resulting in a loss of customer trust and revenue.
            </p>
          </div>
        </section>

        <div className="mt-12 flex justify-between border-t border-slate-200 pt-6 text-xs text-slate-500">
          <span>Company Readiness Report — Orbital Ops</span>
          <span>Generated by Kaptrix</span>
        </div>

        <div className="mt-8 flex justify-center print-hide">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to home
          </Link>
        </div>
      </article>
    </div>
  );
}
