'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

// 数字打字机动画：从 0 递增到目标值（缓出）
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

interface DailyStat {
  date: string;
  new_users: number;
  revenue: number;
  orders: number;
}

interface ChartPoint {
  label: string;
  value: number;
}

function LineChart({
  data,
  color,
  gradientId,
  formatValue,
}: {
  data: ChartPoint[];
  color: string;
  gradientId: string;
  formatValue: (value: number) => string;
}) {
  const width = 560;
  const height = 200;
  const paddingX = 40;
  const paddingY = 26;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0;

  const points = data.map((item, index) => ({
    ...item,
    x: paddingX + stepX * index,
    y: paddingY + innerHeight - (item.value / maxValue) * innerHeight,
  }));
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${points[0]?.x ?? paddingX},${height - paddingY} ${line} ${
    points[points.length - 1]?.x ?? paddingX
  },${height - paddingY}`;
  const gridLines = [0, 0.5, 1].map((ratio) => paddingY + innerHeight * ratio);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52" role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {gridLines.map((y, index) => (
        <line
          key={index}
          x1={paddingX}
          y1={y}
          x2={width - paddingX}
          y2={y}
          stroke="#f3f4f6"
          strokeWidth="1"
        />
      ))}

      <polygon points={area} fill={`url(#${gradientId})`} className="chart-area" />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="chart-line"
      />

      {points.map((point, index) => (
        <g
          key={point.label}
          className="chart-point"
          style={{ animationDelay: `${0.3 + index * 0.12}s` }}
        >
          <title>{`${point.label}：${formatValue(point.value)}`}</title>
          <circle cx={point.x} cy={point.y} r="3" fill="#fff" stroke={color} strokeWidth="2" />
          <text x={point.x} y={height - 6} textAnchor="middle" fontSize="11" fill="#9ca3af">
            {point.label}
          </text>
        </g>
      ))}

      <text x={paddingX - 8} y={paddingY + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
        {formatValue(maxValue)}
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    productsCount: 0,
    ordersCount: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  // 打字机计数动画（Hooks 需在提前 return 之前调用）
  const productsAnim = useCountUp(stats.productsCount);
  const ordersAnim = useCountUp(stats.ordersCount);
  const pendingAnim = useCountUp(stats.pendingOrders);
  const revenueAnim = useCountUp(stats.totalRevenue);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, ordersRes, dailyRes] = await Promise.all([
          api.get('/api/admin/products', { params: { limit: 1 } }),
          api.get('/api/admin/orders', { params: { limit: 100 } }),
          api.get('/api/admin/stats/daily', { params: { days: 7 } }),
        ]);

        const pendingOrders = ordersRes.data.items.filter(
          (o: any) => o.status === 'pending'
        ).length;

        const totalRevenue = ordersRes.data.items
          .filter((o: any) => o.status === 'completed' || o.status === 'shipped')
          .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0);

        setStats({
          productsCount: productsRes.data.total,
          ordersCount: ordersRes.data.total,
          pendingOrders,
          totalRevenue,
        });
        setDailyStats(dailyRes.data.items || []);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#f46]"></div>
    </div>
  );

  const cards = [
    { title: '商品总数', value: Math.round(productsAnim).toString() },
    { title: '订单总数', value: Math.round(ordersAnim).toString() },
    { title: '待处理订单', value: Math.round(pendingAnim).toString() },
    { title: '总收入', value: `¥${revenueAnim.toFixed(2)}` },
  ];

  const labels = dailyStats.map((item) => ({
    ...item,
    label: item.date.slice(5),
  }));
  const newUsersData = labels.map((item) => ({ label: item.label, value: item.new_users }));
  const revenueData = labels.map((item) => ({ label: item.label, value: item.revenue }));
  const newUsersTotal = newUsersData.reduce((sum, item) => sum + item.value, 0);
  const revenueTotal = revenueData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      {/* 页头：下划线分隔 */}
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">仪表盘</h1>
        <p className="text-sm text-gray-400 mt-1">欢迎回来，这里是您的数据中心</p>
      </div>

      {/* 统计概览：竖线分隔的扁平数字块 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 border-b border-gray-200">
        {cards.map((card, index) => (
          <div key={index} className={`py-6 ${index % 4 === 0 ? 'lg:pl-0 pr-6' : 'px-6'}`}>
            <p className="text-xs text-gray-400">{card.title}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-2 tabular-nums">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 趋势图 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 pt-8 pb-8 border-b border-gray-200">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">近七天用户注册</h2>
              <p className="text-xs text-gray-400 mt-0.5">按天统计新增注册用户数</p>
            </div>
            <span className="text-sm text-gray-400">合计 {newUsersTotal} 人</span>
          </div>
          {newUsersData.length > 0 ? (
            <LineChart
              data={newUsersData}
              color="#f46"
              gradientId="newUsersGradient"
              formatValue={(value) => `${value} 人`}
            />
          ) : (
            <p className="text-center text-gray-400 py-12">暂无数据</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">订单收入趋势</h2>
              <p className="text-xs text-gray-400 mt-0.5">按天统计有效订单金额（已确认/已发货/已完成）</p>
            </div>
            <span className="text-sm text-gray-400">合计 ¥{revenueTotal.toFixed(2)}</span>
          </div>
          {revenueData.length > 0 ? (
            <LineChart
              data={revenueData}
              color="#3b82f6"
              gradientId="revenueGradient"
              formatValue={(value) => `¥${value.toFixed(2)}`}
            />
          ) : (
            <p className="text-center text-gray-400 py-12">暂无数据</p>
          )}
        </div>
      </div>
    </div>
  );
}
