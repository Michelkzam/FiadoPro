import { supabase } from "./supabase";

const AUTH_TOKEN_KEY = "fiadopro_auth_token";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const getStoredToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

const storeTokens = (accessToken) => {
  if (accessToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  }
};

const clearTokens = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

const handleSupabaseError = (error) => {
  throw new ApiError(error.message || "Erro na operação", error.status || 500, error);
};

export const auth = {
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) handleSupabaseError(error);
    storeTokens(data.session?.access_token);
    return { accessToken: data.session?.access_token, refreshToken: data.session?.refresh_token, user: data.user };
  },

  register: async (userData) => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
    });
    if (error) handleSupabaseError(error);
    if (data.session) {
      storeTokens(data.session.access_token);
    }
    return { accessToken: data.session?.access_token, user: data.user };
  },

  logout: async () => {
    await supabase.auth.signOut();
    clearTokens();
  },

  me: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new ApiError("Não autenticado", 401);
    return user;
  },

  forgotPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) handleSupabaseError(error);
    return { success: true };
  },

  resetPassword: async (token, password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) handleSupabaseError(error);
    return { success: true };
  },

  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },
};

export const createEntityService = (tableName) => ({
  list: async (sortBy = "created_at", limit = 100, offset = 0) => {
    const descending = sortBy.startsWith("-");
    const field = sortBy.replace("-", "");
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .order(field, { ascending: !descending })
      .range(offset, offset + limit - 1);
    if (error) handleSupabaseError(error);
    return data || [];
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", id)
      .single();
    if (error) handleSupabaseError(error);
    return data;
  },

  filter: async (filters, sortBy = "created_at", limit = 100, offset = 0) => {
    const descending = sortBy.startsWith("-");
    const field = sortBy.replace("-", "");
    let query = supabase.from(tableName).select("*");
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query
      .order(field, { ascending: !descending })
      .range(offset, offset + limit - 1);
    if (error) handleSupabaseError(error);
    return data || [];
  },

  create: async (record) => {
    const { data, error } = await supabase
      .from(tableName)
      .insert(record)
      .select()
      .single();
    if (error) handleSupabaseError(error);
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) handleSupabaseError(error);
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq("id", id);
    if (error) handleSupabaseError(error);
    return { success: true };
  },

  count: async (filters = {}) => {
    let query = supabase.from(tableName).select("*", { count: "exact", head: true });
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { count, error } = await query;
    if (error) handleSupabaseError(error);
    return count || 0;
  },

  subscribe: (callback) => {
    const channel = supabase
      .channel(`${tableName}-changes`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        (payload) => {
          callback({
            type: payload.eventType,
            data: payload.new,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
});

export const uploadFile = async (file) => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `uploads/${fileName}`;

  const { error } = await supabase.storage
    .from("files")
    .upload(filePath, file);

  if (error) handleSupabaseError(error);

  const { data: urlData } = supabase.storage
    .from("files")
    .getPublicUrl(filePath);

  return { file_url: urlData.publicUrl };
};

export const entities = {
  Customer: createEntityService("customers"),
  Transaction: createEntityService("transactions"),
  Order: createEntityService("orders"),
  Product: createEntityService("products"),
  StoreProfile: createEntityService("store_profiles"),
  MenuSendHistory: createEntityService("menu_send_history"),
  Comanda: createEntityService("comandas"),
  ComandaItem: createEntityService("comanda_items"),
  CanalWhatsApp: createEntityService("canais_whatsapp"),
  ClienteCanal: createEntityService("clientes_canal"),
  HistoricoEnvios: createEntityService("historico_envios"),
  ConexaoRede: createEntityService("conexoes_redes"),
  Campanha: createEntityService("campanhas"),
  CampanhaMidia: createEntityService("campanha_midia"),
  FilaEnvio: createEntityService("fila_envio"),
  CampanhaAnalytics: createEntityService("campanha_analytics"),
};

export { ApiError, clearTokens, storeTokens, getStoredToken };

export default {
  auth,
  entities,
  uploadFile,
};
