import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { verifyLabel } from '@/lib/services/pipeline';
import type { ApplicationFields } from '@/lib/types/matching';
import type { BeverageType } from '@/lib/types/application';

interface VerifyBody {
  applicationIds: string[];
}

// POST /api/verify — run verification pipeline on one or more applications
export async function POST(request: NextRequest) {
  try {
    const body: VerifyBody = await request.json();

    if (!body.applicationIds || !Array.isArray(body.applicationIds) || body.applicationIds.length === 0) {
      return NextResponse.json({ error: 'applicationIds array is required' }, { status: 400 });
    }

    const applications = await prisma.application.findMany({
      where: {
        id: { in: body.applicationIds },
        status: 'PENDING',
      },
    });

    if (applications.length === 0) {
      return NextResponse.json({ error: 'No pending applications found' }, { status: 404 });
    }

    const results: Array<{ id: string; overallResult: string; processingTimeMs: number }> = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const app of applications) {
      try {
        // Fetch the image
        const imageResponse = await fetch(app.imageUrl);
        if (!imageResponse.ok) {
          errors.push({ id: app.id, error: 'Failed to fetch label image' });
          continue;
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        const applicationData: ApplicationFields = {
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
        };

        const pipelineResult = await verifyLabel({
          imageBuffer,
          applicationData,
          beverageType: app.beverageType as BeverageType,
        });

        // Save verification result to database
        await prisma.verificationResult.create({
          data: {
            applicationId: app.id,
            overallResult: pipelineResult.overallResult,
            processingTimeMs: pipelineResult.processingTimeMs,
            ocrRawText: pipelineResult.ocrRawText,
            ocrConfidence: pipelineResult.ocrConfidence,
            fieldResults: {
              create: pipelineResult.fieldResults.map((fr) => ({
                fieldName: fr.fieldName,
                expectedValue: fr.expected,
                extractedValue: fr.extracted,
                autoResult: fr.result,
                confidence: fr.confidence,
              })),
            },
          },
        });

        // Update application status
        await prisma.application.update({
          where: { id: app.id },
          data: { status: 'VERIFIED' },
        });

        results.push({
          id: app.id,
          overallResult: pipelineResult.overallResult,
          processingTimeMs: pipelineResult.processingTimeMs,
        });
      } catch (err) {
        console.error(`Verification error for ${app.id}:`, err);
        errors.push({
          id: app.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('POST /api/verify error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
