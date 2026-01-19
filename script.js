document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // CONFIG
  // =========================
  const WHATSAPP = "50767908504";
  const CART_KEY = "wm_cart_v1";

  // ✅ API BASE automático (LOCAL vs PRODUCCIÓN)
  const API_BASE =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
      ?"https://webmarcoral.onrender.com"
      : "https://webmarcoral.onrender.com"; // 👈 aquí va tu backend ya deployado

  const PRODUCTS_ENDPOINT = `${API_BASE}/api/products`;

  // 🔔 Ping para despertar Render (evita cold start)
fetch(API_BASE, { cache: "no-store" }).catch(() => {});

  window.__API_BASE__ = API_BASE;
  window.__PRODUCTS_ENDPOINT__ = PRODUCTS_ENDPOINT;

  const wa = (msg) =>
    "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);
  const $ = (id) => document.getElementById(id);

  // =========================
  // ELEMENTOS UI (CATÁLOGO)
  // =========================
  const chips = $("chips");
  const grid = $("grid");
  const search = $("searchInput");
  const sortSelect = $("sortSelect");
  const clearBtn = $("clearBtn");
  const resultsCount = $("resultsCount");

  // Menú lateral
  const burger = $("burgerBtn");
  const sideMenu = $("sideMenu");
  const menuBackdrop = $("menuBackdrop");
  const closeMenuBtn = $("closeMenuBtn");
  const sideCategories = $("sideCategories");

  // WhatsApp flotante
  const waFloat = $("waFloat");

  // =========================
  // ELEMENTOS UI (CARRITO)
  // =========================
  const cartBtn = $("cartBtn");
  const cartBadge = $("cartBadge");
  const cartOverlay = $("cartOverlay");
  const cartDrawer = $("cartDrawer");
  const cartClose = $("cartClose");
  const cartItems = $("cartItems");
  const cartTotal = $("cartTotal");
  const cartWhatsApp = $("cartWhatsApp");
  const cartClear = $("cartClear");
  const cartContinue = $("cartContinue");

  // =========================
  // ESTADO
  // =========================
  let products = [];
  let active = "all";
  let cart = loadCart();

  // Labels en plural
  const CATEGORY_LABELS = {
    arete: "Aretes",
    aretes: "Aretes",
    anillo: "Anillos",
    anillos: "Anillos",
    collar: "Collares",
    collares: "Collares",
    brazalete: "Brazaletes",
    brazaletes: "Brazaletes",
    all: "Todo",
  };

  // Normaliza categorías (singular/plural)
  function normalizeCategory(c) {
    const x = String(c || "").toLowerCase().trim();
    if (!x) return "sin-categoria";
    if (x === "arete") return "aretes";
    if (x === "anillo") return "anillos";
    if (x === "collar") return "collares";
    if (x === "brazalete") return "brazaletes";
    return x;
  }

  // =========================
  // HELPERS
  // =========================
  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ✅ money robusto (evita NaN => $0.00)
  function money(v) {
    const n = Number(v);
    return "$" + (Number.isFinite(n) ? n.toFixed(2) : "0.00");
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function updateWaFloatLink() {
    if (!waFloat) return;

    const label = CATEGORY_LABELS[active] || active;
    const msg =
      active && active !== "all"
        ? `Hola 😊 Estoy viendo la categoría "${label}" y quiero pedir.`
        : "Hola 😊 Quiero ver el catálogo Solea y pedir.";

    waFloat.href = wa(msg);
  }

  // =========================
  // MENÚ
  // =========================
  function openMenu() {
    if (!sideMenu || !menuBackdrop) return;
    sideMenu.classList.add("open");
    menuBackdrop.classList.add("show");
    document.body.classList.add("menu-open");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    if (!sideMenu || !menuBackdrop) return;
    sideMenu.classList.remove("open");
    menuBackdrop.classList.remove("show");
    document.body.classList.remove("menu-open");
    document.body.style.overflow = "";
  }

  burger?.addEventListener("click", openMenu);
  menuBackdrop?.addEventListener("click", closeMenu);
  closeMenuBtn?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // =========================
  // CARRITO (OPEN/CLOSE)
  // =========================
  function openCart() {
    if (!cartOverlay || !cartDrawer) return;
    cartOverlay.style.display = "block";
    cartDrawer.style.transform = "translateX(0)";
    closeMenu();
  }

  function closeCart() {
    if (!cartOverlay || !cartDrawer) return;
    cartOverlay.style.display = "none";
    cartDrawer.style.transform = "translateX(110%)";
  }

  cartBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCart();
  });

  cartClose?.addEventListener("click", closeCart);
  cartOverlay?.addEventListener("click", closeCart);
  cartContinue?.addEventListener("click", closeCart);

  // Vaciar sin confirm
  cartClear?.addEventListener("click", () => {
    if (cart.length === 0) return;
    cart = [];
    saveCart();
    renderCart();
  });

  // =========================
  // API -> PRODUCTS
  // =========================
  async function fetchProducts() {
    const res = await fetch(PRODUCTS_ENDPOINT, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(
        `No se pudo cargar productos desde la API (${res.status}). URL: ${PRODUCTS_ENDPOINT}`
      );
    }

    const data = await res.json();

    // Adapta aquí según tu backend/Supabase
    return (Array.isArray(data) ? data : [])
      .map((p) => {
        const id = p.id ?? p.uuid ?? p.product_id ?? `${p.name || p.producto}-${p.price_cents || p.price || p.precio}`;

        const name = p.name ?? p.producto ?? "";
        const desc = p.description ?? p.descripcion ?? "";
        const price =
         Number.isFinite(Number(p.price_cents))
          ? Number(p.price_cents) / 100
          : (Number(p.price ?? p.precio) || 0);

        const image = p.image_url ?? p.imagen ?? "";
        const category = normalizeCategory(p.category ?? p.categoria ?? "collares");

        return { id, name, desc, price, image, category };
      })
      .filter((p) => p.name);
  }

  // =========================
  // UI: CHIPS + GRID
  // =========================
  function renderChips() {
    if (!chips) return;

    const set = new Set(products.map((p) => p.category).filter(Boolean));
    set.delete("sin-categoria");

    const cats = ["all", ...Array.from(set).sort()];

    chips.innerHTML = cats
      .map((c) => {
        const label = CATEGORY_LABELS[c] || c;
        return `<button class="chip ${
          active === c ? "active" : ""
        }" data-c="${c}">
          ${c === "all" ? "Todo" : label}
        </button>`;
      })
      .join("");

    chips.querySelectorAll("button").forEach((b) => {
      b.onclick = () => {
        active = b.dataset.c;
        render();
        updateWaFloatLink();
      };
    });
  }

  function renderSideCategories() {
    if (!sideCategories) return;

    const cats = ["aretes", "anillos", "collares", "brazaletes"];
    sideCategories.innerHTML = cats
      .map(
        (c) =>
          `<button type="button" class="mc-side-item" data-c="${c}">${
            CATEGORY_LABELS[c] || c
          }</button>`
      )
      .join("");

    sideCategories.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-c]");
      if (!btn) return;

      active = btn.dataset.c;
      renderChips();
      render();
      updateWaFloatLink();
      closeMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function animateGrid() {
    if (!grid) return;
    grid.style.opacity = "0";
    grid.style.transform = "translateY(6px)";
    grid.style.transition = "opacity 180ms ease, transform 180ms ease";
    requestAnimationFrame(() => {
      grid.style.opacity = "1";
      grid.style.transform = "translateY(0)";
    });
  }

  function render() {
    if (!grid) return;

    let list = [...products];

    // filtro por categoría
    if (active !== "all") list = list.filter((p) => p.category === active);

    // búsqueda
    const q = (search?.value || "").toLowerCase().trim();
    if (q)
      list = list.filter((p) =>
        (`${p.name} ${p.desc}`).toLowerCase().includes(q)
      );

    // orden
    const sort = sortSelect?.value || "default";
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "name-desc") list.sort((a, b) => b.name.localeCompare(a.name));

    // contador
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
          <div class="placeholder">Solea</div>
          <div class="info">
            <strong>${escapeHtml(p.name)}</strong>
            <span class="price">${money(p.price)}</span>

            <button class="btn primary" type="button"
              data-add
              data-id="${escapeHtml(p.id)}"
              data-name="${escapeHtml(p.name)}"
              data-price="${Number(p.price) || 0}"
              data-image="${escapeHtml(p.image || "")}">
              Agregar al carrito
            </button>
          </div>
        </div>
      `
      )
      .join("");

    animateGrid();
  }

  // Delegación click en grid -> addToCart
  grid?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-add]");
    if (!btn) return;

    addToCart({
      id: btn.dataset.id,
      name: btn.dataset.name,
      price: Number(btn.dataset.price) || 0,
      image: btn.dataset.image || "",
    });
  });

  clearBtn?.addEventListener("click", () => {
    active = "all";
    if (search) search.value = "";
    if (sortSelect) sortSelect.value = "default";
    renderChips();
    render();
    updateWaFloatLink();
  });

  search?.addEventListener("input", () => {
    render();
    updateWaFloatLink();
  });

  sortSelect?.addEventListener("change", render);

  // =========================
  // CARRITO: RENDER + ACCIONES
  // =========================
  function setBadge() {
    if (!cartBadge) return;
    const qty = cart.reduce((a, i) => a + (i.qty || 0), 0);
    cartBadge.style.display = qty > 0 ? "inline-block" : "none";
    cartBadge.textContent = qty > 0 ? qty : "";
  }

  function getTotal() {
    return cart.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (i.qty || 0),
      0
    );
  }

  function renderCart() {
    if (!cartItems || !cartTotal) return;

    if (cart.length === 0) {
      cartItems.innerHTML = `<div style="color:#6b7280">Tu carrito está vacío.</div>`;
      cartTotal.textContent = money(0);
      setBadge();
      return;
    }

    cartItems.innerHTML = cart
      .map(
        (item) => `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f1f5f9">
          <img src="${item.image || ""}" alt="" style="width:52px;height:52px;border-radius:10px;object-fit:cover;background:#f3f4f6" onerror="this.style.display='none'">
          <div style="flex:1">
            <b style="display:block;margin-bottom:4px">${escapeHtml(
              item.name
            )}</b>
            <div style="color:#6b7280;font-size:12px">${money(
              item.price
            )} c/u</div>

            <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
              <button data-act="dec" data-id="${escapeHtml(
                item.id
              )}" style="padding:6px 10px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;cursor:pointer">-</button>
              <b>${item.qty}</b>
              <button data-act="inc" data-id="${escapeHtml(
                item.id
              )}" style="padding:6px 10px;border-radius:10px;border:1px solid #e5e7eb;background:#fff;cursor:pointer">+</button>

              <button data-act="rm" data-id="${escapeHtml(
                item.id
              )}" style="margin-left:auto;padding:6px 10px;border-radius:10px;border:1px solid #fee2e2;background:#fff;color:#dc2626;cursor:pointer">Quitar</button>
            </div>
          </div>
        </div>
      `
      )
      .join("");

    cartTotal.textContent = money(getTotal());
    setBadge();
  }

  cartItems?.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.getAttribute("data-id");
    const act = btn.getAttribute("data-act");
    const idx = cart.findIndex((i) => String(i.id) === String(id));
    if (idx < 0) return;

    if (act === "inc") cart[idx].qty += 1;
    if (act === "dec") cart[idx].qty = Math.max(1, cart[idx].qty - 1);
    if (act === "rm") cart.splice(idx, 1);

    saveCart();
    renderCart();
  });

  cartWhatsApp?.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    const lines = cart.map((i) => `• ${i.name} x${i.qty} — ${money(i.price)}`);
    const total = money(getTotal());
    const msg = `Hola, quiero hacer un pedido:
${lines.join("\n")}

Total: ${total}
¿Me confirmas disponibilidad y método de entrega?`;

    window.open(wa(msg), "_blank");
  });

  function addToCart(product) {
    const id = product.id;
    const idx = cart.findIndex((i) => String(i.id) === String(id));

    if (idx >= 0) cart[idx].qty += 1;
    else
      cart.push({
        id,
        name: product.name,
        price: Number(product.price) || 0,
        image: product.image || "",
        qty: 1,
      });

    saveCart();
    renderCart();
    openCart();
  }

  // Exponer por si lo llamas desde otro lado
  window.addToCart = addToCart;

  // =========================
  // INIT FINAL
  // =========================
  (async function boot() {
    try {
      products = await fetchProducts();
      products = products.map((p) => ({
        ...p,
        category: normalizeCategory(p.category),
      }));

      renderSideCategories();
      renderChips();
      render();
      updateWaFloatLink();
      renderCart();
    } catch (e) {
      console.error(e);
      if (grid)
        grid.innerHTML = `<div style="padding:14px;color:#b00020;">Error cargando productos (API).</div>`;
    }
  })();
});
