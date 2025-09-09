// src/modules/upload/file-upload-validation.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as sharp from 'sharp';

type Ok = { status: 'accepted'; message: string };
type Bad = never;

type Stage1Result = {
  // من FACE_DETECTION
  facesCount: number;
  faceTooSmall: boolean;
  faceFrontal: boolean;
  faceConfident: boolean;
  faceBox?: { x: number; y: number; w: number; h: number };

  // من SAFE_SEARCH_DETECTION
  spoofVeryLikely: boolean;

  // من الفحوصات المحلية
  localValid: boolean;
  localReason?: string;

  // حالة حدّية تحتاج دفعة تانية؟
  borderline: boolean;
};

type Stage2Result = {
  forbiddenLabelsDetected: string[];
  hasPhotographicPersonHints: boolean;
};

@Injectable()
export class FileUploadValidationService {
  private visionClient: ImageAnnotatorClient;

  constructor() {
    // ملاحظة: لو Service Account غير متاح، نكمل بـ apiKey كما هو.
    this.visionClient = new ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_CLOUD_API_KEY,
    } as any);
  }

  // ----------------- الواجهة العامة -----------------
  async validatePhoto(buffer: Buffer): Promise<Ok> {
    try {
      // الدفعة الأولى: 3 مع بعض
      const stage1 = await this.runStage1(buffer);

      // قرارات الرفض المبكر
      if (!stage1.localValid)
        this.reject(stage1.localReason || 'Invalid image');
      if (stage1.facesCount === 0) this.reject('No face detected in the image');
      if (stage1.facesCount > 1)
        this.reject('Multiple faces detected - only one person allowed');
      if (stage1.faceTooSmall) this.reject('Face too small / too far away');
      if (!stage1.faceFrontal)
        this.reject('Face not front-facing (side profile detected)');
      if (!stage1.faceConfident)
        this.reject('Face detection confidence too low');
      if (stage1.spoofVeryLikely)
        this.reject('AI-generated or spoofed image detected');

      // لو مش حدّي ⇒ قبول فوري بدون دفعة تانية
      if (!stage1.borderline) {
        return { status: 'accepted', message: 'Valid photo ✅' };
      }

      // الدفعة الثانية: 3 مع بعض (Labels + مؤشرات فوتوغرافية + قصّ اختياري)
      const stage2 = await this.runStage2(buffer, stage1.faceBox);

      // قرارات الدفعة الثانية
      if (stage2.forbiddenLabelsDetected.length) {
        this.reject(
          `Filtered or AI/cartoon image not allowed (detected: ${stage2.forbiddenLabelsDetected.join(', ')})`,
        );
      }
      if (!stage2.hasPhotographicPersonHints) {
        this.reject(
          'Image does not appear to be a clear photograph of a person',
        );
      }

      return { status: 'accepted', message: 'Valid photo ✅' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Photo validation error:', error);
      throw new HttpException(
        { status: 'rejected', reason: 'Photo validation failed' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ----------------- الدفعة الأولى -----------------
  private async runStage1(buffer: Buffer): Promise<Stage1Result> {
    // نشغّل 3 فحوصات بالتوازي
    const [local, faceSafe] = await Promise.all([
      this.analyzeImageBasics(buffer),
      this.annotateFaceAndSafe(buffer),
    ]);

    // تحليل نتائج FACE
    const faces = faceSafe.faceAnnotations ?? [];
    let faceTooSmall = false;
    let faceFrontal = true;
    let faceConfident = true;
    let faceBox: Stage1Result['faceBox'];

    if (faces.length === 1) {
      const f = faces[0];
      const verts = f.boundingPoly?.vertices ?? [];
      if (verts.length >= 3) {
        const x0 = Math.min(
          verts[0]?.x ?? 0,
          verts[1]?.x ?? 0,
          verts[2]?.x ?? 0,
          verts[3]?.x ?? 0,
        );
        const y0 = Math.min(
          verts[0]?.y ?? 0,
          verts[1]?.y ?? 0,
          verts[2]?.y ?? 0,
          verts[3]?.y ?? 0,
        );
        const x1 = Math.max(
          verts[0]?.x ?? 0,
          verts[1]?.x ?? 0,
          verts[2]?.x ?? 0,
          verts[3]?.x ?? 0,
        );
        const y1 = Math.max(
          verts[0]?.y ?? 0,
          verts[1]?.y ?? 0,
          verts[2]?.y ?? 0,
          verts[3]?.y ?? 0,
        );
        const w = Math.max(0, x1 - x0);
        const h = Math.max(0, y1 - y0);
        if (w < 100 || h < 100) faceTooSmall = true;
        faceBox = { x: x0, y: y0, w, h };
      }

      const pan = f.panAngle ?? 0;
      const tilt = f.tiltAngle ?? 0;
      const roll = f.rollAngle ?? 0;
      if (Math.abs(pan) > 20 || Math.abs(tilt) > 20 || Math.abs(roll) > 20)
        faceFrontal = false;

      const conf = f.detectionConfidence ?? 0;
      if (conf < 0.5) faceConfident = false;
    }

    // SafeSearch spoof
    const spoofValue = this.asLikelihoodString(
      faceSafe.safeSearchAnnotation?.spoof as any,
    );
    const spoofVeryLikely = spoofValue === 'VERY_LIKELY';

    // حدّية القرار؟ (يستدعي الدفعة الثانية)
    const borderline =
      // ثقة الوجه عند الحد الأدنى
      (faces.length === 1 &&
        !faceTooSmall &&
        faceFrontal &&
        !spoofVeryLikely &&
        (faces[0]?.detectionConfidence ?? 0) < 0.7) ||
      // spoof محتمل/مرجّح بس مش VERY_LIKELY
      spoofValue === 'POSSIBLE' ||
      spoofValue === 'LIKELY';

    return {
      facesCount: faces.length,
      faceTooSmall,
      faceFrontal,
      faceConfident,
      faceBox,
      spoofVeryLikely,
      localValid: local.valid,
      localReason: local.reason,
      borderline,
    };
  }

  private async annotateFaceAndSafe(buffer: Buffer) {
    try {
      const [res] = await this.visionClient.annotateImage({
        image: { content: buffer },
        features: [
          { type: 'FACE_DETECTION', maxResults: 5 },
          { type: 'SAFE_SEARCH_DETECTION' },
        ],
      });
      return res;
    } catch (e) {
      console.error('Vision FACE/SAFE error:', e);
      throw new Error('Vision service temporarily unavailable');
    }
  }

  // ----------------- الدفعة الثانية -----------------
  private async runStage2(
    buffer: Buffer,
    faceBox?: { x: number; y: number; w: number; h: number },
  ): Promise<Stage2Result> {
    // نجهّز صورة مقصوصة اختيارية للـ Labels لتقليل الحجم (لا يؤثر على الصورة المحفوظة)
    const labelInputBuffer = await this.prepareLabelInput(buffer, faceBox);

    // نشغّل 3 فحوصات بالتوازي داخل الدفعة الثانية
    const [labels] = await Promise.all([
      this.annotateLabels(labelInputBuffer, 10),
    ]);

    const labelsList =
      (labels.labelAnnotations ?? [])
        .map((l) => (l.description || '').toLowerCase())
        .filter(Boolean) || [];

    const forbiddenLabels = [
      'cartoon',
      'drawing',
      'animation',
      'illustration',
      'sketch',
      'anime',
      'comic',
      'manga',
      'art',
      'painting',
      'artwork',
      'caricature',
      'doodle',
      'graphic design',
    ];
    const forbiddenLabelsDetected = labelsList.filter((l) =>
      forbiddenLabels.some((f) => l.includes(f)),
    );

    const qualityLabels = [
      'person',
      'human face',
      'portrait',
      'selfie',
      'photograph',
    ];
    const hasPhotographicPersonHints = labelsList.some((l) =>
      qualityLabels.some((q) => l.includes(q)),
    );

    return { forbiddenLabelsDetected, hasPhotographicPersonHints };
  }

  private async annotateLabels(buffer: Buffer, maxResults = 10) {
    try {
      const [res] = await this.visionClient.annotateImage({
        image: { content: buffer },
        features: [{ type: 'LABEL_DETECTION', maxResults }],
      });
      return res;
    } catch (e) {
      console.error('Vision LABELS error:', e);
      throw new Error('Vision service temporarily unavailable');
    }
  }

  private async prepareLabelInput(
    buffer: Buffer,
    faceBox?: { x: number; y: number; w: number; h: number },
  ): Promise<Buffer> {
    try {
      if (!faceBox) return buffer; // لو مفيش صندوق وجه من الدفعة الأولى

      // نضيف حواف حوالين الوجه (20%) ونقصّ ROI
      const meta = await sharp(buffer).metadata();
      const pad = 0.2;
      const x = Math.max(0, Math.floor(faceBox.x - faceBox.w * pad));
      const y = Math.max(0, Math.floor(faceBox.y - faceBox.h * pad));
      const w = Math.min(
        Math.floor(faceBox.w * (1 + 2 * pad)),
        (meta.width ?? 0) - x,
      );
      const h = Math.min(
        Math.floor(faceBox.h * (1 + 2 * pad)),
        (meta.height ?? 0) - y,
      );

      if (w > 0 && h > 0) {
        return await sharp(buffer)
          .extract({ left: x, top: y, width: w, height: h })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();
      }
      return buffer;
    } catch {
      // لو القص فشل لأي سبب، نرجع الأصل
      return buffer;
    }
  }

  // ----------------- فحوصات محليّة -----------------
  private async analyzeImageBasics(
    buffer: Buffer,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const metadata = await sharp(buffer).metadata();

      if (!['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format || '')) {
        return {
          valid: false,
          reason: 'Unsupported image format. Use JPEG, PNG, or WebP',
        };
      }
      if (!metadata.width || !metadata.height) {
        return { valid: false, reason: 'Could not determine image dimensions' };
      }
      if (metadata.width < 200 || metadata.height < 200) {
        return {
          valid: false,
          reason: 'Image too small. Minimum 200x200 pixels required',
        };
      }
      if (metadata.width > 4000 || metadata.height > 4000) {
        return {
          valid: false,
          reason: 'Image too large. Maximum 4000x4000 pixels allowed',
        };
      }
      const fileSizeMB = buffer.length / (1024 * 1024);
      if (fileSizeMB > 10) {
        return { valid: false, reason: 'File too large. Maximum 10MB allowed' };
      }

      const sharpness = await this.checkImageSharpness(buffer);
      if (!sharpness.sharp) {
        return { valid: false, reason: 'Image too blurry or low quality' };
      }

      return { valid: true };
    } catch (e) {
      console.error('Image analysis error:', e);
      return { valid: false, reason: 'Could not analyze image' };
    }
  }

  private async checkImageSharpness(
    buffer: Buffer,
  ): Promise<{ sharp: boolean }> {
    try {
      const stats = await sharp(buffer)
        .greyscale()
        .resize(300, 300, { fit: 'inside' })
        .stats();

      const totalStdev = stats.channels.reduce(
        (sum, c) => sum + (c.stdev ?? 0),
        0,
      );
      // حد ضبط افتراضي—يمكن تعديله حسب بياناتك
      return { sharp: totalStdev > 30 };
    } catch (e) {
      console.error('Sharpness check error:', e);
      return { sharp: true };
    }
  }

  // ----------------- أدوات مساعدة -----------------
  private asLikelihoodString(
    val: number | string | undefined,
  ): string | undefined {
    const map = [
      'UNKNOWN',
      'VERY_UNLIKELY',
      'UNLIKELY',
      'POSSIBLE',
      'LIKELY',
      'VERY_LIKELY',
    ];
    if (typeof val === 'number') return map[val] ?? 'UNKNOWN';
    return val;
  }

  private reject(reason: string): Bad {
    throw new HttpException(
      { status: 'rejected', reason },
      HttpStatus.BAD_REQUEST,
    );
  }
}
