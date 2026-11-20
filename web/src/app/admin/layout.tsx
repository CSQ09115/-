'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import siteIcon from '@/assets/favicon.png';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const rawPathname = usePathname();
  // 静态导出启用了 trailingSlash，/admin/login 会带尾部斜杠
  const pathname = rawPathname.endsWith('/') ? rawPathname.slice(0, -1) : rawPathname;
  const [loading, setLoading] = useState(true);
  // 父级菜单的手动展开/收回状态（点击切换，路由变化时重置）
  const [manualToggles, setManualToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && pathname !== '/admin/login') {
      router.push('/admin/login');
    } else {
      setLoading(false);
    }
    setManualToggles({});
  }, [pathname, router]);

  // 登录页使用独立版式，不套用侧边栏框架
  if (pathname === '/admin/login') return <>{children}</>;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 border-t-[#f46]"></div>
    </div>
  );

  type NavItem = {
    href: string;
    label: string;
    icon: string;
    children?: { href: string; label: string }[];
  };

  const navItems: NavItem[] = [
    { href: '/admin/dashboard', label: '仪表盘', icon: 'dashboard' },
    { href: '/admin/products', label: '商品管理', icon: 'products' },
    { href: '/admin/orders', label: '订单管理', icon: 'orders' },
    { href: '/admin/users', label: '用户管理', icon: 'users' },
    { href: '/admin/plants', label: '植物管理', icon: 'plants' },
    { href: '/admin/stats', label: '数据统计', icon: 'stats' },
    {
      href: '/admin/config/weather',
      label: '系统配置',
      icon: 'config',
      children: [
        { href: '/admin/config/weather', label: '天气 API' },
        { href: '/admin/config/smtp', label: 'SMTP' },
        { href: '/admin/config/sms', label: '短信（互亿无线）' },
        { href: '/admin/config/ai', label: 'AI 问诊' },
        { href: '/admin/config/payment', label: '支付 API' },
        { href: '/admin/config/login', label: 'QQ / 微信登录' },
        { href: '/admin/config/yolo', label: 'YOLO 模型' },
        { href: '/admin/config/api-docs', label: 'API 对接文档' },
      ],
    },
    {
      href: '/admin/logs/email',
      label: '日志',
      icon: 'logs',
      children: [
        { href: '/admin/logs/email', label: '邮件发送' },
        { href: '/admin/logs/sms', label: '短信发送' },
      ],
    },
  ];

  const getIcon = (icon: string) => {
    const icons: Record<string, React.ReactNode> = {
      dashboard: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      products: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      orders: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      users: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      plants: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      stats: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      config: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      logs: (
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    };
    return icons[icon] || null;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 侧边栏：fixed 固定，页面滚动时保持不动，退出登录按钮始终可见 */}
      <aside className="w-60 fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo 区域：站点图标 + 标题 */}
        <div className="px-5 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <img src={siteIcon.src} alt="护花使者" className="w-8 h-8 rounded-lg" />
            <h1 className="text-[15px] font-semibold text-gray-900 tracking-tight">护花使者后端</h1>
          </div>
        </div>

        {/* 导航：逐个从左滑入 */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map((item, index) => {
            const slideStyle = { animationDelay: `${0.08 + index * 0.07}s` };
            if (item.children) {
              // 取 href 前三级路径（如 /admin/config、/admin/logs）作为展开判断依据；
              // 点击父级菜单仅展开/收回，不跳转
              const base = item.href.split('/').slice(0, 3).join('/');
              const expanded = manualToggles[item.href] ?? pathname.startsWith(base);
              return (
                <div key={item.href} className="mb-1 nav-slide-in" style={slideStyle}>
                  <button
                    onClick={() => setManualToggles((prev) => ({ ...prev, [item.href]: !expanded }))}
                    className={`w-[calc(100%-1.5rem)] flex items-center gap-2.5 px-3 py-2.5 mx-3 rounded-lg text-sm transition-colors ${
                      expanded
                        ? 'text-[#f46] bg-[#f46]/5 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {getIcon(item.icon)}
                    <span className="flex-1 text-left">{item.label}</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {/* 子菜单：高度展开 + 淡入，子项逐个滑入（key 触发动画重放） */}
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="mt-0.5 space-y-0.5 pb-1">
                        {item.children.map((child, childIndex) => (
                          <Link
                            key={`${child.href}-${expanded}`}
                            href={child.href}
                            className={`nav-slide-in flex items-center gap-2 pl-10 pr-3 py-2 mx-3 rounded-lg text-[13px] transition-colors ${
                              pathname === child.href
                                ? 'text-[#f46] font-medium'
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                            style={{ animationDelay: `${0.08 + childIndex * 0.05}s` }}
                          >
                            <span className={`w-1 h-1 rounded-full transition-colors duration-300 ${pathname === child.href ? 'bg-[#f46]' : 'bg-gray-300'}`} />
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-slide-in flex items-center gap-2.5 px-3 py-2.5 mx-3 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? 'text-[#f46] bg-[#f46]/5 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                style={slideStyle}
              >
                {getIcon(item.icon)}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="px-3 py-3 border-t border-gray-200">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/admin/login');
            }}
            className="flex items-center gap-2.5 text-gray-500 hover:text-gray-900 transition-colors w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* 主内容区：为固定侧边栏留出宽度 */}
      <main className="ml-60 min-h-screen bg-white">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
