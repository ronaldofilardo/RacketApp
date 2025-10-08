import pkg from "pg";
const { Client } = pkg;

async function main() {
  const conn = process.env.REMOTE_DATABASE_URL;
  if (!conn) {
    console.error("REMOTE_DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
    const beforeRes = await client.query(
      "SELECT COUNT(*)::int AS count FROM public.matches"
    );
    const before = beforeRes.rows[0]?.count ?? 0;
    console.log(`Matches before: ${before}`);

    if (before === 0) {
      console.log("No matches to delete.");
      return;
    }

    // Execute deletion
    const delRes = await client.query("DELETE FROM public.matches");
    // delRes.rowCount may be undefined for some drivers, fallback to before
    const deleted = delRes.rowCount ?? before;
    console.log(`Deleted approximately: ${deleted} rows.`);

    const afterRes = await client.query(
      "SELECT COUNT(*)::int AS count FROM public.matches"
    );
    const after = afterRes.rows[0]?.count ?? 0;
    console.log(`Matches after: ${after}`);
  } catch (err) {
    console.error(
      "Error while clearing remote matches:",
      err && err.message ? err.message : err
    );
    process.exitCode = 1;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

main();
