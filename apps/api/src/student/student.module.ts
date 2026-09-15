import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { TrailsModule } from '../trails/trails.module';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [QuizzesModule, CertificatesModule, TrailsModule, AnnouncementsModule, NotificationsModule],
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}
