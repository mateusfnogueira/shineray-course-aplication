import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface CertificateData {
  studentName: string;
  courseName: string;
  storeName: string | null;
  courseHours: number;
  completedAt: Date;
  certificateCode: string;
  validationUrl: string;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateCertificate(data: CertificateData): Promise<Buffer> {
    // Generate QR code before opening PDF stream
    let qrBuffer: Buffer | null = null;
    try {
      qrBuffer = await QRCode.toBuffer(data.validationUrl, {
        type: 'png',
        width: 120,
        margin: 1,
        color: { dark: '#111827', light: '#ffffff' },
      });
    } catch (err) {
      this.logger.warn('QR code generation skipped', err);
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 55, bottom: 55, left: 70, right: 70 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;

      // Outer border
      doc
        .rect(30, 30, W - 60, doc.page.height - 60)
        .lineWidth(2)
        .stroke('#1d4ed8');

      doc
        .rect(38, 38, W - 76, doc.page.height - 76)
        .lineWidth(0.5)
        .stroke('#93c5fd');

      // Platform name
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('COMPLIANCE TRAINING PLATFORM', { align: 'center' });

      doc.moveDown(0.3);

      // Title
      doc
        .fontSize(36)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text('CERTIFICADO', { align: 'center' });

      doc
        .fontSize(13)
        .font('Helvetica')
        .fillColor('#374151')
        .text('DE CONCLUSÃO', { align: 'center' });

      // Divider
      doc.moveDown(0.8);
      const divY = doc.y;
      doc
        .moveTo(W * 0.2, divY)
        .lineTo(W * 0.8, divY)
        .lineWidth(1)
        .stroke('#d1d5db');
      doc.moveDown(1);

      // Certify text
      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('Certificamos que', { align: 'center' });

      doc.moveDown(0.4);

      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(data.studentName, { align: 'center' });

      doc.moveDown(0.4);

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text('concluiu com êxito o treinamento', { align: 'center' });

      doc.moveDown(0.4);

      doc
        .fontSize(19)
        .font('Helvetica-Bold')
        .fillColor('#1d4ed8')
        .text(data.courseName, { align: 'center' });

      // Details
      doc.moveDown(0.8);
      const details: string[] = [];
      if (data.storeName) details.push(`Loja: ${data.storeName}`);
      details.push(`Carga horária: ${data.courseHours}h`);
      details.push(`Concluído em: ${data.completedAt.toLocaleDateString('pt-BR')}`);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#374151')
        .text(details.join('   ·   '), { align: 'center' });

      // Footer divider
      doc.moveDown(1);
      const footerDivY = doc.y;
      doc
        .moveTo(W * 0.15, footerDivY)
        .lineTo(W * 0.85, footerDivY)
        .lineWidth(0.5)
        .stroke('#e5e7eb');

      doc.moveDown(0.6);

      // Validation info
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#9ca3af')
        .text(`Código de Validação: ${data.certificateCode}`, { align: 'center' });

      doc
        .fontSize(8)
        .text(`Valide em: ${data.validationUrl}`, { align: 'center', link: data.validationUrl });

      // QR code (bottom right, if generated)
      if (qrBuffer) {
        const qrSize = 75;
        const qrX = W - 70 - qrSize;
        const qrY = doc.page.height - 70 - qrSize;
        doc.image(qrBuffer, qrX, qrY, { width: qrSize });
      }

      doc.end();
    });
  }
}
