import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

// GET /api/applications/[id] — get application detail with verification results
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      verificationResult: {
        include: {
          fieldResults: true,
        },
      },
    },
  });

  if (!app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const result = {
    id: app.id,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    status: app.status,
    beverageType: app.beverageType,
    brandName: app.brandName,
    classType: app.classType,
    alcoholContent: app.alcoholContent,
    netContents: app.netContents,
    nameAddress: app.nameAddress,
    governmentWarning: app.governmentWarning,
    countryOfOrigin: app.countryOfOrigin,
    appellation: app.appellation,
    varietal: app.varietal,
    vintageDate: app.vintageDate,
    imageUrl: app.imageUrl,
    imageFilename: app.imageFilename,
    batchId: app.batchId,
    verificationResult: app.verificationResult
      ? {
          id: app.verificationResult.id,
          createdAt: app.verificationResult.createdAt.toISOString(),
          overallResult: app.verificationResult.overallResult,
          processingTimeMs: app.verificationResult.processingTimeMs,
          ocrRawText: app.verificationResult.ocrRawText,
          ocrConfidence: app.verificationResult.ocrConfidence,
          agentNotes: app.verificationResult.agentNotes,
          reviewedAt: app.verificationResult.reviewedAt?.toISOString() ?? null,
          fieldResults: app.verificationResult.fieldResults.map((fr) => ({
            id: fr.id,
            fieldName: fr.fieldName,
            expectedValue: fr.expectedValue,
            extractedValue: fr.extractedValue,
            autoResult: fr.autoResult,
            confidence: fr.confidence,
            agentOverride: fr.agentOverride,
            overrideReason: fr.overrideReason,
          })),
        }
      : null,
  };

  return NextResponse.json(result);
}
