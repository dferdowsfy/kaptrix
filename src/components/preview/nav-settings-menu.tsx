"use client";

import { useEffect, useRef, useState } from "react";
import { PREVIEW_TABS } from "@/lib/preview-tabs";
import { useNavVisibility, type NavTabId } from "@/hooks/use-nav-visibility";

export function NavSettingsMenu() {
  const { hidden, toggleTab, resetAll, alwaysVisible } = useNavVisibility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const hiddenCount = hidden.length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Customize top navigation"
        title="Customize top navigation"
      >
        <GearIcon className="h-3.5 w-3.5" />
        Customize
        {hiddenCount > 0 && (
          <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">
            {hiddenCount} hidden
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-900">
              Show / hide pages
            </p>
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
              >
                Reset
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Hidden pages disappear from the top nav. Home and Overview stay
            visible. Navigation layout rebalances automatically.
          </p>
          <ul className="mt-3 space-y-1">
            {PREVIEW_TABS.map((tab) => {
              const locked = alwaysVisible.includes(tab.id as NavTabId);
              const isHidden = hidden.includes(tab.id as NavTabId);
              return (
                <li key={tab.id}>
                  <label
                    className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                      locked
                        ? "text-slate-400"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <Switch
                      checked={!isHidden}
                      disabled={locked}
                      onChange={() => toggleTab(tab.id as NavTabId)}
                      label={`Show ${tab.label}`}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onChange();
      }}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
        disabled
          ? "bg-slate-200"
          : checked
            ? "bg-indigo-600"
            : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 01.96.73l.37 1.32a6 6 0 011.67.96l1.3-.44a1 1 0 011.22.43l1 1.73a1 1 0 01-.2 1.27l-1 .9a6 6 0 010 1.94l1 .9a1 1 0 01.2 1.27l-1 1.73a1 1 0 01-1.22.43l-1.3-.44a6 6 0 01-1.67.96l-.37 1.32a1 1 0 01-.96.73h-2a1 1 0 01-.96-.73l-.37-1.32a6 6 0 01-1.67-.96l-1.3.44a1 1 0 01-1.22-.43l-1-1.73a1 1 0 01.2-1.27l1-.9a6 6 0 010-1.94l-1-.9a1 1 0 01-.2-1.27l1-1.73a1 1 0 011.22-.43l1.3.44a6 6 0 011.67-.96l.37-1.32A1 1 0 018 2h2zm-1 5a3 3 0 100 6 3 3 0 000-6z"
        clipRule="evenodd"
      />
    </svg>
  );
}
