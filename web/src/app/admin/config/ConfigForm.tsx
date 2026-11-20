'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'secret' | 'bool';
  default?: string;
  value: string;
  configured: boolean;
}

interface ConfigGroup {
  key: string;
  title: string;
  description: string;
  fields: ConfigField[];
}

interface Props {
  groupKey: string;
  title: string;
}

// 统一的输入框样式：下划线风格
const inputCls =
  'w-full pb-2 border-0 border-b border-gray-300 rounded-none px-0 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors';

export default function ConfigForm({ groupKey, title }: Props) {
  const [group, setGroup] = useState<ConfigGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const applyGroup = (data: ConfigGroup) => {
    setGroup(data);
    const values: Record<string, string> = {};
    data.fields.forEach((field) => {
      // 密钥字段后端不回显明文，输入框始终留空
      values[field.key] = field.type === 'secret' ? '' : field.value || '';
    });
    setFormValues(values);
  };

  const fetchConfig = async () => {
    try {
      const response = await api.get('/api/admin/system-config');
      const found = (response.data.groups || []).find((item: ConfigGroup) => item.key === groupKey);
      if (found) {
        applyGroup(found);
      } else {
        setMessage({ type: 'error', text: '未找到该配置分组' });
      }
    } catch (error) {
      console.error('Failed to fetch system config:', error);
      setMessage({ type: 'error', text: '加载系统配置失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [groupKey]);

  const handleChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await api.put(`/api/admin/system-config/${groupKey}`, { values: formValues });
      applyGroup(response.data.group);
      setMessage({ type: 'success', text: '保存成功' });
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : '保存失败，请稍后重试' });
    } finally {
      setSaving(false);
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
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {group && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#f46] hover:bg-[#d63a5c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '保存中...' : '保存'}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-1.5 max-w-3xl">
          配置只从数据库读取并持久化，不依赖 .env。密钥类字段不明文回显，留空保存则不修改原值；未配置的密钥会显示“未配置”，填写并保存后立即生效。
        </p>
      </div>

      {message && !group && (
        <div className="py-3 border-b border-red-100 text-sm text-red-500">{message.text}</div>
      )}

      {group && (
        <div className="pt-6">
          <div className="flex justify-between items-start pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">{group.title}</h2>
              {group.description && (
                <p className="text-sm text-gray-400 mt-1">{group.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6">
            {group.fields.map((field) => {
              if (field.type === 'bool') {
                // 布尔开关（如 SSL）：存 "1"/"0"
                const checked = (formValues[field.key] || '0') === '1';
                return (
                  <div key={field.key} className="flex items-center justify-between py-1">
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-600">{field.label}</label>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                            checked ? 'bg-[#f46]/10 text-[#f46]' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {checked ? '已开启' : '未开启'}
                        </span>
                      </div>
                      {field.key === 'ssl' && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          开启后使用 SSL 直连（通常配 465 端口）；关闭则连接后升级 STARTTLS（通常配 587 端口）
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      onClick={() => handleChange(field.key, checked ? '0' : '1')}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-all duration-300 ease-out ${
                        checked
                          ? 'bg-[#f46] shadow-[0_0_0_4px_rgba(244,68,102,0.10)]'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1/2 -translate-y-1/2 inline-block h-[18px] w-[18px] rounded-full bg-white shadow-md transition-all duration-300 ease-out ${
                          checked ? 'left-[24px]' : 'left-[3px]'
                        }`}
                      >
                        {/* 滑块内的状态圆点 */}
                        <span
                          className={`absolute inset-[5px] rounded-full transition-colors duration-300 ${
                            checked ? 'bg-[#f46]' : 'bg-gray-300'
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                );
              }
              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {field.label}
                    {field.type === 'secret' && (
                      field.configured ? (
                        <span className="ml-2 text-xs text-green-600 font-normal">已配置</span>
                      ) : (
                        <span className="ml-2 text-xs text-gray-400 font-normal">未配置</span>
                      )
                    )}
                  </label>
                  <input
                    type={field.type === 'secret' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                    value={formValues[field.key] ?? ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={
                      field.type === 'secret'
                        ? field.configured
                          ? '已配置，留空则不修改'
                          : '未配置'
                        : field.default || ''
                    }
                    autoComplete={field.type === 'secret' ? 'new-password' : 'off'}
                    className={inputCls}
                  />
                </div>
              );
            })}
          </div>

          {message && (
            <p className={`mt-5 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
