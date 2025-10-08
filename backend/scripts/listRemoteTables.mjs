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
    const res = await client.query(
      "SELECT schemaname, tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname, tablename"
    );
    if (res.rows.length === 0) {
      console.log("No user tables found.");
    } else {
      console.log("User tables:");
      for (const r of res.rows) {
        console.log(`- ${r.schemaname}.${r.tablename}`);
      }
    }
  } catch (err) {
    console.error(
      "Error listing tables:",
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
