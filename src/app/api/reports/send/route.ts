import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const FROM_ADDRESS = "Kaptrix <hello@kaptrix.com>";

export async function POST(request: Request) {
  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Input ---
  let body: {
    to: string;
    reportTitle: string;
    reportHtml: string;
    target: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { to, reportTitle, reportHtml, target } = body;

  if (!to || !reportTitle || !reportHtml) {
    return NextResponse.json(
      { error: "Missing required fields: to, reportTitle, reportHtml" },
      { status: 400 },
    );
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 },
    );
  }

  // --- Resend ---
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email sending is not configured" },
      { status: 503 },
    );
  }

  const resend = new Resend(apiKey);

  // Build sender name from user metadata
  const fullName =
    (user.user_metadata?.full_name as string) ||
    user.email?.split("@")[0] ||
    "A team member";

  const subject = `${fullName} - ${reportTitle}`;

  const html = buildEmailHtml({
    senderName: fullName,
    reportTitle,
    target: target || "",
    reportBody: reportHtml,
  });

  try {
    const { error: sendError } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    });

    if (sendError) {
      console.error("[send-report] Resend error:", sendError);
      return NextResponse.json(
        { error: sendError.message || "Failed to send email" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-report] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------
// Email HTML builder — wraps the export HTML in branded chrome
// ---------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(args: {
  senderName: string;
  reportTitle: string;
  target: string;
  reportBody: string;
}): string {
  const targetLine = args.target
    ? `<p style="margin:0 0 4px; font-size:13px; color:#6b7280;">Target: ${escapeHtml(args.target)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(args.reportTitle)}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <!-- Header -->
  <tr>
    <td style="background: linear-gradient(135deg, #1B1F4A 0%, #0D1033 50%, #0A0B1F 100%); padding:32px 40px; text-align:left;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle; padding-right:12px;">
            <img src="https://kaptrix.com/kaptrix-logo.png" width="32" height="32" alt="Kaptrix" style="display:block; width:32px; height:32px; border:0; outline:none; text-decoration:none; border-radius:8px;" />
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:18px; font-weight:900; letter-spacing:0.22em; color:#ffffff; text-transform:uppercase;">KAPTRIX</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Meta -->
  <tr>
    <td style="padding:28px 40px 0;">
      <p style="margin:0 0 4px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.18em; color:#6366f1;">Report</p>
      <h1 style="margin:0 0 6px; font-size:22px; font-weight:700; color:#0A0B1F; line-height:1.3;">
        ${escapeHtml(args.reportTitle)}
      </h1>
      ${targetLine}
      <p style="margin:0; font-size:13px; color:#9ca3af;">
        Shared by ${escapeHtml(args.senderName)}
      </p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin:20px 0 0;" />
    </td>
  </tr>

  <!-- Report body -->
  <tr>
    <td style="padding:20px 40px 40px;">
      <style>
        .report-body h1 { font-size: 18px; margin: 18px 0 6px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #0f172a; }
        .report-body h2 { font-size: 15px; margin: 16px 0 6px 0; color: #0f172a; }
        .report-body h3 { font-size: 13px; margin: 12px 0 4px 0; border-left: 3px solid #6366f1; padding-left: 8px; color: #0f172a; }
        .report-body h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; margin: 10px 0 3px 0; }
        .report-body p { font-size: 14px; margin: 0 0 8px 0; line-height: 1.6; color: #334155; }
        .report-body ul, .report-body ol { font-size: 14px; margin: 0 0 10px 22px; padding: 0; color: #334155; }
        .report-body li { margin-bottom: 3px; line-height: 1.55; }
        .report-body strong { font-weight: 700; color: #0f172a; }
        .report-body code { font-family: monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
        .report-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
        .report-body blockquote { border-left: 4px solid #6366f1; background: #eef2ff; margin: 10px 0; padding: 8px 12px; border-radius: 4px; }
        .report-body blockquote p { font-size: 14px; margin: 0 0 4px 0; }
        .report-body .pill { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 2px; }
        .report-body .report-table { width: 100%; border-collapse: collapse; margin: 8px 0 14px 0; font-size: 13px; }
        .report-body .report-table th { background: #0f172a; color: #fff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 8px; font-weight: 600; }
        .report-body .report-table td { padding: 6px 8px; border-top: 1px solid #f1f5f9; vertical-align: top; }
        .report-body .report-table tbody tr:nth-child(even) td { background: #f8fafc; }
        .report-body .section .eyebrow { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #4f46e5; margin: 0 0 2px 0; }
      </style>
      <div class="report-body">
        ${args.reportBody}
      </div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 40px; background-color:#f9fafb; border-top:1px solid #e5e7eb;">
      <p style="margin:0; font-size:11px; line-height:1.6; color:#9ca3af; text-align:center;">
        This report was generated on and shared via Kaptrix.<br />
        Kaptrix is an advisory and technology practice. Not investment advice.
      </p>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}
