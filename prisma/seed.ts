import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '../src/generated/prisma/client';
import testApplications from '../test/fixtures/test-applications.json';

const GOV_WARNING =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

  console.log('Seeding database...');

  // Clear existing data
  await prisma.fieldResult.deleteMany();
  await prisma.verificationResult.deleteMany();
  await prisma.application.deleteMany();

  console.log('Cleared existing data.');

  const batchId = `seed-${Date.now()}`;

  for (const testCase of testApplications) {
    const d = testCase.data;

    await prisma.application.create({
      data: {
        status: 'PENDING',
        beverageType: d.beverage_type as 'SPIRITS' | 'WINE' | 'MALT_BEVERAGE',
        brandName: d.brand_name,
        classType: d.class_type,
        alcoholContent: d.alcohol_content,
        netContents: d.net_contents,
        nameAddress: d.name_address,
        governmentWarning: d.government_warning || GOV_WARNING,
        countryOfOrigin: d.country_of_origin || null,
        appellation: d.appellation || null,
        varietal: d.varietal || null,
        vintageDate: d.vintage || null,
        imageUrl: `https://placehold.co/800x1200/f3f4f6/6b7280?text=${encodeURIComponent(d.brand_name)}`,
        imageFilename: d.image_filename,
        batchId,
      },
    });

    console.log(`  Created: ${testCase.id} — ${testCase.scenario}`);
  }

  console.log(`\nSeeded ${testApplications.length} applications (batch: ${batchId})`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
