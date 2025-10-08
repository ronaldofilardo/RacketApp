import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const before = await prisma.match.count();
    console.log(`Matches before: ${before}`);
    if (before === 0) {
      console.log("No matches to delete.");
      return;
    }

    // delete all matches
    const res = await prisma.match.deleteMany();
    console.log(`Deleted ${res.count} matches.`);

    const after = await prisma.match.count();
    console.log(`Matches after: ${after}`);
  } catch (e) {
    console.error("Error clearing matches:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
