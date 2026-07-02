// ============================================================
//  supabase_conditionnement.js — Configuration & helpers Supabase
//  ESAT Alter Ego APAJH — Gestion des bons de conditionnement
//  (Projet Supabase séparé de celui du linge)
// ============================================================
//
//  INSTALLATION :
//  1. Créez un NOUVEAU projet sur https://supabase.com
//  2. Remplacez SUPABASE_URL et SUPABASE_ANON_KEY ci-dessous
//  3. Exécutez le SQL de création de table (voir section SQL)
//  4. Incluez ce fichier dans vos pages HTML :
//     <script src="js/supabase_conditionnement.js"></script>
//
// ============================================================
//  SQL À EXÉCUTER DANS SUPABASE (SQL Editor) :
//
//  Schéma aligné sur ce que le JS envoie réellement (objets JSONB
//  groupés par étape), pas sur des colonnes plates par article —
//  contrairement au commentaire de l'ancien supabase_bl.js, qui ne
//  correspond pas à ce que collectFormData() envoie. Vérifiez le
//  schéma effectif de votre table bons_livraison si vous voulez
//  comparer.
// ============================================================
/*
  -- ──────────────────────────────────────────────────────────
  -- TABLE CLIENTS — modèles de bon par client (conditionnement)
  -- ──────────────────────────────────────────────────────────
  create table clients (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz default now(),
    updated_at  timestamptz default now(),
    name        text not null unique,
    type        text,              -- ex. "Industrie", "Cosmétique"...
    articles    jsonb not null default '[]'::jsonb,  -- [{label, code, key, active}]
    notes       text
  );

  alter table clients enable row level security;
  create policy "Accès public lecture clients"     on clients for select using (true);
  create policy "Accès public insertion clients"   on clients for insert with check (true);
  create policy "Accès public mise à jour clients" on clients for update using (true);
  create policy "Accès public suppression clients" on clients for delete using (true);

  -- ──────────────────────────────────────────────────────────
  -- TABLE BONS_CONDITIONNEMENT
  -- 4 étapes : qt_client (annoncé) → qt_reception (matière reçue)
  --          → qt_conditionne (produit conditionné) → qt_bl (livré)
  -- ──────────────────────────────────────────────────────────
  create table bons_conditionnement (
    id                    uuid primary key default gen_random_uuid(),
    created_at            timestamptz default now(),
    client_id             uuid references clients(id),
    client                text,
    date_reception        date,
    date_livraison        date,

    qt_client             jsonb default '{}'::jsonb,
    qt_reception          jsonb default '{}'::jsonb,
    qt_conditionne        jsonb default '{}'::jsonb,
    qt_bl                 jsonb default '{}'::jsonb,

    total_qt_client       integer default 0,
    total_reception       integer default 0,
    total_conditionne     integer default 0,
    total_bl              integer default 0,

    obs_reception         text,
    obs_bl                text,
    signature_controleur  text
  );

  alter table bons_conditionnement enable row level security;
  create policy "Accès public lecture" on bons_conditionnement for select using (true);
  create policy "Accès public insertion" on bons_conditionnement for insert with check (true);
  create policy "Accès public mise à jour" on bons_conditionnement for update using (true);
  create policy "Accès public suppression" on bons_conditionnement for delete using (true);

  -- ATTENTION : ces policies autorisent lecture/écriture/suppression à
  -- quiconque possède la clé anon (identique au projet linge existant).
  -- Correct uniquement si l'app reste en usage interne non exposée
  -- publiquement. Si ce nouveau projet est accessible depuis internet,
  -- reconsidérez une auth avant mise en prod.
*/

// ============================================================
//  CONFIGURATION — À MODIFIER (nouveau projet Supabase, distinct
//  de celui du linge)
// ============================================================
const SUPABASE_URL      = "https://rfirfcpsjoushvhtbyqk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaXJmY3Bzam91c2h2aHRieXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NTMzOTUsImV4cCI6MjA5NDAyOTM5NX0.TgtvfWzBoNA1hjpLlgR57RbqBKPg9fzdjcJEIffbtfg";      // ← ligne 3 : coller votre Anon public key ici;

// ============================================================
//  CLIENT SUPABASE (via CDN, chargé dans le HTML)
// ============================================================
// Les pages HTML doivent inclure avant ce script :
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

let _client = null;

