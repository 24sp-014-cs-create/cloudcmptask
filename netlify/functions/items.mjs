import oracledb from "oracledb";

const headers = { "content-type": "application/json; charset=utf-8" };
let poolPromise;

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function getId(request) {
  const value = new URL(request.url).searchParams.get("id");
  if (!value || !/^\d+$/.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function readItem(request) {
  let item;
  try {
    item = await request.json();
  } catch {
    return { error: "Request body must be valid JSON." };
  }

  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return { error: "Request body must be a JSON object." };
  }

  if (typeof item.name !== "string" || !item.name.trim()) {
    return { error: "Name is required." };
  }
  if (item.name.trim().length > 200) {
    return { error: "Name must be 200 characters or fewer." };
  }
  if (item.details != null && typeof item.details !== "string") {
    return { error: "Details must be text." };
  }
  if (item.details?.length > 4000) {
    return { error: "Details must be 4000 characters or fewer." };
  }

  return { name: item.name.trim(), details: item.details?.trim() || null };
}

async function getPool() {
  if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_CONNECT_STRING) {
    throw new Error("Database environment variables are not configured.");
  }

  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionString: process.env.DB_CONNECT_STRING,
      poolMin: 0,
      poolMax: 2,
      poolIncrement: 1,
    });
  }

  try {
    return await poolPromise;
  } catch (error) {
    poolPromise = undefined;
    throw error;
  }
}

export default async function handler(request) {
  const method = request.method.toUpperCase();
  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
    return respond({ error: "Method not allowed." }, 405);
  }

  let input;
  if (method === "POST" || method === "PUT") {
    input = await readItem(request);
    if (input.error) return respond({ error: input.error }, 400);
  }

  const id = method === "PUT" || method === "DELETE" ? getId(request) : null;
  if ((method === "PUT" || method === "DELETE") && !id) {
    return respond({ error: "A valid item id is required." }, 400);
  }

  let connection;
  try {
    const pool = await getPool();
    connection = await pool.getConnection();

    if (method === "GET") {
      const result = await connection.execute(
        "SELECT ID, NAME, DETAILS, CREATED_AT FROM CLOUD_ITEMS ORDER BY CREATED_AT DESC, ID DESC",
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return respond(result.rows);
    }

    if (method === "POST") {
      await connection.execute(
        "INSERT INTO CLOUD_ITEMS (NAME, DETAILS) VALUES (:name, :details)",
        input,
        { autoCommit: true },
      );
      return respond({ ok: true }, 201);
    }

    if (method === "PUT") {
      const result = await connection.execute(
        "UPDATE CLOUD_ITEMS SET NAME = :name, DETAILS = :details WHERE ID = :id",
        { ...input, id },
        { autoCommit: true },
      );
      if (result.rowsAffected === 0) return respond({ error: "Item not found." }, 404);
      return respond({ ok: true });
    }

    const result = await connection.execute(
      "DELETE FROM CLOUD_ITEMS WHERE ID = :id",
      { id },
      { autoCommit: true },
    );
    if (result.rowsAffected === 0) return respond({ error: "Item not found." }, 404);
    return respond({ ok: true });
  } catch (error) {
    console.error("Items function failed", error);
    return respond({ error: "The database request failed. Check the function logs." }, 500);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Could not release database connection", error);
      }
    }
  }
}