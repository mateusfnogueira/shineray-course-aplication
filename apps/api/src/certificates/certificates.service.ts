import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from './pdf.service';
import { StorageService } from '../storage/storage.service';
import type { CertificateResponseDto, PublicCertificateDto } from './dto/certificate.dto';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  // ─── Generation ───────────────────────────────────────────────────────────

  /**
   * Generate certificate for a completed enrollment.
   * Idempotent: returns existing certificate if already generated.
   * Call this after marking an enrollment as COMPLETED.
   */
  async generateForEnrollment(enrollmentId: string): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, status: 'COMPLETED' },
      include: {
        user: { select: { name: true } },
        course: {
          select: {
            title: true,
            estimatedDurationMinutes: true,
            certificateEnabled: true,
          },
        },
      },
    });

    if (!enrollment) return;
    if (!enrollment.course.certificateEnabled) return;

    // Idempotent — skip if certificate already exists
    const existing = await this.prisma.certificate.findFirst({ where: { enrollmentId } });
    if (existing) return;

    // Get store name via user
    const user = await this.prisma.user.findFirst({
      where: { id: enrollment.userId },
      include: { store: { select: { name: true } } },
    });

    const certificateCode = await this.generateUniqueCode();
    const courseHours = Math.max(1, Math.ceil(enrollment.course.estimatedDurationMinutes / 60));

    const certificate = await this.prisma.certificate.create({
      data: {
        enrollmentId,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        certificateCode,
        issuedAt: new Date(),
      },
    });

    const appUrl = this.config.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const validationUrl = `${appUrl}/certificate/validate/${certificateCode}`;

    try {
      const pdfBuffer = await this.pdfService.generateCertificate({
        studentName: enrollment.user.name,
        courseName: enrollment.course.title,
        storeName: user?.store?.name ?? null,
        courseHours,
        completedAt: enrollment.completedAt ?? new Date(),
        certificateCode,
        validationUrl,
      });

      const fileUrl = await this.storageService.upload(
        'certificates',
        pdfBuffer,
        `${certificateCode}.pdf`,
        'application/pdf',
      );

      await this.prisma.certificate.update({
        where: { id: certificate.id },
        data: { fileUrl },
      });

      this.logger.log(`Certificate generated: ${certificateCode} for enrollment ${enrollmentId}`);
    } catch (err) {
      this.logger.error(`PDF generation failed for ${certificateCode}:`, err);
      // Certificate record remains, fileUrl stays null — can be retried via reissue
    }

    await this.writeAuditLog(enrollment.userId, 'CERTIFICATE_ISSUED', certificate.id, {
      certificateCode,
    });
  }

  // ─── Public validation ────────────────────────────────────────────────────

  async validateByCode(code: string): Promise<PublicCertificateDto> {
    const cert = await this.prisma.certificate.findFirst({
      where: { certificateCode: code },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    if (!cert) throw new NotFoundException('Certificado não encontrado');

    const status = this.getStatus(cert.revokedAt, cert.expiresAt);

    // Show only first name + last initial for privacy
    const nameParts = cert.user.name.trim().split(' ');
    const displayName =
      nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1]![0]}.`
        : nameParts[0] ?? '';

    return {
      certificateCode: cert.certificateCode,
      courseName: cert.course.title,
      studentDisplayName: displayName,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      status,
    };
  }

  // ─── Student endpoints ────────────────────────────────────────────────────

  async listByUser(userId: string): Promise<CertificateResponseDto[]> {
    const certs = await this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: { select: { title: true, estimatedDurationMinutes: true } },
        user: { select: { name: true, store: { select: { name: true } } } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return certs.map((c) => this.toCertificateDto(c));
  }

  async getByIdForUser(id: string, userId: string): Promise<CertificateResponseDto> {
    const cert = await this.prisma.certificate.findFirst({
      where: { id, userId },
      include: {
        course: { select: { title: true, estimatedDurationMinutes: true } },
        user: { select: { name: true, store: { select: { name: true } } } },
      },
    });

    if (!cert) throw new NotFoundException('Certificado não encontrado');
    return this.toCertificateDto(cert);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  async listByEnrollmentOrUser(filter: { enrollmentId?: string; userId?: string }): Promise<CertificateResponseDto[]> {
    const certs = await this.prisma.certificate.findMany({
      where: {
        ...(filter.enrollmentId && { enrollmentId: filter.enrollmentId }),
        ...(filter.userId && { userId: filter.userId }),
      },
      include: {
        course: { select: { title: true, estimatedDurationMinutes: true } },
        user: { select: { name: true, store: { select: { name: true } } } },
      },
      orderBy: { issuedAt: 'desc' },
    });
    return certs.map((c) => this.toCertificateDto(c));
  }

  async reissue(enrollmentId: string, actorId: string): Promise<CertificateResponseDto> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, status: 'COMPLETED' },
    });
    if (!enrollment) throw new NotFoundException('Matrícula concluída não encontrada');

    // Revoke existing (if any) and generate new
    await this.prisma.certificate.updateMany({
      where: { enrollmentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Force regenerate
    await this.generateForEnrollment(enrollmentId);

    const cert = await this.prisma.certificate.findFirst({
      where: { enrollmentId, revokedAt: null },
      include: {
        course: { select: { title: true, estimatedDurationMinutes: true } },
        user: { select: { name: true, store: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!cert) throw new ConflictException('Falha ao reemitir certificado');

    await this.writeAuditLog(actorId, 'CERTIFICATE_REISSUED', cert.id, {
      enrollmentId,
    });

    this.logger.log(`Certificate reissued for enrollment ${enrollmentId} by ${actorId}`);
    return this.toCertificateDto(cert);
  }

  async revoke(certificateId: string, actorId: string): Promise<CertificateResponseDto> {
    const cert = await this.prisma.certificate.findFirst({
      where: { id: certificateId },
    });
    if (!cert) throw new NotFoundException('Certificado não encontrado');
    if (cert.revokedAt) throw new ConflictException('Certificado já foi revogado');

    const revoked = await this.prisma.certificate.update({
      where: { id: certificateId },
      data: { revokedAt: new Date() },
      include: {
        course: { select: { title: true, estimatedDurationMinutes: true } },
        user: { select: { name: true, store: { select: { name: true } } } },
      },
    });

    await this.writeAuditLog(actorId, 'CERTIFICATE_REVOKED', certificateId, {
      certificateCode: cert.certificateCode,
    });

    return this.toCertificateDto(revoked);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (;;) {
      const segments = Array.from({ length: 3 }, () =>
        Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''),
      );
      const code = `CERT-${segments.join('-')}`;
      const exists = await this.prisma.certificate.findFirst({ where: { certificateCode: code } });
      if (!exists) return code;
    }
  }

  private getStatus(
    revokedAt: Date | null,
    expiresAt: Date | null,
  ): 'valid' | 'expired' | 'revoked' {
    if (revokedAt) return 'revoked';
    if (expiresAt && expiresAt < new Date()) return 'expired';
    return 'valid';
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private toCertificateDto(cert: {
    id: string;
    certificateCode: string;
    issuedAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
    fileUrl: string | null;
    course: { title: string; estimatedDurationMinutes: number };
    user: { name: string; store?: { name: string } | null };
  }) {
    return {
      id: cert.id,
      certificateCode: cert.certificateCode,
      courseName: cert.course.title,
      courseHours: Math.max(1, Math.ceil(cert.course.estimatedDurationMinutes / 60)),
      storeName: cert.user.store?.name ?? null,
      studentName: cert.user.name,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      revokedAt: cert.revokedAt,
      fileUrl: cert.fileUrl,
      status: this.getStatus(cert.revokedAt, cert.expiresAt),
    } satisfies CertificateResponseDto;
  }

  private async writeAuditLog(
    actorUserId: string,
    action: string,
    entityId: string,
    newData?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog
      .create({
        data: {
          actorUserId,
          action,
          entityType: 'Certificate',
          entityId,
          newData: newData as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((err: unknown) => this.logger.error('Audit log failed', err));
  }
}
