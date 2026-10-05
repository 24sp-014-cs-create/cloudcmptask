import { getDatabase } from "@netlify/database";

const headers = { "content-type": "application/json; charset=utf-8" };

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

  try {
    const db = getDatabase();

    if (method === "GET") {
      const items = await db.sql`
        SELECT id, name, details, created_at
        FROM cloud_items
        ORDER BY created_at DESC, id DESC
      `;
      return respond(items);
    }

    if (method === "POST") {
      await db.sql`
        INSERT INTO cloud_items (name, details)
        VALUES (${input.name}, ${input.details})
      `;
      return respond({ ok: true }, 201);
    }

    if (method === "PUT") {
      const updated = await db.sql`
        UPDATE cloud_items
        SET name = ${input.name}, details = ${input.details}
        WHERE id = ${id}
        RETURNING id
      `;
      if (updated.length === 0) return respond({ error: "Item not found." }, 404);
      return respond({ ok: true });
    }

    const deleted = await db.sql`
      DELETE FROM cloud_items
      WHERE id = ${id}
      RETURNING id
    `;
    if (deleted.length === 0) return respond({ error: "Item not found." }, 404);
    return respond({ ok: true });
  } catch (error) {
    console.error("Items function failed", error);
    return respond({ error: "The database request failed. Check the function logs." }, 500);
  }
}