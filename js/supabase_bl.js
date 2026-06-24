// ============================================================
//  supabase.js — Configuration & helpers Supabase
//  ESAT Alter Ego APAJH — Gestion des bons de livraison
// ============================================================
//
//  INSTALLATION :
//  1. Créez un projet sur https://supabase.com
//  2. Remplacez SUPABASE_URL et SUPABASE_ANON_KEY ci-dessous
//  3. Exécutez le SQL de création de table (voir section SQL)
//  4. Incluez ce fichier dans vos pages HTML :
//     <script src="supabase.js"></script>
//
// ============================================================
//  SQL À EXÉCUTER DANS SUPABASE (SQL Editor) :
// ============================================================
/*
  create table bons_livraison (
    id            uuid primary key default gen_random_uuid(),
    created_at    timestamptz default now(),
    sens          text,
    client        text,
    client_id     uuid references clients(id),
    date_reception date,
    date_livraison date,

    -- Quantités annoncées par le client
    qt_qt_client_housse_chaise   integer default 0,
    qt_qt_client_sac_linge        integer default 0,
    qt_qt_client_nappe_2_4        integer default 0,
    qt_qt_client_nappe_230_beige  integer default 0,
    qt_qt_client_nappe_240_blanc  integer default 0,
    qt_qt_client_nappe_12_24      integer default 0,
    qt_qt_client_veste_cuisine    integer default 0,
    qt_qt_client_pantalon         integer default 0,
    qt_qt_client_toque            integer default 0,
    qt_qt_client_chemin_table     integer default 0,
    qt_qt_client_serviette        integer default 0,
    qt_qt_client_torchon          integer default 0,
    qt_qt_client_tablier          integer default 0,
    total_qt_client               integer default 0,

    -- Quantités arrivée ESAT
    qt_arrivee_housse_chaise   integer default 0,
    qt_arrivee_sac_linge        integer default 0,
    qt_arrivee_nappe_2_4        integer default 0,
    qt_arrivee_nappe_230_beige  integer default 0,
    qt_arrivee_nappe_240_blanc  integer default 0,
    qt_arrivee_nappe_12_24      integer default 0,
    qt_arrivee_veste_cuisine    integer default 0,
    qt_arrivee_pantalon         integer default 0,
    qt_arrivee_toque            integer default 0,
    qt_arrivee_chemin_table     integer default 0,
    qt_arrivee_serviette        integer default 0,
    qt_arrivee_torchon          integer default 0,
    qt_arrivee_tablier          integer default 0,
    obs_arrivee                 text,

    -- Quantités départ ESAT
    qt_depart_housse_chaise    integer default 0,
    qt_depart_sac_linge         integer default 0,
    qt_depart_nappe_2_4         integer default 0,
    qt_depart_nappe_230_beige   integer default 0,
    qt_depart_nappe_240_blanc   integer default 0,
    qt_depart_nappe_12_24       integer default 0,
    qt_depart_veste_cuisine     integer default 0,
    qt_depart_pantalon          integer default 0,
    qt_depart_toque             integer default 0,
    qt_depart_chemin_table      integer default 0,
    qt_depart_serviette         integer default 0,
    qt_depart_torchon           integer default 0,
    qt_depart_tablier           integer default 0,
    obs_depart                  text,

    -- Quantité BL & observations finales
    qt_bl                       integer default 0,
    obs_bl                      text,
    signature_controleur        text,
    total_arrivee               integer default 0,
    total_depart                integer default 0
  );

  -- Politique RLS (à adapter selon vos besoins d'auth)
  alter table bons_livraison enable row level security;
  create policy "Accès public lecture" on bons_livraison for select using (true);
  create policy "Accès public insertion" on bons_livraison for insert with check (true);
  create policy "Accès public mise à jour" on bons_livraison for update using (true);
  create policy "Accès public suppression" on bons_livraison for delete using (true);

  -- ──────────────────────────────────────────────────────────
  -- TABLE CLIENTS — modèles de bon de livraison par client
  -- ──────────────────────────────────────────────────────────
  create table clients (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz default now(),
    updated_at  timestamptz default now(),
    name        text not null unique,
    type        text,              -- ex. "Restauration", "Foyer", "Hôtellerie"...
    articles    jsonb not null default '[]'::jsonb,  -- [{label, code, key, active}]
    notes       text
  );

  alter table clients enable row level security;
  create policy "Accès public lecture clients"     on clients for select using (true);
  create policy "Accès public insertion clients"   on clients for insert with check (true);
  create policy "Accès public mise à jour clients" on clients for update using (true);
  create policy "Accès public suppression clients" on clients for delete using (true);

  -- ──────────────────────────────────────────────────────────
  -- MIGRATION — si la table bons_livraison existe déjà SANS client_id,
  -- exécutez cette ligne après avoir créé la table clients ci-dessus :
  -- ──────────────────────────────────────────────────────────
  alter table bons_livraison add column if not exists client_id uuid references clients(id);
*/

// ============================================================
//  CONFIGURATION — À MODIFIER
// ============================================================
const SUPABASE_URL      = "https://VOTRE_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "VOTRE_ANON_KEY";

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
//  HELPERS CRUD
// ============================================================

/**
 * Enregistre un nouveau bon de livraison.
 * @param {Object} data — Les champs du bon (voir structure table ci-dessus)
 * @returns {Promise<{data, error}>}
 */
async function saveBonLivraison(data) {
  const client = getClient();
  const { data: result, error } = await client
    .from("bons_livraison")
    .insert([data])
    .select()
    .single();
  return { data: result, error };
}

/**
 * Récupère tous les bons de livraison, du plus récent au plus ancien.
 * @returns {Promise<{data, error}>}
 */
async function getAllBons() {
  const client = getClient();
  const { data, error } = await client
    .from("bons_livraison")
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
    .from("bons_livraison")
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
    .from("bons_livraison")
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
    .from("bons_livraison")
    .delete()
    .eq("id", id);
  return { error };
}

/**
 * Recherche des bons par client ou atelier.
 * @param {string} term — Terme de recherche
 * @returns {Promise<{data, error}>}
 */
async function searchBons(term) {
  const client = getClient();
  const { data, error } = await client
    .from("bons_livraison")
    .select("*")
    .or(`client.ilike.%${term}%,atelier.ilike.%${term}%,sens.ilike.%${term}%`)
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
    saveBonLivraison,
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
