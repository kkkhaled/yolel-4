// src/modules/upload/file-upload-validation.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as sharp from 'sharp';

type Ok = { status: 'accepted'; message: string };
type Bad = never;

type Stage1Result = {
  facesCount: number;
  faceTooSmall: boolean;
  faceFrontal: boolean;
  faceConfident: boolean;
  faceBox?: { x: number; y: number; w: number; h: number };
  spoofVeryLikely: boolean;
  localValid: boolean;
  localReason?: string;
  borderline: boolean;
  sunglassesLikely?: boolean;
};

type Stage2Result = {
  forbiddenLabelsDetected: string[];
  hasPhotographicPersonHints: boolean;
  hasStrongPhotoHints: boolean;
};

@Injectable()
export class FileUploadValidationService {
  private visionClient: ImageAnnotatorClient;

  constructor() {
    this.visionClient = new ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_CLOUD_API_KEY,
    } as any);
  }

  async validatePhoto(buffer: Buffer): Promise<Ok> {
    try {
      // ===== Stage 1: محلي + FACE/SAFE =====
      const stage1 = await this.runStage1(buffer);

      // رفضات مبكرة
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

      // منع النظارة الداكنة
      if (stage1.sunglassesLikely) {
        this.reject(
          'Eyes are not clearly visible (sunglasses or heavy occlusion)',
        );
      }

      // لو واضح إنها سليمة ومش حدّية ⇒ قبول
      if (!stage1.borderline) {
        return { status: 'accepted', message: 'Valid photo ✅' };
      }

      // ===== فحص نعومة سريع (شرطي) قبل الدخول لمرحلة الـ Labels =====
      const smooth = await this.checkAIsmoothness(buffer);
      if (!smooth.tooSmooth) {
        // حدّي بسيط لكن مش "ناعمة جدًا" ⇒ اعتبرها مقبولة بدون Labels
        return { status: 'accepted', message: 'Valid photo ✅' };
      }

      // ===== Stage 2: LABEL_DETECTION (عند الحاجة فقط) =====
      const stage2 = await this.runStage2(buffer, stage1.faceBox);

      if (stage2.forbiddenLabelsDetected.length) {
        this.reject(
          `Filtered or AI/cartoon image not allowed (detected: ${stage2.forbiddenLabelsDetected.join(', ')})`,
        );
      }

      // نرفض الواقعية المصقولة: TooSmooth + مفيش دلائل فوتوغرافية قوية
      if (!stage2.hasStrongPhotoHints) {
        this.reject(
          'Image appears synthetic/overly smooth and lacks clear photographic indicators',
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

  // ===================== Stage 1 =====================
  private async runStage1(buffer: Buffer): Promise<Stage1Result> {
    const [local, faceSafe] = await Promise.all([
      this.analyzeImageBasics(buffer),
      this.annotateFaceAndSafe(buffer),
    ]);

    const faces = faceSafe.faceAnnotations ?? [];
    let faceTooSmall = false;
    let faceFrontal = true;
    let faceConfident = true;
    let faceBox: Stage1Result['faceBox'];
    let sunglassesLikely = false;

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
        // 👇 حجم وجه أشد
        if (w < 140 || h < 140) faceTooSmall = true;
        faceBox = { x: x0, y: y0, w, h };
      }

      // 👇 تشديد الزوايا
      const pan = f.panAngle ?? 0;
      const tilt = f.tiltAngle ?? 0;
      const roll = f.rollAngle ?? 0;
      if (Math.abs(pan) > 15 || Math.abs(tilt) > 15 || Math.abs(roll) > 15)
        faceFrontal = false;

      const conf = f.detectionConfidence ?? 0;
      if (conf < 0.6) faceConfident = false;

      // 👇 قياس سطوع العينين (patch صغير، سريع)
      try {
        const eyeLM = f.landmarks || [];
        const left = eyeLM.find((l) =>
          (l.type || '').toString().includes('LEFT_EYE'),
        );
        const right = eyeLM.find((l) =>
          (l.type || '').toString().includes('RIGHT_EYE'),
        );
        if (left?.position && right?.position) {
          const eyeBrightness = await this.measureEyesBrightness(
            buffer,
            left.position,
            right.position,
          );
          // عتبات عملية للنظارة الداكنة
          if (eyeBrightness.mean < 0.2 && eyeBrightness.diff < 0.1) {
            sunglassesLikely = true;
          }
        }
      } catch {
        /* ignore */
      }
    }

    const spoofValue = this.asLikelihoodString(
      faceSafe.safeSearchAnnotation?.spoof as any,
    );
    const spoofVeryLikely = spoofValue === 'VERY_LIKELY';

    // Borderline = ثقة وجه حدّية أو spoof محتمل/مرجّح (لكن مش VERY_LIKELY)
    const borderline =
      (faces.length === 1 &&
        !faceTooSmall &&
        faceFrontal &&
        !spoofVeryLikely &&
        (faces[0]?.detectionConfidence ?? 0) < 0.75) ||
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
      sunglassesLikely,
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

  // ===================== Stage 2 =====================
  private async runStage2(
    buffer: Buffer,
    faceBox?: { x: number; y: number; w: number; h: number },
  ): Promise<Stage2Result> {
    const labelInputBuffer = await this.prepareLabelInput(buffer, faceBox);
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
      'artwork',
      'painting',
      'digital art',
      'fantasy art',
      'concept art',
      'matte painting',
      'airbrushed',
      'render',
      '3d render',
      'octane render',
      'unreal engine',
      'cgi',
      'computer graphics',
      'cg',
      'synthetic',
      'ai-generated',
      'generative',
      'stable diffusion',
      'midjourney',
      'graphic design',
    ];
    const forbiddenLabelsDetected = labelsList.filter((l) =>
      forbiddenLabels.some((f) => l.includes(f)),
    );

    const personHints = [
      'person',
      'human',
      'human face',
      'portrait',
      'headshot',
      'selfie',
      'facial feature',
    ];
    const hasPhotographicPersonHints = labelsList.some((l) =>
      personHints.some((q) => l.includes(q)),
    );

    const strongPhotoHints = [
      'photograph',
      'photo',
      'camera',
      'snapshot',
      'dslr',
    ];
    const hasStrongPhotoHints = labelsList.some((l) =>
      strongPhotoHints.some((q) => l.includes(q)),
    );

    return {
      forbiddenLabelsDetected,
      hasPhotographicPersonHints,
      hasStrongPhotoHints,
    };
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
      if (!faceBox) return buffer;
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
      return buffer;
    }
  }

  // ===================== Local checks =====================
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
      return { sharp: totalStdev > 30 };
    } catch (e) {
      console.error('Sharpness check error:', e);
      return { sharp: true };
    }
  }

  // ===== نعومة (AI) — تُشغّل فقط لو الحالة حدّية =====
  private async checkAIsmoothness(
    buffer: Buffer,
  ): Promise<{ tooSmooth: boolean }> {
    try {
      const laplacianKernel = {
        width: 3,
        height: 3,
        kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0],
      };
      const processed = await sharp(buffer)
        .greyscale()
        .resize(192, 192, { fit: 'inside' }) // أصغر = أسرع
        .convolve(laplacianKernel)
        .stats();
      const edgeEnergy = processed.channels.reduce(
        (s, ch) => s + (ch.stdev ?? 0),
        0,
      );
      // خففنا التكلفة وخلّينا العتبة معتدلة لتقليل استدعاء Stage2 على الصور الحقيقية
      const tooSmooth = edgeEnergy < 16;
      return { tooSmooth };
    } catch {
      return { tooSmooth: false };
    }
  }

  // ===== قياس سطوع العينين (مؤشر نظّارة) =====
  private async measureEyesBrightness(
    buffer: Buffer,
    left: { x?: number; y?: number; z?: number },
    right: { x?: number; y?: number; z?: number },
  ): Promise<{ mean: number; diff: number }> {
    const sampleBox = async (cx: number, cy: number, size = 24) => {
      const left = Math.max(0, Math.floor(cx - size / 2));
      const top = Math.max(0, Math.floor(cy - size / 2));
      const img = sharp(buffer)
        .extract({ left, top, width: size, height: size })
        .greyscale();
      const st = await img.stats();
      return (st.channels[0]?.mean ?? 128) / 255;
    };

    const lx = Math.max(0, Math.floor(left.x ?? 0));
    const ly = Math.max(0, Math.floor(left.y ?? 0));
    const rx = Math.max(0, Math.floor(right.x ?? 0));
    const ry = Math.max(0, Math.floor(right.y ?? 0));

    const [lb, rb] = await Promise.all([sampleBox(lx, ly), sampleBox(rx, ry)]);
    const mean = (lb + rb) / 2;
    const diff = Math.abs(lb - rb);
    return { mean, diff };
  }

  // ===================== Helpers =====================
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
