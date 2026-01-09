import express from "express";
import cors from "cors";
import { supabase } from "./lib/supabaseClient.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ================= ADMIN MIDDLEWARE =================
function requireAdmin(req, res, next) {
  const token = req.header("x-admin-token");

  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ error: "ADMIN_TOKEN not configured" });
  }

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}


// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API running - ADMIN VERSION");
});

// Obtener productos
app.get("/api/products", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, description, price_cents, currency, image_url, is_active");

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// ================= ADMIN ROUTES =================

// Admin: listar todos los productos
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Admin: crear producto
app.post("/api/admin/products", requireAdmin, async (req, res) => {
  const { name, description, price_cents, currency, image_url, is_active } = req.body;

  const payload = {
    name,
    description: description ?? null,
    price_cents: Number(price_cents),
    currency: currency || "USD",
    image_url: image_url ?? null,
    is_active: is_active ?? true,
  };

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Admin: editar producto
app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  const allowed = ["name", "description", "price_cents", "currency", "image_url", "is_active"];
  const updates = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = key === "price_cents"
        ? Number(req.body[key])
        : req.body[key];
    }
  }

  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Admin: borrar producto
app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
});


app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
