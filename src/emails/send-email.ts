import { env } from "../utils/load-env-variables.js";
import sgMail from "@sendgrid/mail";

export async function sendEmail(
  emailAddress: string,
  subject: string,
  textOutput: string,
  htmlOutput: string
) {
  const msg = {
    to: emailAddress,
    from: env.SENDGRID_EMAIL_ADDRESS, // must be an email address verified with your sendgrid account
    subject,
    text: textOutput,
    html: htmlOutput,
  };
  await sgMail.send(msg);
  console.log(`Email sent to ${emailAddress}`);
}
