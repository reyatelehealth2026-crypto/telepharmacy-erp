export interface OdooProductPriceEntry {
  price_name: string;
  price_code: string;
  price: number;
}

export interface OdooVendorEntry {
  vendor_id: number;
  vendor_name: string;
  vendor_code: string;
}

/** Shape of each item inside result.products[] from /ineco_gc/get_product */
export interface OdooProductItem {
  product_id: number;
  product_code: string;
  sku: string;
  barcode: string | false;
  name: string;
  generic_name: string | false;
  name_2: string | false;
  list_price: number;
  active: boolean;
  benefit: string | false;
  how_to_use: string | false;
  caution: string | false;
  category: string | false;
  uom_name: string;
  uom_factor: number;
  saleable_qty: number;
  all_uom_saleable_qty: number;
  product_price_ids: OdooProductPriceEntry[];
  vendor_product: OdooVendorEntry[];
}

/** Full JSONRPC response from /ineco_gc/get_product */
export interface OdooGetProductResponse {
  success?: string;
  error?: string;
  products?: OdooProductItem[];
}

/** Full JSONRPC response from /ineco_gc/get_sku */
export interface OdooGetSkuResponse {
  success?: string;
  error?: string;
  products?: OdooProductItem[];
}

/** Normalised product used internally after fetching from Odoo */
export interface OdooNormalisedProduct {
  odooId: number;
  odooCode: string;
  sku: string;
  barcode: string | null;
  nameTh: string;
  nameEn: string | null;
  genericName: string | null;
  description: string | null;
  howToUse: string | null;
  caution: string | null;
  category: string | null;
  listPrice: number;
  /** price_code 005 = ONLINE price */
  onlinePrice: number | null;
  stockQty: number;
  isActive: boolean;
  /** Constructed from https://manager.cnypharmacy.com/uploads/product_photo/{code}.jpg */
  imageUrl: string | null;
  /** All price tiers from Odoo */
  prices: OdooProductPriceEntry[];
  /** Vendor/brand info */
  vendors: OdooVendorEntry[];
  unit: string;
}
