import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { MailpitAdapter } from './adapters/mailpit.adapter';
import { EMAIL_ADAPTER } from './email.constants';

export { EMAIL_ADAPTER } from './email.constants';

@Module({
  providers: [
    {
      provide: EMAIL_ADAPTER,
      useFactory: (config: ConfigService) => new MailpitAdapter(config),
      inject: [ConfigService],
    },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}
