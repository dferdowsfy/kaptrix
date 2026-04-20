import type { Metadata } from "next";
import Link from "next/link";
import { PublicHeader } from "@/components/home/public-header";
import { Logo } from "@/components/home/logo";

export const metadata: Metadata = {
  title: "Contact — Kaptrix",
  description: "Discuss an engagement with Kaptrix.",
};

const CONTACT_EMAIL = "hello@kaptrix.com";

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const intent = params.intent;
  const subject = intent === "sample" ? "Sample report request" : "Engagement inquiry";
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

  return (
    <div className="min-h-screen bg-white text-[#0B0B1A]">
      <PublicHeader />

      <main className="mx-auto max-w-3xl px-6 py-32">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#6B5BFF]">
          Contact
        </p>
        <h1 className="mt-4 text-4xl font-normal leading-[1.1] tracking-tight sm:text-5xl">
          {intent === "sample"
            ? "Request a sample report."
            : "Discuss an engagement."}
        </h1>
        <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">
          {intent === "sample"
            ? "Tell us your firm and the kind of deal you're looking at. We'll send a redacted sample of a Master Diligence Report and IC memo."
            : "Tell us about the deal — sector, stage, timeline. We'll respond within one business day with next steps and a proposed scope."}
        </p>

        <div className="mt-10 rounded-md border border-[#E5E7EB] bg-[#FAFAFA] p-6 text-sm leading-6 text-slate-700">
          <p>
            Email us directly at{" "}
            <a
              href={mailto}
              className="font-medium text-[#0B0B1A] underline underline-offset-2 hover:text-[#6B5BFF]"
            >
              {CONTACT_EMAIL}
            </a>
            . Include your name, firm, and a one-line context for the
            conversation.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href={mailto}
            className="inline-flex items-center justify-center rounded-md bg-[#0B0B1A] px-6 py-3 text-base font-medium text-white transition hover:bg-[#1F1F2E]"
          >
            {intent === "sample" ? "Email for sample" : "Start the conversation"}
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-[#E5E7EB] bg-white px-6 py-3 text-base font-medium text-[#0B0B1A] transition hover:bg-[#F9FAFB]"
          >
            Back to home
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-slate-500">
          <Logo wordClassName="text-sm text-[#0B0B1A]" markClassName="h-5 w-5" />
          <p>© {new Date().getFullYear()} Kaptrix</p>
        </div>
      </footer>
    </div>
  );
}
