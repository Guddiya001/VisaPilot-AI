import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'warn', 'error'],
});

async function main() {
  try {
    console.log('=== Database Job Test ===');
    console.log('Environment: DATABASE_URL =', process.env.DATABASE_URL || 'not set');
    
    // Wait briefly to ensure connection
    await new Promise(r => setTimeout(r, 1000));

    // Test 1: Count all jobs
    const count = await prisma.job.count();
    console.log(`\n✅ Total jobs in DB: ${count}`);

    // Test 2: Count all companies
    const companies = await prisma.company.count();
    console.log(`✅ Total companies: ${companies}`);

    // Test 3: Get recent jobs
    const jobs = await prisma.job.findMany({
      take: 5,
      include: { company: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log('\n📋 Recent jobs:');
    if (jobs.length === 0) {
      console.log('  (No jobs found in database)');
    } else {
      for (const j of jobs) {
        console.log(`  - ID: ${j.id.substring(0, 8)}...`);
        console.log(`    Title: ${j.title}`);
        console.log(`    Company: ${j.company?.name || 'Unknown'}`);
        console.log(`    Source: ${j.source}`);
        console.log(`    Country: ${j.country}`);
        console.log(`    Posted: ${j.postedAt}`);
        console.log('');
      }
    }

    // Test 4: Count AI analyses
    const aiAnalyses = await prisma.aIAnalysis.count();
    console.log(`✅ AI Analyses stored: ${aiAnalyses}`);

    // Test 5: Count embedding indexes
    const embIndexes = await prisma.embeddingIndex.count();
    console.log(`✅ Embedding indexes: ${embIndexes}`);

    // Test 6: Count search history
    const searchHistory = await prisma.searchHistory.count();
    console.log(`✅ Search history entries: ${searchHistory}`);

    // Test 7: Count by source
    const bySource = await prisma.job.groupBy({
      by: ['source'],
      _count: { id: true },
    });
    console.log('\n📊 Jobs by source:');
    for (const s of bySource) {
      console.log(`  ${s.source}: ${s._count.id}`);
    }

    console.log('\n=== ✅ Test Complete ✅ ===');
  } catch (e) {
    console.error('\n❌ DB Error:', e instanceof Error ? e.message : String(e));
    if (e instanceof Error && e.stack) {
      console.error('Stack:', e.stack.split('\n').slice(0, 4).join('\n'));
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
