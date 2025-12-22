const WHATSAPP = "50767908504";
const wa = (msg) => "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);

// Mapa: menú (singular) -> CSV (plural)
const CATEGORY_MAP = {
  collar: "collares",
  anillo: "anillos",
  arete: "aretes",
  brazalete: "brazaletes",
};

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
      id: `${category || "sin-cat"}-${name}`
        .toLowerCase()
        .replace(/\s+/g, "-"),
      name,
      desc,
      price: toNumberPrice(priceRaw),
      image: img,
      category: category || "sin-categoria",
    });
  }

  return items;
}
function animateGrid() {
  grid.style.opacity = "0";
  grid.style.transform = "translateY(6px)";
  grid.style.transition = "opacity 180ms ease, transform 180ms ease";
  requestAnimationFrame(() => {
    grid.style.opacity = "1";
    grid.style.transform = "translateY(0)";
  });
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
    list = list.filter((p) =>
      (`${p.name} ${p.desc}`).toLowerCase().includes(q)
    );
  }

  // orden
  const sort = sortSelect.value;
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "name-desc") list.sort((a, b) => b.name.localeCompare(a.name));

  // contador
  const resultsCount = document.getElementById("resultsCount");
  if (resultsCount) resultsCount.textContent = `${list.length} producto(s)`;

  // vacío
  if (list.length === 0) {
    grid.innerHTML = `<div style="padding:14px; color:rgba(17,17,17,.55);">No se encontraron productos.</div>`;

    return;
  }

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
     animateGrid();
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
  // menú hamburguesa (decláralo una vez)
  const burger = document.getElementById("burgerBtn");
  const side = document.getElementById("sideMenu");
  const backdrop = document.getElementById("menuBackdrop");
  const closeBtn = document.getElementById("closeMenuBtn");
  const sideCats = document.getElementById("sideCategories");

  function openMenu() {
    if (!side || !backdrop) return;
    side.classList.add("open");
    backdrop.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    if (!side || !backdrop) return;
    side.classList.remove("open");
    backdrop.classList.remove("show");
    document.body.style.overflow = "";
  }

  if (burger) burger.addEventListener("click", openMenu);
  if (backdrop) backdrop.addEventListener("click", closeMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  try {
    products = await loadCSV();
    renderChips();
    render();

    // Botón limpiar filtros
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        active = "all";
        search.value = "";
        sortSelect.value = "default";
        renderChips();
        render();
      });
    }

    search.addEventListener("input", render);
    sortSelect.addEventListener("change", render);

    // categorías dentro del menú
    if (sideCats) {
      const cats = ["arete", "anillo", "collar", "brazalete"];
      sideCats.innerHTML = cats
        .map((c) => `<button type="button" class="mc-side-item" data-c="${c}">${c}</button>`)
        .join("");

      sideCats.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-c]");
        if (!btn) return;

        const c = btn.dataset.c;
        const mapped = CATEGORY_MAP[c] || c;

        // Si el CSV NO tiene esa categoría, no forzamos 0:
        // (ej: CSV ya viene en singular)
        const exists = products.some((p) => p.category === mapped);
        active = exists ? mapped : c;

        renderChips();
        render();
        closeMenu();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  } catch (e) {
    console.error(e);
    grid.innerHTML = `<div style="padding:14px;color:#b00020;">Error cargando productos.csv</div>`;
  }
}

document.addEventListener("DOMContentLoaded", init);

