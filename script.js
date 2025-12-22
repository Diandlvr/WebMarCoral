const WHATSAPP = "50767908504";
const wa = (msg) => "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);

let products = [];
let active = "all";

const chips = document.getElementById("chips");
const grid = document.getElementById("grid");
const search = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

// --- CSV helpers ---
function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur.trim());
  return out;
}

function toNumberPrice(v) {
  if (v == null) return 0;
  const s = String(v).replace(/\$/g, "").replace(/\s/g, "").replace(/,/g, ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

async function loadCSV() {
  const res = await fetch("./productos.csv", { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar productos.csv");

  const text = await res.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
  const idx = {
    producto: headers.indexOf("producto"),
    descripcion: headers.indexOf("descripcion"),
    precio: headers.indexOf("precio"),
    imagen: headers.indexOf("imagen"),
    categoria: headers.indexOf("categoria"),
  };

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);

    const name = cols[idx.producto] ?? "";
    const desc = cols[idx.descripcion] ?? "";
    const priceRaw = cols[idx.precio] ?? "";
    const img = cols[idx.imagen] ?? "";
    const category = (cols[idx.categoria] ?? "").toLowerCase().trim();

    if (!name && !desc && !priceRaw && !img && !category) continue;

    items.push({
      id: `${category || "sin-cat"}-${name}`.toLowerCase().replace(/\s+/g, "-"),
      name,
      desc,
      price: toNumberPrice(priceRaw),
      image: img,
      category: category || "sin-categoria",
    });
  }

  return items;
}

// --- UI ---
function renderChips() {
  const set = new Set(products.map((p) => p.category));
  const cats = ["all", ...Array.from(set).sort()];

  chips.innerHTML = cats
    .map(
      (c) => `
      <button class="chip ${active === c ? "active" : ""}" data-c="${c}">
        ${c === "all" ? "Todo" : c}
      </button>`
    )
    .join("");

  chips.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      active = b.dataset.c;
      render();
    };
  });
}

function render() {
  let list = [...products];

  // filtro por categoría
  if (active !== "all") {
    list = list.filter((p) => p.category === active);
  }

  // búsqueda
  const q = (search.value || "").toLowerCase().trim();
  if (q) {
    list = list.filter((p) => (`${p.name} ${p.desc}`).toLowerCase().includes(q));
  }

  // orden
  const sort = sortSelect.value;
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "name-desc") list.sort((a, b) => b.name.localeCompare(a.name));

  // render cards
  grid.innerHTML = list
    .map(
      (p) => `
      <div class="card">
        <div class="placeholder">Soleil</div>
        <div class="info">
          <strong>${escapeHtml(p.name)}</strong>
          <span class="price">$${p.price.toFixed(2)}</span>
          <a class="btn primary" target="_blank"
             href="${wa(`Hola Soleil, quiero pedir: ${p.name} - $${p.price.toFixed(2)}`)}">
            Pedir por WhatsApp
          </a>
        </div>
      </div>
    `
    )
    .join("");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function init() {
  try {
    products = await loadCSV();
    renderChips();
    render();
    search.addEventListener("input", render);
    sortSelect.addEventListener("change", render);
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div style="padding:14px;color:#b00020;">Error cargando productos.csv</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
