import sgMail from '@sendgrid/mail';
import config from '../config/configLocal';

sgMail.setApiKey(String(config.SENDGRID_API_KEY)); // Set your SendGrid API key

interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  text: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  const msg = {
    to: options.to,
    from: options.from,
    subject: options.subject,
    text: options.text,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export default sendEmail;