'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

// 统一的输入框样式：下划线风格
const inputCls =
  'pb-2 border-0 border-b border-gray-300 rounded-none px-0 bg-transparent text-gray-900 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors';
const selectCls =
  'pb-2 border-0 border-b border-gray-300 rounded-none px-0 pr-6 bg-transparent text-gray-700 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors';

export default function StatsPage() {
  const [overview, setOverview] = useState({
    total_sales: 0,
    order_count: 0,
    avg_order_value: 0,
    user_count: 0,
  });
  const [trend, setTrend] = useState({ labels: [] as string[], sales: [] as number[], orders: [] as number[] });
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('day');

  const fetchData = async () => {
    try {
      const params: any = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [overviewRes, trendRes, productsRes] = await Promise.all([
        api.get('/api/admin/stats/overview', { params }),
        api.get('/api/admin/stats/trend', { params: { ...params, group_by: groupBy } }),
        api.get('/api/admin/stats/products', { params }),
      ]);

      setOverview(overviewRes.data);
      setTrend(trendRes.data);
      setProducts(productsRes.data.items);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, groupBy]);

  const metrics = [
    { label: '销售总额', value: `¥${overview.total_sales.toFixed(2)}` },
    { label: '订单数量', value: overview.order_count },
    { label: '客单价', value: `¥${overview.avg_order_value.toFixed(2)}` },
    { label: '新增用户', value: overview.user_count },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#f46]"></div>
    </div>
  );

  return (
    <div>
      {/* 页头：下划线分隔 */}
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">数据统计</h1>
      </div>

      {/* 筛选条件 */}
      <div className="flex gap-6 items-end flex-wrap py-4 border-b border-gray-200">
        <div className="flex items-end gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
          <span className="text-gray-300 pb-1 text-sm">至</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <select
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value)}
          className={selectCls}
        >
          <option value="day">按天</option>
          <option value="week">按周</option>
          <option value="month">按月</option>
        </select>
      </div>

      {/* 核心指标：竖线分隔的扁平数字块 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 border-b border-gray-200">
        {metrics.map((metric, index) => (
          <div key={index} className={`py-6 ${index % 4 === 0 ? 'lg:pl-0 pr-6' : 'px-6'}`}>
            <p className="text-xs text-gray-400">{metric.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2 tabular-nums">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* 销售趋势 */}
      <div className="pt-8 pb-8 border-b border-gray-200">
        <h2 className="text-[15px] font-semibold text-gray-900 mb-6">销售趋势</h2>
        <div className="h-56 flex items-end gap-1.5">
          {trend.labels.map((label: string, index: number) => {
            const maxSales = Math.max(...trend.sales, 1);
            const height = (trend.sales[index] / maxSales) * 180;
            return (
              <div key={label} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[#f46] rounded-t-sm hover:opacity-75 transition-opacity cursor-pointer"
                  style={{ height: `${height}px`, minHeight: '4px' }}
                  title={`¥${trend.sales[index]}`}
                />
                <div className="text-[11px] text-gray-400 mt-2 truncate max-w-full">{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 热门商品 */}
      <div className="pt-8">
        <h2 className="text-[15px] font-semibold text-gray-900 mb-4">热门商品排行榜</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 w-20">排名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">商品名称</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 w-28">销量</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 w-32">销售额</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product: any, index: number) => (
              <tr key={product.product_id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                    index === 0 ? 'bg-[#f46] text-white' :
                    index === 1 ? 'bg-gray-800 text-white' :
                    index === 2 ? 'bg-gray-300 text-gray-700' :
                    'text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{product.product_name}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-600 tabular-nums">{product.sales_count} 件</td>
                <td className="px-4 py-3 text-right text-sm text-[#f46] font-semibold tabular-nums">
                  ¥{product.sales_amount.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {products.length === 0 && (
          <div className="text-center py-16 border-b border-gray-100">
            <p className="text-gray-400 text-sm">暂无数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
