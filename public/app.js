const apiUrl = "/.netlify/functions/items";
const itemsList = document.querySelector("#items-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const dialog = document.querySelector("#item-dialog");
const form = document.querySelector("#item-form");
const nameInput = document.querySelector("#name-input");
const detailsInput = document.querySelector("#details-input");
const itemIdInput = document.querySelector("#item-id");
const formError = document.querySelector("#form-error");
const toast = document.querySelector("#toast");
let items = [];
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

async function request(url = apiUrl, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "content-type": "application/json", ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Something went wrong.");
  return result;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function makeCell(className, text) {
  const cell = document.createElement("span");
  cell.className = className;
  cell.textContent = text || "—";
  return cell;
}

function renderItems() {
  itemsList.querySelectorAll(".item-row").forEach((row) => row.remove());
  const query = searchInput.value.trim().toLocaleLowerCase();
  const visibleItems = items.filter((item) =>
    `${item.NAME} ${item.DETAILS || ""}`.toLocaleLowerCase().includes(query),
  );

  emptyState.hidden = visibleItems.length > 0;
  if (items.length === 0) {
    emptyState.querySelector("p").textContent = "No items yet. Add your first one.";
  } else if (visibleItems.length === 0) {
    emptyState.querySelector("p").textContent = "No items match that search.";
  }

  for (const item of visibleItems) {
    const row = document.createElement("article");
    row.className = "item-row";
    row.append(
      makeCell("item-name", item.NAME),
      makeCell("item-details", item.DETAILS),
      makeCell("item-date", formatDate(item.CREATED_AT)),
    );

    const actions = document.createElement("div");
    actions.className = "item-actions";
    const editButton = document.createElement("button");
    editButton.className = "row-action";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${item.NAME}`);
    editButton.addEventListener("click", () => openDialog(item));

    const deleteButton = document.createElement("button");
    deleteButton.className = "row-action row-action-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${item.NAME}`);
    deleteButton.addEventListener("click", () => deleteItem(item));
    actions.append(editButton, deleteButton);
    row.append(actions);
    itemsList.append(row);
  }

  document.querySelector("#item-count").textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
}

async function loadItems() {
  const label = document.querySelector("#connection-label");
  const dot = document.querySelector("#connection-dot");
  label.textContent = "Connecting";
  dot.classList.remove("is-online", "is-offline");
  try {
    items = await request();
    label.textContent = "Database connected";
    dot.classList.add("is-online");
    renderItems();
  } catch (error) {
    label.textContent = "Connection issue";
    dot.classList.add("is-offline");
    emptyState.hidden = false;
    emptyState.querySelector("p").textContent = error.message;
    document.querySelector("#item-count").textContent = "Unavailable";
  }
}

function openDialog(item = null) {
  form.reset();
  formError.textContent = "";
  itemIdInput.value = item?.ID || "";
  nameInput.value = item?.NAME || "";
  detailsInput.value = item?.DETAILS || "";
  document.querySelector("#dialog-title").textContent = item ? "Edit item" : "Add an item";
  document.querySelector("#dialog-eyebrow").textContent = item ? "UPDATE ENTRY" : "NEW ENTRY";
  document.querySelector("#save-button").textContent = item ? "Save changes" : "Save item";
  dialog.showModal();
  nameInput.focus();
}

async function deleteItem(item) {
  if (!window.confirm(`Delete “${item.NAME}”? This cannot be undone.`)) return;
  try {
    await request(`${apiUrl}?id=${encodeURIComponent(item.ID)}`, { method: "DELETE" });
    showToast("Item deleted");
    await loadItems();
  } catch (error) {
    showToast(error.message);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = itemIdInput.value;
  const button = document.querySelector("#save-button");
  button.disabled = true;
  button.textContent = "Saving…";
  formError.textContent = "";

  try {
    await request(id ? `${apiUrl}?id=${encodeURIComponent(id)}` : apiUrl, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({ name: nameInput.value, details: detailsInput.value }),
    });
    dialog.close();
    showToast(id ? "Changes saved" : "Item added");
    await loadItems();
  } catch (error) {
    formError.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = id ? "Save changes" : "Save item";
  }
});

document.querySelector("#add-button").addEventListener("click", () => openDialog());
document.querySelector("#refresh-button").addEventListener("click", loadItems);
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancel-button").addEventListener("click", () => dialog.close());
searchInput.addEventListener("input", renderItems);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

loadItems();