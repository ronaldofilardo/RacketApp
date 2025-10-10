import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
(async () => {
  try {
    const matches = await p.match.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    console.log(JSON.stringify(matches, null, 2));
  } catch (e) {
    console.error("ERROR", e);
    process.exit(1);
  } finally {
    await p.$disconnect();
  }
})();
