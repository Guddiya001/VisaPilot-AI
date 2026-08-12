import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== Database Job Test ===');
    
    // Test 1: Count all jobs
    const count = await prisma.job.count();
    console.log(`Total jobs in DB: ${count}`);

    // Test 2: Count all companies
    const companies = await prisma.company.count();
    console.log(`Total companies: ${companies}`);

    // Test 3: Get recent jobs
    const jobs = await prisma.job.findMany({
      take: 5,
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log('\nRecent jobs:');
    if (jobs.length === 0) {
      console.log('  (No jobs found in database)');
    } else {
      for (const j of jobs) {
        console.log(`  - ${j.title} @ ${j.company?.name || 'Unknown'} (source: ${j.source}, country: ${j.country})`);
      }
    }

    // Test 4: Check AI analyses
    const aiAnalyses = await prisma.aIAnalysis.count();
    console.log(`\nAI Analyses stored: ${aiAnalyses}`);

    // Test 5: Check embedding indexes
    const embIndexes = await prisma.embeddingIndex.count();
    console.log(`Embedding indexes: ${embIndexes}`);

    // Test 6: Check search history
    const searchHistory = await prisma.searchHistory.count();
    console.log(`Search history entries: ${searchHistory}`);

    console.log('\n=== Test Complete ===');
  } catch (e) {
    console.error('DB Error:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