function getClient() {
  if (!_client) {
    if (typeof supabase === "undefined") {
      throw new Error("Supabase SDK non chargé. Vérifiez le tag <script> dans votre HTML.");
    }
    _client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _client;
}

// ============================================================
//  HELPERS CRUD — BONS DE CONDITIONNEMENT
// ============================================================

/**
 * Enregistre un nouveau bon de conditionnement.
 * @param {Object} data — Les champs du bon (voir structure table ci-dessus)
 * @returns {Promise<{data, error}>}
 */
async function saveBonConditionnement(data) {
  const client = getClient();
  const { data: result, error } = await client
    .from("bons_conditionnement")
    .insert([data])
    .select()
    .single();
  return { data: result, error };
}

/**
 * Récupère tous les bons de conditionnement, du plus récent au plus ancien.
 * @returns {Promise<{data, error}>}
 */
async function getAllBons() {
  const client = getClient();
  const { data, error } = await client
    .from("bons_conditionnement")
    .select("*")
    .order("created_at", { ascending: false });
  return { data, error };
}

/**
 * Récupère un bon par son ID.
 * @param {string} id
 * @returns {Promise<{data, error}>}
 */
async function getBonById(id) {
  const client = getClient();
  const { data, error } = await client
    .from("bons_conditionnement")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

/**
 * Met à jour un bon existant.
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<{data, error}>}
 */
async function updateBon(id, updates) {
  const client = getClient();
  const { data, error } = await client
    .from("bons_conditionnement")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

/**
 * Supprime un bon par son ID.
 * @param {string} id
 * @returns {Promise<{error}>}
 */
async function deleteBon(id) {
  const client = getClient();
  const { error } = await client
    .from("bons_conditionnement")
    .delete()
    .eq("id", id);
  return { error };
}

/**
 * Recherche des bons par nom de client.
 * @param {string} term — Terme de recherche
 * @returns {Promise<{data, error}>}
 */
async function searchBons(term) {
  const client = getClient();
  const { data, error } = await client
    .from("bons_conditionnement")
    .select("*")
    .ilike("client", `%${term}%`)
    .order("created_at", { ascending: false });
  return { data, error };
}

// ============================================================
//  HELPERS CRUD — CLIENTS (modèles de bon par client)
// ============================================================

/**
 * Récupère tous les clients, triés par nom.
 * @returns {Promise<{data, error}>}
 */
async function getAllClients() {
  const client = getClient();
  const { data, error } = await client
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  return { data, error };
}

/**
 * Récupère un client par son ID.
 * @param {string} id
 * @returns {Promise<{data, error}>}
 */
async function getClientById(id) {
  const client = getClient();
  const { data, error } = await client
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

/**
 * Récupère un client par son nom exact (insensible à la casse).
 * @param {string} name
 * @returns {Promise<{data, error}>}
 */
async function getClientByName(name) {
  const client = getClient();
  const { data, error } = await client
    .from("clients")
    .select("*")
    .ilike("name", name)
    .maybeSingle();
  return { data, error };
}

/**
 * Enregistre un nouveau client avec son modèle d'articles.
 * @param {Object} data — { name, type, articles, notes }
 * @returns {Promise<{data, error}>}
 */
async function saveClient(data) {
  const client = getClient();
  const { data: result, error } = await client
    .from("clients")
    .insert([data])
    .select()
    .single();
  return { data: result, error };
}

/**
 * Met à jour un client existant (nom, type, articles, notes).
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<{data, error}>}
 */
async function updateClient(id, updates) {
  const client = getClient();
  const { data, error } = await client
    .from("clients")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

/**
 * Supprime un client.
 * @param {string} id
 * @returns {Promise<{error}>}
 */
async function deleteClient(id) {
  const client = getClient();
  const { error } = await client
    .from("clients")
    .delete()
    .eq("id", id);
  return { error };
}

/**
 * Recherche des clients par nom ou type (pour l'autocomplétion).
 * @param {string} term
 * @returns {Promise<{data, error}>}
 */
async function searchClients(term) {
  const client = getClient();
  const { data, error } = await client
    .from("clients")
    .select("*")
    .or(`name.ilike.%${term}%,type.ilike.%${term}%`)
    .order("name", { ascending: true });
  return { data, error };
}

// ============================================================
//  EXPORT (si utilisé avec un bundler)
// ============================================================
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    saveBonConditionnement,
    getAllBons,
    getBonById,
    updateBon,
    deleteBon,
    searchBons,
    getAllClients,
    getClientById,
    getClientByName,
    saveClient,
    updateClient,
    deleteClient,
    searchClients,
    getClient,
  };
}
