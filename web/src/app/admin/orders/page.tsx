'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Order {
  id: number;
  order_no: string;
  user_id: number;
  total_amount: string;
  status: string;
  delivery_type: string;
  delivery_address?: string;
  contact_name: string;
  contact_phone: string;
  remark?: string;
  created_at: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'text-yellow-600' },
  confirmed: { label: '已确认', color: 'text-blue-600' },
  shipped: { label: '已发货', color: 'text-purple-600' },
  completed: { label: '已完成', color: 'text-green-600' },
  cancelled: { label: '已取消', color: 'text-red-500' },
};

// 统一的输入框样式：下划线风格
const selectCls =
  'pb-2 border-0 border-b border-gray-300 rounded-none px-0 pr-6 bg-transparent text-sm text-gray-700 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const fetchOrders = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await api.get('/api/admin/orders', { params });
      setOrders(response.data.items);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
      await api.put(`/api/admin/orders/${orderId}`, { status });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update order:', error);
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
    setSelected(e.target.checked ? new Set(orders.map((order) => order.id)) : new Set());
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 项吗？`)) return;
    try {
      await api.post('/api/admin/orders/batch-delete', { ids: Array.from(selected) });
      setSelected(new Set());
      fetchOrders();
    } catch (error) {
      console.error('Failed to batch delete orders:', error);
      alert('批量删除失败，请稍后重试');
    }
  };

  const nextStatuses: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipped'],
    shipped: ['completed'],
    completed: [],
    cancelled: [],
  };

  const statusLabels: Record<string, string> = {
    confirmed: '确认',
    shipped: '发货',
    completed: '完成',
    cancelled: '取消',
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
        <h1 className="text-xl font-semibold text-gray-900">订单管理</h1>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectCls}
        >
          <option value="">全部订单</option>
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
          <option value="shipped">已发货</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

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

      {/* 订单表格 */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3.5 text-left w-10">
              <input
                type="checkbox"
                className="accent-[#f46]"
                checked={orders.length > 0 && selected.size === orders.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400">订单号</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-20">客户</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-24">金额</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-20">配送</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-28">联系人</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-20">状态</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-28">创建时间</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-44">操作</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const statusInfo = statusMap[order.status] || { label: order.status, color: 'text-gray-600' };
            return (
              <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    className="accent-[#f46]"
                    checked={selected.has(order.id)}
                    onChange={() => toggleSelect(order.id)}
                  />
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs text-gray-500">{order.order_no}</span>
                </td>
                <td className="px-4 py-3.5 text-gray-600">#{order.user_id}</td>
                <td className="px-4 py-3.5">
                  <span className="text-[#f46] font-semibold tabular-nums">¥{order.total_amount}</span>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-600">
                  {order.delivery_type === 'express' ? '快递' : '自提'}
                </td>
                <td className="px-4 py-3.5 text-gray-700">{order.contact_name}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                </td>
                <td className="px-4 py-3.5 text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="text-sm text-[#f46] hover:text-[#d63a5c] font-medium transition-colors"
                    >
                      详情
                    </button>
                    {nextStatuses[order.status]?.map((nextStatus) => (
                      <button
                        key={nextStatus}
                        onClick={() => handleStatusChange(order.id, nextStatus)}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900 transition-colors"
                      >
                        {statusLabels[nextStatus]}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {orders.length === 0 && (
        <div className="text-center py-16 border-b border-gray-100">
          <p className="text-gray-400 text-sm">暂无订单</p>
        </div>
      )}

      {/* 订单详情弹窗 */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">订单详情</h2>
            </div>
            <div className="px-6 py-5 divide-y divide-gray-100">
              <DetailRow label="订单号" value={selectedOrder.order_no} mono />
              <DetailRow label="状态" value={statusMap[selectedOrder.status]?.label || selectedOrder.status} />
              <DetailRow label="客户 ID" value={`#${selectedOrder.user_id}`} />
              <DetailRow label="订单金额" value={`¥${selectedOrder.total_amount}`} accent />
              <DetailRow label="配送方式" value={selectedOrder.delivery_type === 'express' ? '快递' : '自提'} />
              {selectedOrder.delivery_address && (
                <DetailRow label="收货地址" value={selectedOrder.delivery_address} />
              )}
              <DetailRow label="联系人" value={selectedOrder.contact_name} />
              <DetailRow label="联系电话" value={selectedOrder.contact_phone} />
              {selectedOrder.remark && <DetailRow label="备注" value={selectedOrder.remark} />}
              <DetailRow label="创建时间" value={new Date(selectedOrder.created_at).toLocaleString()} />
            </div>
            <div className="px-6 py-4 border-t border-gray-200">
              <button
                className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedOrder(null)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between items-start py-2.5">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span className={`text-sm text-right ml-6 break-all ${mono ? 'font-mono text-gray-600' : ''} ${accent ? 'text-[#f46] font-semibold' : 'text-gray-900'}`}>
        {value}
      </span>
    </div>
  );
}
