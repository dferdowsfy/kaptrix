"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentProps } from "react";

/**
 * ChatMarkdown — renders assistant replies from the Kaptrix chat
 * assistant with consistent, beautiful Tailwind styling inside the
 * slate-themed bubble.
 *
 * We use explicit element renderers instead of `prose` so this works
 * regardless of whether the tailwindcss/typography plugin is present.
 */
export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="chat-md text-[15px] leading-relaxed text-slate-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => (
            <p className="mb-2 last:mb-0 [&:not(:first-child)]:mt-2" {...props} />
          ),
          strong: (props) => (
            <strong className="font-semibold text-white" {...props} />
          ),
          em: (props) => <em className="italic text-slate-200" {...props} />,
          ul: (props) => (
            <ul className="my-2 list-disc space-y-1 pl-5 marker:text-indigo-400" {...props} />
          ),
          ol: (props) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-indigo-400" {...props} />
          ),
          li: (props) => <li className="pl-1" {...props} />,
          h1: (props) => (
            <h3 className="mt-3 mb-1 text-base font-semibold text-white" {...props} />
          ),
          h2: (props) => (
            <h3 className="mt-3 mb-1 text-base font-semibold text-white" {...props} />
          ),
          h3: (props) => (
            <h3 className="mt-3 mb-1 text-sm font-semibold uppercase tracking-wide text-indigo-300" {...props} />
          ),
          h4: (props) => (
            <h4 className="mt-2 mb-1 text-sm font-semibold text-slate-200" {...props} />
          ),
          a: (props) => (
            <a
              className="text-indigo-300 underline decoration-indigo-400/60 underline-offset-2 hover:text-indigo-200"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          code: (props: ComponentProps<"code"> & { inline?: boolean }) => {
            const { inline, className, children, ...rest } = props;
            if (inline) {
              return (
                <code
                  className="rounded bg-slate-900/80 px-1 py-0.5 font-mono text-[0.85em] text-indigo-200 ring-1 ring-slate-700"
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              className="my-2 overflow-x-auto rounded-lg border border-slate-700/70 bg-slate-950/80 p-3 text-[13px] leading-snug"
              {...props}
            />
          ),
          blockquote: (props) => (
            <blockquote
              className="my-2 border-l-2 border-indigo-500/60 pl-3 text-slate-300"
              {...props}
            />
          ),
          hr: () => <hr className="my-3 border-slate-700/70" />,
          table: (props) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-slate-700/60">
              <table className="w-full border-collapse text-[13px]" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-slate-800/80" {...props} />,
          th: (props) => (
            <th
              className="border-b border-slate-700/60 px-3 py-1.5 text-left font-semibold text-slate-200"
              {...props}
            />
          ),
          td: (props) => (
            <td
              className="border-b border-slate-800/70 px-3 py-1.5 align-top text-slate-200 last:border-b-0"
              {...props}
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
