import 'server-only';
// src/lib/supabase/products.ts
// Her SaaS ürününe bağlanan ayrı Supabase client'ları
// KRITIK: Service role key'ler SADECE server-side kodunda kullanılır.
// Hiçbiri NEXT_PUBLIC_ prefix'i ile tanımlanmaz.

import { createClient } from '@supabase/supabase-js';

import type { ProductId } from './products';

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
        url: process.env.AUDIPRO_SUPABASE_URL!,
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

  if (!config || !config.url || !config.serviceRoleKey) {
    throw new Error(
      `[ajans-panel] ${productId} için Supabase ortam değişkenleri eksik.`
    );
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

