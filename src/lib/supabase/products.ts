export type ProductId = 'audipro' | 'product2' | 'product3';
export const PRODUCT_LIST: { id: ProductId; name: string; icon: string; status: 'active' | 'coming_soon' }[] = [
  { id: 'audipro',  name: 'AudiPro',  icon: '🎧', status: 'active' },
  { id: 'product2', name: 'Ürün 2',   icon: '🏥', status: 'coming_soon' },
  { id: 'product3', name: 'Ürün 3',   icon: '💊', status: 'coming_soon' },
];
