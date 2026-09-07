// src/lib/supabase/products.ts
// Her SaaS ürününe bağlanan ayrı Supabase client'ları
// KRITIK: Service role key'ler SADECE server-side kodunda kullanılır.
// Hiçbiri NEXT_PUBLIC_ prefix'i ile tanımlanmaz.

import { createClient } from '@supabase/supabase-js';

export type ProductId = 'audipro' | 'product2' | 'product3';

interface ProductConfig {
  name: string;
  url: string;
  serviceRoleKey: string;
}

function getProductConfig(productId: ProductId): ProductConfig {
  switch (productId) {
    case 'audipro':
      return {
        name: 'AudiPro — İşitme Merkezi ERP',
        url: process.env.AUDIPRO_SUPABASE_URL || 'https://znktitzknixpbakfrnzk.supabase.co',
        serviceRoleKey: process.env.AUDIPRO_SUPABASE_SERVICE_ROLE_KEY!,
      };
    case 'product2':
      return {
        name: 'Ürün 2',
        url: process.env.PRODUCT2_SUPABASE_URL!,
        serviceRoleKey: process.env.PRODUCT2_SUPABASE_SERVICE_ROLE_KEY!,
      };
    case 'product3':
      return {
        name: 'Ürün 3',
        url: process.env.PRODUCT3_SUPABASE_URL!,
        serviceRoleKey: process.env.PRODUCT3_SUPABASE_SERVICE_ROLE_KEY!,
      };
  }
}

/** Belirli bir ürünün Supabase admin client'ını döner (SADECE API route'larında çağır) */
export function createProductAdminClient(productId: ProductId) {
  const config = getProductConfig(productId);

  if (!config.url || !config.serviceRoleKey) {
    throw new Error(
      `[ajans-panel] ${productId} için Supabase ortam değişkenleri eksik.`
    );
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const PRODUCT_LIST: { id: ProductId; name: string; icon: string; status: 'active' | 'coming_soon' }[] = [
  { id: 'audipro',  name: 'AudiPro',  icon: '🎧', status: 'active' },
  { id: 'product2', name: 'Ürün 2',   icon: '🏥', status: 'coming_soon' },
  { id: 'product3', name: 'Ürün 3',   icon: '💊', status: 'coming_soon' },
];
