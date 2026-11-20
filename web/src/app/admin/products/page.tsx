'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  status: string;
  image_url?: string;
  description?: string;
}

// 统一的输入框样式：下划线风格
const inputCls =
  'w-full pb-2 border-0 border-b border-gray-300 rounded-none px-0 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      // 后端单页上限 100，循环拉取全部数据，避免只显示前 20 条
      const pageSize = 100;
      const all: Product[] = [];
      let skip = 0;
      while (true) {
        const params: Record<string, any> = { skip, limit: pageSize };
        if (search) params.search = search;
        const response = await api.get('/api/admin/products', { params });
        const items: Product[] = response.data.items;
        all.push(...items);
        if (items.length === 0 || all.length >= response.data.total) break;
        skip += pageSize;
      }
      setProducts(all);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该商品吗？')) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.put(`/api/admin/products/${id}`, { status });
      fetchProducts();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSave = async (product: Partial<Product>) => {
    try {
      if (product.id) {
        await api.put(`/api/admin/products/${product.id}`, product);
      } else {
        await api.post('/api/admin/products', product);
      }
      setShowForm(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#f46]"></div>
    </div>
  );

  return (
    <div>
      {/* 页头：下划线分隔 */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">商品管理</h1>
        <button
          onClick={() => { setEditingProduct(null); setShowForm(true); }}
          className="bg-[#f46] hover:bg-[#d63a5c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          添加商品
        </button>
      </div>

      {/* 搜索 */}
      <form onSubmit={handleSearch} className="flex items-end gap-4 py-4 border-b border-gray-200">
        <input
          placeholder="搜索商品名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} flex-1 max-w-md`}
        />
        <button type="submit" className="text-sm text-[#f46] hover:text-[#d63a5c] font-medium pb-2 transition-colors">
          搜索
        </button>
      </form>

      {/* 商品表格 */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-20">ID</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400">名称</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-28">价格</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-24">库存</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-24">状态</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-48">操作</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3.5">
                <span className="text-gray-400 font-mono text-sm">#{product.id}</span>
              </td>
              <td className="px-4 py-3.5 font-medium text-gray-900">{product.name}</td>
              <td className="px-4 py-3.5">
                <span className="text-[#f46] font-semibold tabular-nums">¥{product.price}</span>
              </td>
              <td className="px-4 py-3.5">
                <span className={`text-sm tabular-nums ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {product.stock} 件
                </span>
              </td>
              <td className="px-4 py-3.5">
                <span className={`text-xs font-medium ${product.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                  {product.status === 'active' ? '上架中' : '已下架'}
                </span>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex gap-3">
                  <button
                    onClick={() => { setEditingProduct(product); setShowForm(true); }}
                    className="text-sm text-[#f46] hover:text-[#d63a5c] font-medium transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleStatusChange(product.id, product.status === 'active' ? 'inactive' : 'active')}
                    className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
                  >
                    {product.status === 'active' ? '下架' : '上架'}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {products.length === 0 && (
        <div className="text-center py-16 border-b border-gray-100">
          <p className="text-gray-400 text-sm">暂无商品</p>
        </div>
      )}

      {/* 商品表单弹窗 */}
      {showForm && (
        <ProductForm
          product={editingProduct}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingProduct(null); }}
        />
      )}
    </div>
  );
}

function ProductForm({ product, onSave, onClose }: { product?: Product | null; onSave: (p: any) => void; onClose: () => void }) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: string | number;
    stock: string | number;
    image_url: string;
    status: string;
  }>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    stock: product?.stock || 0,
    image_url: product?.image_url || '',
    status: product?.status || 'active',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price as string),
      stock: parseInt(formData.stock as string),
      image_url: formData.image_url,
      status: formData.status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{product?.id ? '编辑商品' : '添加商品'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">商品名称</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`${inputCls} resize-none`}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">价格</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">库存</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className={inputCls}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">图片 URL</label>
            <input
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#f46] hover:bg-[#d63a5c] text-white text-sm font-medium transition-colors">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
