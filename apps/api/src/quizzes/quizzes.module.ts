import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { StudentQuizService } from './student-quiz.service';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [CertificatesModule],
  controllers: [QuizzesController],
  providers: [QuizzesService, StudentQuizService],
  exports: [QuizzesService, StudentQuizService],
})
export class QuizzesModule {}
