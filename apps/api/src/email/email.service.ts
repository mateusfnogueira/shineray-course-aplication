import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmailAdapterInterface } from './interfaces/email-adapter.interface';
import { EMAIL_ADAPTER } from './email.constants';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(EMAIL_ADAPTER) private readonly adapter: EmailAdapterInterface,
  ) {}

  async sendActivationEmail(
    to: string,
    name: string,
    activationUrl: string,
  ): Promise<void> {
    this.logger.log(`Sending activation email to ${to}`);
    await this.adapter.send({
      to,
      subject: 'Bem-vindo! Ative sua conta',
      html: this.activationTemplate(name, activationUrl),
    });
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
    this.logger.log(`Sending password reset email to ${to}`);
    await this.adapter.send({
      to,
      subject: 'Redefinição de senha',
      html: this.passwordResetTemplate(name, resetUrl),
    });
  }

  async sendPasswordChanged(to: string, name: string): Promise<void> {
    this.logger.log(`Sending password changed notification to ${to}`);
    await this.adapter.send({
      to,
      subject: 'Senha alterada com sucesso',
      html: this.passwordChangedTemplate(name),
    });
  }

  private activationTemplate(name: string, activationUrl: string): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Ative sua conta</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111">
  <h2 style="margin-bottom:8px">Bem-vindo, ${this.escapeHtml(name)}!</h2>
  <p>Sua conta na Plataforma de Treinamentos foi criada. Para ativá-la e definir sua senha, clique no botão abaixo:</p>
  <a href="${activationUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-size:15px;margin:16px 0">
    Ativar Conta
  </a>
  <p style="color:#555;font-size:13px">Este link expira em 48 horas. Se você não solicitou este cadastro, ignore este e-mail.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:12px">Compliance Training Platform</p>
</body>
</html>`;
  }

  private passwordResetTemplate(name: string, resetUrl: string): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Redefinição de senha</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111">
  <h2 style="margin-bottom:8px">Olá, ${this.escapeHtml(name)}</h2>
  <p>Recebemos uma solicitação de redefinição de senha para a sua conta. Clique no botão abaixo para criar uma nova senha:</p>
  <a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-size:15px;margin:16px 0">
    Redefinir Senha
  </a>
  <p style="color:#555;font-size:13px">Este link expira em 2 horas e é de uso único. Se você não solicitou a redefinição, ignore este e-mail. Sua senha não será alterada.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:12px">Compliance Training Platform</p>
</body>
</html>`;
  }

  private passwordChangedTemplate(name: string): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Senha alterada</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111">
  <h2 style="margin-bottom:8px">Olá, ${this.escapeHtml(name)}</h2>
  <p>Sua senha foi alterada com sucesso.</p>
  <p style="color:#555;font-size:13px">Se você não realizou esta alteração, entre em contato com o administrador imediatamente.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="color:#999;font-size:12px">Compliance Training Platform</p>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
