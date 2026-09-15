import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { EmailAdapterInterface, EmailOptions } from '../interfaces/email-adapter.interface';

@Injectable()
export class MailpitAdapter implements EmailAdapterInterface {
  private readonly logger = new Logger(MailpitAdapter.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST', 'localhost'),
      port: this.config.get<number>('SMTP_PORT', 1025),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      ignoreTLS: true,
    });

    const fromName = this.config.get<string>('SMTP_FROM_NAME', 'Compliance Training');
    const fromEmail = this.config.get<string>('SMTP_FROM', 'noreply@compliance.local');
    this.from = `${fromName} <${fromEmail}>`;
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}: ${String(error)}`);
      throw error;
    }
  }
}
