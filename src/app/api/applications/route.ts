import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { put } from '@vercel/blob';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, GOVERNMENT_WARNING_TEXT } from '@/lib/constants';

// GET /api/applications — list applications with optional status filter
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

  const where: Record<string, unknown> = {};
  if (statusParam) {
    const statuses = statusParam.split(',').map((s) => s.trim());
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }

  const [data, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        verificationResult: {
          select: {
            overallResult: true,
            processingTimeMs: true,
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ]);

  const mapped = data.map((app) => ({
    id: app.id,
    createdAt: app.createdAt.toISOString(),
    status: app.status,
    beverageType: app.beverageType,
    brandName: app.brandName,
    classType: app.classType,
    imageFilename: app.imageFilename,
    batchId: app.batchId,
    overallResult: app.verificationResult?.overallResult ?? null,
    processingTimeMs: app.verificationResult?.processingTimeMs ?? null,
  }));

  return NextResponse.json({
    data: mapped,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

// POST /api/applications — create a single application
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const image = formData.get('image') as File | null;
    if (!image) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(image.type as typeof ACCEPTED_IMAGE_TYPES[number])) {
      return NextResponse.json({ error: 'Invalid image type. Use JPEG or PNG.' }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: `Image too large. Maximum ${(MAX_IMAGE_SIZE_BYTES / 1024 / 1024).toFixed(1)}MB.` }, { status: 400 });
    }

    const beverageType = formData.get('beverageType') as string;
    if (!['SPIRITS', 'WINE', 'MALT_BEVERAGE'].includes(beverageType)) {
      return NextResponse.json({ error: 'Invalid beverage type' }, { status: 400 });
    }

    const brandName = formData.get('brandName') as string;
    const classType = formData.get('classType') as string;
    const netContents = formData.get('netContents') as string;
    const nameAddress = formData.get('nameAddress') as string;

    if (!brandName || !classType || !netContents || !nameAddress) {
      return NextResponse.json({ error: 'Missing required fields: brandName, classType, netContents, nameAddress' }, { status: 400 });
    }

    // Government warning is always the standard text — auto-populated
    const governmentWarning = GOVERNMENT_WARNING_TEXT;

    // Upload image to blob storage
    const blob = await put(`labels/${Date.now()}-${image.name}`, image, {
      access: 'public',
      contentType: image.type,
    });

    const application = await prisma.application.create({
      data: {
        beverageType: beverageType as 'SPIRITS' | 'WINE' | 'MALT_BEVERAGE',
        brandName,
        classType,
        alcoholContent: formData.get('alcoholContent') as string | null,
        netContents,
        nameAddress,
        governmentWarning,
        countryOfOrigin: formData.get('countryOfOrigin') as string | null,
        appellation: formData.get('appellation') as string | null,
        varietal: formData.get('varietal') as string | null,
        vintageDate: formData.get('vintageDate') as string | null,
        imageUrl: blob.url,
        imageFilename: image.name,
      },
    });

    return NextResponse.json({ id: application.id }, { status: 201 });
  } catch (err) {
    console.error('POST /api/applications error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
