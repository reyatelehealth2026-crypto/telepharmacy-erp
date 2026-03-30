import type {
  DrugClassification,
  ProductStatus,
  VatType,
} from "./enums";

export interface Product {
  id: string;
  sku: string;
  nameTh: string;
  nameEn?: string;
  slug: string;
  genericName?: string;
  brand?: string;
  manufacturer?: string;
  categoryId: string;
  categoryName?: string;
  drugClassification: DrugClassification;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  unit: string;
  description?: string;
  indication?: string;
  contraindication?: string;
  sideEffects?: string;
  storageCondition?: string;
  costPrice: number;
  sellPrice: number;
  memberPrice?: number;
  vatType: VatType;
  images: string[];
  thumbnailUrl?: string;
  barcode?: string;
  fdaRegNo?: string;
  requiresPrescription: boolean;
  isControlled: boolean;
  status: ProductStatus;
  stockQuantity: number;
  reorderPoint?: number;
  expiryDate?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummary {
  id: string;
  sku: string;
  nameTh: string;
  brand?: string;
  sellPrice: number;
  memberPrice?: number;
  imageUrl?: string;
  inStock: boolean;
  drugClassification: DrugClassification;
  requiresPrescription: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  children?: Category[];
  productCount?: number;
}

export interface CreateProductInput {
  sku: string;
  nameTh: string;
  nameEn?: string;
  genericName?: string;
  brand: string;
  manufacturer?: string;
  categoryId: string;
  drugClassification: DrugClassification;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  unit: string;
  description?: string;
  indication?: string;
  contraindication?: string;
  sideEffects?: string;
  storageCondition?: string;
  costPrice: number;
  sellPrice: number;
  memberPrice?: number;
  vatType?: VatType;
  images?: string[];
  barcode?: string;
  fdaRegNo?: string;
  requiresPrescription?: boolean;
  isControlled?: boolean;
  stockQuantity?: number;
  reorderPoint?: number;
  expiryDate?: string;
  tags?: string[];
}

export interface UpdateProductInput {
  nameTh?: string;
  nameEn?: string;
  genericName?: string;
  brand?: string;
  manufacturer?: string;
  categoryId?: string;
  drugClassification?: DrugClassification;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  unit?: string;
  description?: string;
  indication?: string;
  contraindication?: string;
  sideEffects?: string;
  storageCondition?: string;
  costPrice?: number;
  sellPrice?: number;
  memberPrice?: number;
  vatType?: VatType;
  images?: string[];
  barcode?: string;
  fdaRegNo?: string;
  requiresPrescription?: boolean;
  isControlled?: boolean;
  status?: ProductStatus;
  stockQuantity?: number;
  reorderPoint?: number;
  expiryDate?: string;
  tags?: string[];
}
