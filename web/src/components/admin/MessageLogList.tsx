'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

export interface MessageLogItem {
  id: number;
  recipient: string;
  subject?: string;
  purpose: string;
  status: 'success' | 'failed' | string;
  error: string;
  created_at: string | null;
}

interface MessageLogListProps {
  /** 日志类型：email（邮件）/ sms（短信），决定图标与接口 */
  kind: 'email' | 'sms';
  title: string;
  description: string;
  purposeLabels: Record<string, string>;
}

const STATUS_BADGE: Record<string, string> = {
  success: 'bg-green-50 text-green-600',
  failed: 'bg-red-50 text-red-500',
};

function formatTime(iso: string | null) {
  if (!iso) return '-';
  const date = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 统计块：大数字 + 标签，竖线分隔 */
function StatBlock({ label, value, accent }: { label: string; value: number; accent?: 'green' | 'red' }) {
  return (
    <div>
      <p className={`text-2xl font-semibold tabular-nums ${accent === 'green' ? 'text-green-600' : accent === 'red' ? 'text-red-500' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

/** 日志列表页共享组件（邮件/短信发送日志）：统计区 + 分段筛选 + 层次化卡片 + 分页 */
export default function MessageLogList({ kind, title, description, purposeLabels }: MessageLogListProps) {
  const [items, setItems] = useState<MessageLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [statusFilter, setStatusFilter] = useState<'' | 'success' | 'failed'>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/admin/${kind}-logs`, {
        params: { page, size, status: statusFilter },
      });
      setItems(response.data.items || []);
      setTotal(response.data.total || 0);
      setSuccessCount(response.data.success_count ?? 0);
      setFailedCount(response.data.failed_count ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '加载日志失败');
    } finally {
      setLoading(false);
    }
  }, [kind, page, size, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleClearFailed = async () => {
    if (!confirm('确定要清除所有「失败」状态的日志记录吗？此操作不可恢复。')) return;
    try {
      await api.delete(`/api/admin/${kind}-logs/failed`);
      setPage(1);
      fetchLogs();
    } catch (e: any) {
      setError(e?.response?.data?.detail || '清除失败记录出错');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / size));

  const purposeLabel = (purpose: string) => purposeLabels[purpose] || purpose || '其他';

  const Icon = ({ item }: { item: MessageLogItem }) => {
    const ok = item.status === 'success';
    return (
      <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${ok ? 'bg-green-50' : 'bg-red-50'}`}>
        <svg
          className={`w-4.5 h-4.5 ${ok ? 'text-green-500' : 'text-red-500'}`}
          style={{ width: 18, height: 18 }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {kind === 'email' ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
            />
          )}
        </svg>
      </span>
    );
  };

  return (
    <div>
      {/* 页头 */}
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-400 mt-1.5">{description}</p>
      </div>

      {/* 统计区：总发送 / 成功 / 失败，竖线分隔增强层次 */}
      <div className="flex items-center gap-0 py-5 border-b border-gray-200">
        <StatBlock label="总发送" value={total} />
        <div className="border-l border-gray-200 pl-10 ml-10">
          <StatBlock label="发送成功" value={successCount} accent="green" />
        </div>
        <div className="border-l border-gray-200 pl-10 ml-10">
          <StatBlock label="发送失败" value={failedCount} accent="red" />
        </div>
        <button
          onClick={handleClearFailed}
          className="ml-auto text-sm text-red-400 hover:text-red-500 transition-colors border-b border-transparent hover:border-red-300 pb-0.5"
        >
          清除失败记录
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 py-3 border-b border-gray-200">
        <div className="inline-flex bg-gray-100 rounded-full p-1">
          {[
            { key: '' as const, label: '全部' },
            { key: 'success' as const, label: '成功' },
            { key: 'failed' as const, label: '失败' },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setStatusFilter(option.key);
                setPage(1);
              }}
              className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 ${
                statusFilter === option.key
                  ? 'bg-white shadow-sm text-[#f46] font-medium'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-gray-400">当前显示 {items.length} 条</span>
      </div>

      {error && <div className="py-3 border-b border-red-100 text-sm text-red-500">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#f46]"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">
          暂无{kind === 'email' ? '邮件' : '短信'}发送记录
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pt-6">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="relative bg-white border border-gray-200 rounded-xl p-5 pl-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden nav-slide-in"
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              {/* 状态色条 */}
              <span
                className={`absolute inset-y-0 left-0 w-1 ${item.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`}
              />
              {/* 卡片头：类型图标 + 收件人（主） + 副标题；状态徽章独立在右上 */}
              <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon item={item} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">{item.recipient}</p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {kind === 'email' ? item.subject : '验证码短信'}
                    </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    STATUS_BADGE[item.status] || 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'success' ? 'bg-green-500' : 'bg-red-400'}`} />
                  {item.status === 'success' ? '发送成功' : '发送失败'}
                </span>
              </div>
              {/* 信息区：用途 / 时间，宽松行距 */}
              <dl className="pt-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-gray-400">用途</dt>
                  <dd className="text-sm text-gray-700">{purposeLabel(item.purpose)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-gray-400">发送时间</dt>
                  <dd className="text-sm text-gray-700 tabular-nums">{formatTime(item.created_at)}</dd>
                </div>
              </dl>
              {/* 错误详情独立区块 */}
              {item.error && (
                <div className="mt-3.5 pt-3.5 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1.5">错误详情</p>
                  <p className="text-xs text-red-500 leading-relaxed break-all bg-red-50 rounded-lg px-3 py-2.5">
                    {item.error}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed border-b border-transparent hover:border-gray-300 transition-colors"
          >
            上一页
          </button>
          <span className="text-sm text-gray-400 tabular-nums">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed border-b border-transparent hover:border-gray-300 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
