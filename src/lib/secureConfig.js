import { supabase } from "@/lib/supabase";

const cache = new Map();

export async function getApiConfig(key) {
  if (cache.has(key)) return cache.get(key);
  const { data, error } = await supabase.rpc("get_api_config", { p_key: key });
  if (error) return null;
  cache.set(key, data);
  return data;
}

export async function setApiConfig(key, value, description = null) {
  const { data, error } = await supabase.rpc("set_api_config", {
    p_key: key,
    p_value: value,
    p_description: description,
  });
  if (error) throw error;
  cache.set(key, value);
  return data;
}

export function clearConfigCache() {
  cache.clear();
}

export function getEvolutionConfigSync() {
  const cached = cache.get("evolution_api");
  if (cached) return cached;
  return { apiUrl: "", apiKey: "", instance: "fiadopro" };
}

export function getZApiConfigSync() {
  const cached = cache.get("zapi");
  if (cached) return cached;
  return { instanceId: "", token: "" };
}
