import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

interface ReviewBody {
  overallResult: 'MANUAL_PASS' | 'MANUAL_FAIL';
  agentNotes?: string;
  fieldOverrides?: Array<{
    fieldId: string;
    result: 'MATCH' | 'MISMATCH' | 'PARTIAL';
    reason: string;
  }>;
}

// POST /api/applications/[id]/review — submit manual review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body: ReviewBody = await request.json();

    if (!['MANUAL_PASS', 'MANUAL_FAIL'].includes(body.overallResult)) {
      return NextResponse.json({ error: 'Invalid overallResult' }, { status: 400 });
    }

    // Verify application exists and has a verification result
    const app = await prisma.application.findUnique({
      where: { id },
      include: { verificationResult: true },
    });

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!app.verificationResult) {
      return NextResponse.json({ error: 'Application has not been verified yet' }, { status: 400 });
    }

    // Update verification result with manual review
    await prisma.verificationResult.update({
      where: { id: app.verificationResult.id },
      data: {
        overallResult: body.overallResult,
        agentNotes: body.agentNotes || null,
        reviewedAt: new Date(),
      },
    });

    // Apply field overrides
    if (body.fieldOverrides && body.fieldOverrides.length > 0) {
      for (const override of body.fieldOverrides) {
        await prisma.fieldResult.update({
          where: { id: override.fieldId },
          data: {
            agentOverride: override.result,
            overrideReason: override.reason,
          },
        });
      }
    }

    // Update application status
    await prisma.application.update({
      where: { id },
      data: { status: 'MANUALLY_REVIEWED' },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/applications/[id]/review error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
