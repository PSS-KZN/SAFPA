import type { Product } from '../types';
import { jsonRequest, request } from './http';

export type CreateProductInput = Omit<Product, 'id'>;
export type UpdateProductInput = Partial<Omit<CreateProductInput, 'parlourId'>>;

export function fetchProducts(parlourId: string): Promise<Product[]> {
  return request<Product[]>(`/api/products?parlourId=${encodeURIComponent(parlourId)}`);
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return request<Product>('/api/products', jsonRequest(input, { method: 'POST' }));
}

export function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  return request<Product>(`/api/products/${id}`, jsonRequest(input, { method: 'PATCH' }));
}

export function setProductStatus(id: string, isActive: boolean): Promise<Product> {
  return request<Product>(`/api/products/${id}/status`, jsonRequest({ isActive }, { method: 'PATCH' }));
}
