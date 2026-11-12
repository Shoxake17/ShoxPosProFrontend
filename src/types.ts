
export interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  date: string;
}

export interface BusinessData {
  products: Product[];
  sales: Sale[];
  stats: {
    totalRevenue: number;
    totalSalesCount: number;
    lowStockItems: number;
  };
}
