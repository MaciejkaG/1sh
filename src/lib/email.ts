import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@1sh.pl";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://1sh.pl";

export async function sendLinkDeletedEmail(to: string, slug: string, reason?: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your 1sh.pl link was removed",
      html: `
        <p>Hi,</p>
        <p>Your short link <strong>1sh.pl/${slug}</strong> has been removed by a 1sh moderator.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ""}
        <p>If you believe this was a mistake, please contact support.</p>
        <p>— The 1sh.pl team</p>
      `,
    });
  } catch { /* fire-and-forget */ }
}

export async function sendLinkBlacklistedEmail(to: string, slug: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your 1sh.pl link has been flagged",
      html: `
        <p>Hi,</p>
        <p>Your short link <strong>1sh.pl/${slug}</strong> has been flagged because its destination violates our policies.</p>
        <p>The link has been removed from your dashboard. Visitors clicking it will see a safety warning instead of being redirected.</p>
        <p>If you believe this is an error, please contact support.</p>
        <p>— The 1sh.pl team</p>
      `,
    });
  } catch { /* fire-and-forget */ }
}

export async function sendAccountBannedEmail(to: string, reason?: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your 1sh.pl account has been suspended",
      html: `
        <p>Hi,</p>
        <p>Your 1sh.pl account has been suspended due to a violation of our terms of service.</p>
        ${reason ? `<p>Reason: ${reason}</p>` : ""}
        <p>If you believe this was a mistake, please contact support.</p>
        <p>— The 1sh.pl team</p>
      `,
    });
  } catch { /* fire-and-forget */ }
}

export async function sendAccountUnbannedEmail(to: string) {
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your 1sh.pl account has been reinstated",
      html: `
        <p>Hi,</p>
        <p>Your 1sh.pl account suspension has been lifted. You can now sign in at <a href="${APP_URL}">${APP_URL}</a>.</p>
        <p>— The 1sh.pl team</p>
      `,
    });
  } catch { /* fire-and-forget */ }
}
