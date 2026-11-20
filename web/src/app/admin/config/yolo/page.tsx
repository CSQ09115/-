'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

interface ModelItem {
  filename: string;
  size: number;
  uploaded_at: string;
  active: boolean;
  builtin?: boolean;
}

interface ModelSummary {
  kind: string;
  active: string;
  default_model: string;
  default_exists: boolean;
  allowed_exts: string[];
  max_size: number;
  models: ModelItem[];
}

type Kind = 'plant' | 'pest';

const KIND_LABELS: Record<Kind, string> = {
  plant: '植物识别模型',
  pest: '病虫害识别模型',
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function YoloConfigPage() {
  const [data, setData] = useState<Record<Kind, ModelSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKind, setBusyKind] = useState<Kind | null>(null);
  const [uploadingKind, setUploadingKind] = useState<Kind | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const plantInputRef = useRef<HTMLInputElement>(null);
  const pestInputRef = useRef<HTMLInputElement>(null);

  const fetchModels = async () => {
    try {
      const response = await api.get('/api/admin/system-config/yolo/models');
      setData({ plant: response.data.plant, pest: response.data.pest });
    } catch (error) {
      console.error('Failed to fetch yolo models:', error);
      setMessage({ type: 'error', text: '加载模型列表失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleUpload = async (kind: Kind, file: File | undefined, input: HTMLInputElement) => {
    input.value = '';
    if (!file) return;
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!['.pt', '.onnx'].includes(ext)) {
      setMessage({ type: 'error', text: '仅支持 .pt / .onnx 模型文件' });
      return;
    }
    if (file.size > 200 * 1024 * 1024) {
      setMessage({ type: 'error', text: '模型文件不能超过 200MB' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setBusyKind(kind);
    setUploadingKind(kind);
    setUploadPercent(0);
    setMessage(null);
    try {
      const response = await api.post(`/api/admin/system-config/yolo/${kind}/upload`, formData, {
        onUploadProgress: (event) => {
          if (!event.total) return;
          const percent = Math.min(100, Math.round((event.loaded * 100) / event.total));
          setUploadPercent(percent);
        },
      });
      setData((prev) => (prev ? { ...prev, [kind]: response.data.summary } : prev));
      setMessage({ type: 'success', text: `模型上传成功：${file.name}` });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : '模型上传失败' });
    } finally {
      setBusyKind(null);
      setUploadingKind(null);
      setUploadPercent(0);
    }
  };

  const handleActivate = async (kind: Kind, filename: string) => {
    setBusyKind(kind);
    setMessage(null);
    try {
      const response = await api.put(`/api/admin/system-config/yolo/${kind}/active`, { filename });
      setData((prev) => (prev ? { ...prev, [kind]: response.data.summary } : prev));
      setMessage({ type: 'success', text: response.data.message });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : '切换模型失败' });
    } finally {
      setBusyKind(null);
    }
  };

  const handleDelete = async (kind: Kind, model: ModelItem) => {
    if (model.active) {
      setMessage({ type: 'error', text: '该模型正在使用中，请先切换其他模型再删除' });
      return;
    }
    const label = model.builtin ? `内置默认模型「${model.filename}」` : `模型「${model.filename}」`;
    if (!confirm(`确定删除${label}吗？删除后不可恢复。`)) return;
    setBusyKind(kind);
    setMessage(null);
    try {
      const response = await api.delete(
        `/api/admin/system-config/yolo/${kind}/models/${encodeURIComponent(model.filename)}`
      );
      setData((prev) => (prev ? { ...prev, [kind]: response.data.summary } : prev));
      setMessage({ type: 'success', text: '模型已删除' });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : '删除失败' });
    } finally {
      setBusyKind(null);
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
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">YOLO 模型配置</h1>
        <p className="text-sm text-gray-400 mt-1.5 max-w-3xl">
          上传 .pt / .onnx 模型并分别指定植物识别、病虫害识别使用的模型；未指定或文件缺失时自动回退到 backend/models 下的默认模型。
        </p>
      </div>

      {message && (
        <div className={`py-3 border-b text-sm ${message.type === 'success' ? 'text-green-600 border-green-100' : 'text-red-500 border-red-100'}`}>
          {message.text}
        </div>
      )}

      <input
        ref={plantInputRef}
        type="file"
        accept=".pt,.onnx"
        className="hidden"
        onChange={(e) => handleUpload('plant', e.target.files?.[0], e.currentTarget)}
      />
      <input
        ref={pestInputRef}
        type="file"
        accept=".pt,.onnx"
        className="hidden"
        onChange={(e) => handleUpload('pest', e.target.files?.[0], e.currentTarget)}
      />

      {data && (['plant', 'pest'] as Kind[]).map((kind, groupIndex) => {
        const summary = data[kind];
        const inputRef = kind === 'plant' ? plantInputRef : pestInputRef;
        const isBusy = busyKind === kind;
        return (
          <div key={kind} className={`pt-6 ${groupIndex === 0 ? 'pb-6 border-b border-gray-200' : ''}`}>
            <div className="flex justify-between items-start pb-4">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900">{KIND_LABELS[kind]}</h2>
                <p className="text-sm text-gray-400 mt-1">
                  当前启用：
                  {summary.active ? (
                    <span className="text-[#f46] font-medium"> {summary.active}</span>
                  ) : (
                    <span> 默认模型（{summary.default_model}{summary.default_exists ? '' : '，文件缺失'}）</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isBusy}
                className="bg-[#f46] hover:bg-[#d63a5c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isBusy ? (uploadingKind === kind ? `上传中 ${uploadPercent}%` : '处理中...') : '上传模型'}
              </button>
            </div>

            {uploadingKind === kind && (
              <div className="pb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{uploadPercent >= 100 ? '上传完成，正在保存模型…' : '正在上传模型文件…'}</span>
                  <span>{uploadPercent}%</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#f46] transition-all duration-150" style={{ width: `${uploadPercent}%` }} />
                </div>
              </div>
            )}

            {summary.models.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border-b border-gray-100">
                暂无上传模型，当前使用默认模型
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">文件名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 w-24">大小</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 w-40">上传时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 w-20">状态</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 w-28">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.models.map((model) => (
                    <tr key={model.filename} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 break-all">
                        {model.filename}
                        {model.builtin && (
                          <span className="ml-2 text-xs text-blue-600">内置</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatSize(model.size)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(model.uploaded_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${model.active ? 'text-green-600' : 'text-gray-400'}`}>
                          {model.active ? '使用中' : '未启用'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleActivate(kind, model.filename)}
                            disabled={isBusy || model.active}
                            className="text-sm text-[#f46] hover:text-[#d63a5c] font-medium transition-colors disabled:opacity-30"
                          >
                            启用
                          </button>
                          <button
                            onClick={() => handleDelete(kind, model)}
                            disabled={isBusy}
                            className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors disabled:opacity-30"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {summary.active && (
              <button
                onClick={() => handleActivate(kind, '')}
                disabled={isBusy}
                className="mt-4 text-sm text-gray-500 hover:text-[#f46] transition-colors disabled:opacity-50"
              >
                恢复使用默认模型
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
