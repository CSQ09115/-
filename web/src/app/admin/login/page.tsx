'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import siteIcon from '@/assets/favicon.png';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('登录失败');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo 区域：站点图标 + 标题 */}
        <div className="flex flex-col items-center pb-8 border-b border-gray-200">
          <img src={siteIcon.src} alt="护花使者" className="w-14 h-14 rounded-2xl mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">护花使者后端</h1>
          <p className="text-sm text-gray-400 mt-1">管理员登录</p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mt-6 pb-3 border-b border-red-100">
            <p className="text-red-500 text-sm text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-7">
          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">用户名</label>
            <input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pb-2 border-0 border-b border-gray-300 rounded-none px-0 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors"
              required
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pb-2 border-0 border-b border-gray-300 rounded-none px-0 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors"
              required
            />
          </div>

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f46] hover:bg-[#d63a5c] text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

        {/* 底部信息 */}
        <div className="mt-8 pt-5 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">© 2026 护花使者 · 植物管家</p>
        </div>
      </div>
    </div>
  );
}
