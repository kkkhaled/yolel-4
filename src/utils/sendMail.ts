import * as nodemailer from 'nodemailer';

export class MailUtils {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async sendVerificationCode(email: string, code: number): Promise<void> {
    await this.transporter.sendMail({
      from: process.env.APP_EMAIL,
      to: email,
      subject: 'Verification Code',
      html: `
        <h1>Verification Code</h1>
        <p>Your verification code is: ${code}</p>
        <p>Please use this code to verify your account.</p>
      `,
    });
  }
}
