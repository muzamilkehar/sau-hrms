import { Resend } from "resend";
import { getEnv } from "@/lib/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Sends through Resend. Without RESEND_API_KEY (local development) the message is printed to the terminal instead. */
export async function sendEmail(message: OutgoingEmail): Promise<void> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    // eslint-disable-next-line no-console
    console.log(`\n[email:dev] To: ${message.to}\n[email:dev] Subject: ${message.subject}\n${message.text}\n`);
    return;
  }
  const { error } = await new Resend(env.RESEND_API_KEY).emails.send({ from: env.EMAIL_FROM, to: message.to, subject: message.subject, html: message.html, text: message.text });
  if (error) throw new Error(error.message);
}
