import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { put } from '@vercel/blob';
import { CSVIngestionProvider } from '@/lib/services/ingestion/csv-parser';
import { pairRecordsWithFiles } from '@/lib/services/ingestion/batch-pairer';

// POST /api/applications/batch — batch upload via CSV + images
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const csvFile = formData.get('csv') as File | null;
    if (!csvFile) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const imageFiles: File[] = [];
    const images = formData.getAll('images');
    for (const img of images) {
      if (img instanceof File) imageFiles.push(img);
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'At least one image file is required' }, { status: 400 });
    }

    // Parse CSV
    const csvText = await csvFile.text();
    const provider = new CSVIngestionProvider();
    const parseResult = await provider.parseApplicationData(csvText);

    if (parseResult.errors.length > 0 && parseResult.records.length === 0) {
      return NextResponse.json({
        error: 'CSV parsing failed',
        details: parseResult.errors,
      }, { status: 400 });
    }

    // Pair records with images by filename
    const pairing = pairRecordsWithFiles(
      parseResult.records,
      imageFiles.map((f) => f.name)
    );

    if (pairing.matched.length === 0) {
      return NextResponse.json({
        error: 'No records matched to images. Check that image_filename in CSV matches uploaded file names.',
        unmatchedRecords: pairing.unmatchedRecords.map((r) => r.record.imageFilename),
        unmatchedFiles: pairing.unmatchedFiles,
      }, { status: 400 });
    }

    const batchId = `batch-${Date.now()}`;
    const created: string[] = [];

    // Create applications for all matched pairs
    for (const match of pairing.matched) {
      const imageFile = imageFiles.find(
        (f) => f.name.toLowerCase() === match.filename.toLowerCase()
      );
      if (!imageFile) continue;

      // Upload image
      const blob = await put(`labels/${batchId}/${imageFile.name}`, imageFile, {
        access: 'public',
        contentType: imageFile.type,
      });

      const application = await prisma.application.create({
        data: {
          beverageType: match.record.beverageType as 'SPIRITS' | 'WINE' | 'MALT_BEVERAGE',
          brandName: match.record.brandName,
          classType: match.record.classType,
          alcoholContent: match.record.alcoholContent,
          netContents: match.record.netContents,
          nameAddress: match.record.nameAddress,
          governmentWarning: match.record.governmentWarning,
          countryOfOrigin: match.record.countryOfOrigin,
          appellation: match.record.appellation,
          varietal: match.record.varietal,
          vintageDate: match.record.vintageDate,
          imageUrl: blob.url,
          imageFilename: imageFile.name,
          batchId,
        },
      });

      created.push(application.id);
    }

    return NextResponse.json({
      batchId,
      created: created.length,
      warnings: [
        ...parseResult.errors.map((e) => `Row ${e.row}: ${e.message}`),
        ...pairing.unmatchedRecords.map((r) => `No image found for: ${r.record.imageFilename}`),
        ...pairing.unmatchedFiles.map((f) => `No CSV record for image: ${f}`),
      ],
    }, { status: 201 });
  } catch (err) {
    console.error('POST /api/applications/batch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
