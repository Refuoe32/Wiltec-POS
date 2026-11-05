import nodemailer from 'nodemailer';
import { route, MGR, fail } from '@/lib/api';
import { q } from '@/lib/db';
// Sends an email through your SMTP account (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM). Without SMTP settings the page offers "open in my email app".
export const GET = route(MGR, async () => ({ configured: !!process.env.SMTP_HOST, from: process.env.SMTP_FROM || process.env.SMTP_USER || '' }));
export const POST = route(MGR, async ({ s, body: b }) => {
  const to = String(b.to || '').split(/[,;\s]+/).filter(Boolean);
  if (!to.length || to.some(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))) fail('Enter one or more valid email addresses');
  if (!(b.subject || '').trim() || !(b.message || '').trim()) fail('Enter a subject and a message');
  if (!process.env.SMTP_HOST) return { configured: false };
  const [biz] = await q("select value from settings where key='business_name'");
  const transport = process.env.SMTP_HOST === 'json-test' ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
  await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'pos@localhost', to, subject: b.subject.trim(), text: `${b.message.trim()}\n\n--\n${biz?.value || 'WilTec Solutions'}` });
  await q(`insert into audit_log(user_id,action,entity,details) values($1,'email.sent','email',$2)`, [s.id, JSON.stringify({ to, subject: b.subject.slice(0, 100) })]);
  return { configured: true, sent: to.length };
});
