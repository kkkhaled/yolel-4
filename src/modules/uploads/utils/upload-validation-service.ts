// src/modules/upload/file-upload-validation.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as sharp from 'sharp';

@Injectable()
export class FileUploadValidationService {
  private visionClient: ImageAnnotatorClient;

  constructor() {
    // Initialize Google Vision client with API Key
    this.visionClient = new ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_CLOUD_API_KEY,
    });
  }

  /**
   * Main validation method - checks all photo requirements
   */
  async validatePhoto(
    buffer: Buffer,
  ): Promise<{ status: string; message: string }> {
    try {
      // 1. Basic image analysis using Sharp
      const imageAnalysis = await this.analyzeImageBasics(buffer);
      if (!imageAnalysis.valid) {
        throw new HttpException(
          { status: 'rejected', reason: imageAnalysis.reason },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 2. Face detection using Google Vision API
      const faceCheck = await this.detectFaceWithGoogleVision(buffer);
      if (!faceCheck.valid) {
        throw new HttpException(
          { status: 'rejected', reason: faceCheck.reason },
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. AI/spoof/cartoon detection
      const contentCheck = await this.detectSpoofOrCartoon(buffer);
      if (contentCheck.fake) {
        throw new HttpException(
          { status: 'rejected', reason: contentCheck.reason },
          HttpStatus.BAD_REQUEST,
        );
      }

      return { status: 'accepted', message: 'Valid photo ✅' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Photo validation error:', error);
      throw new HttpException(
        { status: 'rejected', reason: 'Photo validation failed' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Basic image analysis using Sharp (size, format, quality)
   */
  private async analyzeImageBasics(
    buffer: Buffer,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const metadata = await sharp(buffer).metadata();

      // Check image format
      if (!['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format || '')) {
        return {
          valid: false,
          reason: 'Unsupported image format. Use JPEG, PNG, or WebP',
        };
      }

      // Check image dimensions
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

      // Check file size (approximate from buffer)
      const fileSizeMB = buffer.length / (1024 * 1024);
      if (fileSizeMB > 10) {
        return { valid: false, reason: 'File too large. Maximum 10MB allowed' };
      }

      // Basic sharpness check using laplacian variance approximation
      const sharpnessCheck = await this.checkImageSharpness(buffer);
      if (!sharpnessCheck.sharp) {
        return { valid: false, reason: 'Image too blurry or low quality' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Image analysis error:', error);
      return { valid: false, reason: 'Could not analyze image' };
    }
  }

  /**
   * Simple sharpness check using Sharp's stats
   */
  private async checkImageSharpness(
    buffer: Buffer,
  ): Promise<{ sharp: boolean }> {
    try {
      // Convert to grayscale and get stats
      const stats = await sharp(buffer)
        .greyscale()
        .resize(300, 300, { fit: 'inside' }) // Resize for faster processing
        .stats();

      // Check standard deviation - higher values indicate sharper images
      const totalVariance = stats.channels.reduce(
        (sum, channel) => sum + channel.stdev,
        0,
      );

      // Threshold based on testing - adjust as needed
      return { sharp: totalVariance > 30 };
    } catch (error) {
      console.error('Sharpness check error:', error);
      return { sharp: true }; // Default to true if check fails
    }
  }

  /**
   * Face detection using Google Vision API
   */
  private async detectFaceWithGoogleVision(
    buffer: Buffer,
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const [result] = await this.visionClient.faceDetection({
        image: { content: buffer },
      });

      const faces = result.faceAnnotations || [];

      // Check: exactly one face
      if (faces.length === 0) {
        return { valid: false, reason: 'No face detected in the image' };
      }

      if (faces.length > 1) {
        return {
          valid: false,
          reason: 'Multiple faces detected - only one person allowed',
        };
      }

      const face = faces[0];

      // Check face size (bounding box should be reasonable)
      const boundingBox = face.boundingPoly?.vertices;
      if (boundingBox && boundingBox.length >= 4) {
        const width = Math.abs(
          (boundingBox[1]?.x || 0) - (boundingBox[0]?.x || 0),
        );
        const height = Math.abs(
          (boundingBox[2]?.y || 0) - (boundingBox[0]?.y || 0),
        );

        if (width < 100 || height < 100) {
          return { valid: false, reason: 'Face too small / too far away' };
        }
      }

      // Check face angles (frontal check)
      const panAngle = face.panAngle || 0;
      const tiltAngle = face.tiltAngle || 0;
      const rollAngle = face.rollAngle || 0;

      // Allow small deviations (±20 degrees)
      if (
        Math.abs(panAngle) > 20 ||
        Math.abs(tiltAngle) > 20 ||
        Math.abs(rollAngle) > 20
      ) {
        return {
          valid: false,
          reason: 'Face not front-facing (side profile detected)',
        };
      }

      // Check detection confidence
      const confidence = face.detectionConfidence || 0;
      if (confidence < 0.5) {
        return { valid: false, reason: 'Face detection confidence too low' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Google Vision face detection error:', error);
      throw new Error('Face detection service temporarily unavailable');
    }
  }

  /**
   * Google Vision API-based AI/spoof/cartoon detection
   */
  private async detectSpoofOrCartoon(
    buffer: Buffer,
  ): Promise<{ fake: boolean; reason?: string }> {
    try {
      // 1. Safe Search Detection (spoof detection)
      const [safeRes] = await this.visionClient.safeSearchDetection({
        image: { content: buffer },
      });

      const safe = safeRes.safeSearchAnnotation;
      if (safe && safe.spoof === 'VERY_LIKELY') {
        return { fake: true, reason: 'AI-generated or spoofed image detected' };
      }

      // 2. Label Detection (cartoon/drawing detection)
      const [labelRes] = await this.visionClient.labelDetection({
        image: { content: buffer },
      });

      const labels =
        labelRes.labelAnnotations?.map(
          (l) => l.description?.toLowerCase() || '',
        ) || [];

      // Check for forbidden content types
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

      const detectedForbidden = labels.filter((label) =>
        forbiddenLabels.some((forbidden) => label.includes(forbidden)),
      );

      if (detectedForbidden.length > 0) {
        return {
          fake: true,
          reason: `Filtered or AI/cartoon image not allowed (detected: ${detectedForbidden.join(', ')})`,
        };
      }

      // 3. Additional content check for quality
      const qualityLabels = [
        'person',
        'human face',
        'portrait',
        'selfie',
        'photograph',
      ];
      const hasQualityIndicators = labels.some((label) =>
        qualityLabels.some((quality) => label.includes(quality)),
      );

      if (!hasQualityIndicators) {
        return {
          fake: true,
          reason: 'Image does not appear to be a clear photograph of a person',
        };
      }

      return { fake: false };
    } catch (error) {
      console.error('Google Vision content detection error:', error);
      throw new Error('Content validation service temporarily unavailable');
    }
  }
}
