'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import siteIcon from '@/assets/favicon.png';

interface Plant {
  id: number;
  name: string;
  scientific_name?: string;
  category?: string;
  care_level: number;
  description?: string;
  image_url?: string | null;
}

// 统一的输入框样式：下划线风格
const inputCls =
  'w-full pb-2 border-0 border-b border-gray-300 rounded-none px-0 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors';

const careLevelLabels: Record<number, string> = {
  1: '很容易',
  2: '简单',
  3: '一般',
  4: '较难',
  5: '很难',
};

export default function AdminPlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<number | null>(null);

  const fetchPlants = async () => {
    try {
      // 后端单页上限 100，循环拉取全部数据，避免只显示前 20 条
      const pageSize = 100;
      const all: Plant[] = [];
      let skip = 0;
      while (true) {
        const params: Record<string, any> = { skip, limit: pageSize };
        if (search) params.search = search;
        const response = await api.get('/api/admin/plants', { params });
        const items: Plant[] = response.data.items;
        all.push(...items);
        if (items.length === 0 || all.length >= response.data.total) break;
        skip += pageSize;
      }
      setPlants(all);
    } catch (error) {
      console.error('Failed to fetch plants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该植物吗？')) return;
    try {
      await api.delete(`/api/admin/plants/${id}`);
      fetchPlants();
    } catch (error) {
      console.error('Failed to delete plant:', error);
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(e.target.checked ? new Set(plants.map((plant) => plant.id)) : new Set());
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 项吗？`)) return;
    try {
      await api.post('/api/admin/plants/batch-delete', { ids: Array.from(selected) });
      setSelected(new Set());
      fetchPlants();
    } catch (error) {
      console.error('Failed to batch delete plants:', error);
      setMessage({ type: 'error', text: '批量删除失败，请稍后重试' });
    }
  };

  const handleSave = async (plant: Partial<Plant>) => {
    try {
      if (plant.id) {
        await api.put(`/api/admin/plants/${plant.id}`, plant);
      } else {
        await api.post('/api/admin/plants', plant);
      }
      setShowForm(false);
      setEditingPlant(null);
      fetchPlants();
    } catch (error) {
      console.error('Failed to save plant:', error);
    }
  };

  const handleUploadClick = (plantId: number) => {
    uploadTargetRef.current = plantId;
    fileInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const plantId = uploadTargetRef.current;
    e.target.value = '';
    if (!file || !plantId) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingId(plantId);
    setUploadPercent(0);
    setMessage(null);
    try {
      await api.post(`/api/admin/plants/${plantId}/image`, formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.min(100, Math.round((event.loaded * 100) / event.total));
          setUploadPercent(percent);
        },
      });
      await fetchPlants();
      setMessage({ type: 'success', text: `图片上传成功：${file.name}` });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setMessage({
        type: 'error',
        text: typeof detail === 'string' ? detail : '图片上传失败，请稍后重试',
      });
    } finally {
      setUploadingId(null);
      setUploadPercent(0);
      uploadTargetRef.current = null;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#f46]"></div>
    </div>
  );

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleImageSelected}
      />

      {/* 页头：下划线分隔 */}
      <div className="flex justify-between items-center pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">植物百科管理</h1>
        <button
          onClick={() => { setEditingPlant(null); setShowForm(true); }}
          className="bg-[#f46] hover:bg-[#d63a5c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          添加植物
        </button>
      </div>

      {message && (
        <div className={`py-3 border-b text-sm ${message.type === 'success' ? 'text-green-600 border-green-100' : 'text-red-500 border-red-100'}`}>
          {message.text}
        </div>
      )}

      {/* 搜索 */}
      <form onSubmit={(e) => { e.preventDefault(); fetchPlants(); }} className="flex items-end gap-4 py-4 border-b border-gray-200">
        <input
          placeholder="搜索植物名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputCls} flex-1 max-w-md`}
        />
        <button type="submit" className="text-sm text-[#f46] hover:text-[#d63a5c] font-medium pb-2 transition-colors">
          搜索
        </button>
      </form>

      {selected.size > 0 && (
        <div className="py-3 border-b border-gray-200 flex items-center gap-3">
          <span className="text-sm text-gray-500">已选 {selected.size} 项</span>
          <div className="flex-1" />
          <button
            onClick={handleBatchDelete}
            className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
          >
            批量删除
          </button>
        </div>
      )}

      {uploadingId !== null && (
        <div className="py-3 border-b border-gray-200">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>正在上传图片…</span>
            <span>{uploadPercent}%</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#f46] transition-all duration-150" style={{ width: `${uploadPercent}%` }} />
          </div>
        </div>
      )}

      {/* 植物表格 */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3.5 text-left w-10">
              <input
                type="checkbox"
                className="accent-[#f46]"
                checked={plants.length > 0 && selected.size === plants.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-20">ID</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-16">图片</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400">名称</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400">学名</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-24">分类</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-28">养护难度</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-56">操作</th>
          </tr>
        </thead>
        <tbody>
          {plants.map((plant) => (
            <tr key={plant.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  className="accent-[#f46]"
                  checked={selected.has(plant.id)}
                  onChange={() => toggleSelect(plant.id)}
                />
              </td>
              <td className="px-4 py-3">
                <span className="text-gray-400 font-mono text-sm">#{plant.id}</span>
              </td>
              <td className="px-4 py-3">
                {plant.image_url ? (
                  <img src={plant.image_url} alt={plant.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                ) : (
                  <img src={siteIcon.src} alt={plant.name} title="未设置图片，显示站点图标" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                )}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-gray-900">{plant.name}</span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 italic">{plant.scientific_name || '-'}</td>
              <td className="px-4 py-3">
                <span className="text-sm text-gray-600">{plant.category || '-'}</span>
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium ${plant.care_level <= 2 ? 'text-green-600' : plant.care_level <= 3 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {plant.care_level} 级 · {careLevelLabels[plant.care_level] || ''}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleUploadClick(plant.id)}
                    disabled={uploadingId === plant.id}
                    className="text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                  >
                    {uploadingId === plant.id ? `上传中 ${uploadPercent}%` : '上传图片'}
                  </button>
                  <button
                    onClick={() => { setEditingPlant(plant); setShowForm(true); }}
                    className="text-sm text-[#f46] hover:text-[#d63a5c] font-medium transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(plant.id)}
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

      {plants.length === 0 && (
        <div className="text-center py-16 border-b border-gray-100">
          <p className="text-gray-400 text-sm">暂无植物</p>
        </div>
      )}

      {showForm && (
        <PlantForm
          plant={editingPlant}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingPlant(null); }}
        />
      )}
    </div>
  );
}

function PlantForm({ plant, onSave, onClose }: { plant?: Plant | null; onSave: (p: any) => void; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: plant?.name || '',
    scientific_name: plant?.scientific_name || '',
    category: plant?.category || '',
    care_level: plant?.care_level || 1,
    description: plant?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(plant?.id ? { ...formData, id: plant.id } : formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{plant?.id ? '编辑植物' : '添加植物'}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 当前图片预览：已设置显示图片，未设置显示站点图标 */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
            {plant?.image_url ? (
              <img src={plant.image_url} alt={plant.name || '植物图片'} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
            ) : (
              <img src={siteIcon.src} alt={plant?.name || '植物图片'} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{plant?.image_url ? '当前图片' : '未设置图片（列表将显示站点图标）'}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {plant?.id ? '可通过列表中的「上传图片」更新' : '保存后可在列表中上传图片'}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">名称</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">学名</label>
            <input
              value={formData.scientific_name}
              onChange={(e) => setFormData({ ...formData, scientific_name: e.target.value })}
              className={`${inputCls} italic`}
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">分类</label>
              <input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">养护难度 (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.care_level}
                onChange={(e) => setFormData({ ...formData, care_level: parseInt(e.target.value) })}
                className={inputCls}
              />
            </div>
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
