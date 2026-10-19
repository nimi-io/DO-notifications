import { Resend } from 'resend';

let client;
const getClient = (config) => (client ??= new Resend(config.resendApiKey));

/** Sends one message to the whole list, or one per recipient when SEND_SEPARATELY=true. */
export async function sendMail(config, { subject, html, text, attachments = [] }) {
  const { from, to, cc, bcc, replyTo, sendSeparately } = config.mail;
  const files = attachments.map((a) => ({
    filename: a.filename,
    // Resend reads string content as base64, so encode everything explicitly (the CSV is plain text).
    content: Buffer.from(a.content).toString('base64'),
    contentType: a.contentType,
    contentId: a.cid,
  }));

  const messages = sendSeparately
    ? to.map((addr) => ({ to: [addr] }))
    : [{ to, cc: cc.length ? cc : undefined, bcc: bcc.length ? bcc : undefined }];

  const results = [];
  for (const recipients of messages) {
    const { data, error } = await getClient(config).emails.send({
      from,
      ...recipients,
      replyTo: replyTo || undefined,
      subject,
      html,
      text,
      attachments: files,
    });
    if (error) throw new Error(`Resend rejected the email to ${recipients.to.join(', ')}: ${error.message}`);
    results.push({ to: recipients.to, id: data.id });
  }
  return results;
}
