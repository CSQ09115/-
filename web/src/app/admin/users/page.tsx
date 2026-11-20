'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  bio?: string | null;
  created_at: string;
}

interface EditForm {
  username: string;
  email: string;
  role: string;
  bio: string;
}

// 统一的输入框样式：下划线风格
const inputCls =
  'w-full pb-2 border-0 border-b border-gray-300 rounded-none px-0 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors';
const selectCls =
  'w-full pb-2 border-0 border-b border-gray-300 rounded-none px-0 bg-transparent text-gray-900 focus:outline-none focus:border-[#f46] focus:ring-0 transition-colors';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ username: '', email: '', role: 'user', bio: '' });
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'user', bio: '' });
  const [createError, setCreateError] = useState('');

  const getErrorMessage = (error: any, fallback: string) => {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item: any) => item.msg).filter(Boolean).join('；') || fallback;
    return fallback;
  };

  const fetchUsers = async () => {
    try {
      const params = search ? { search } : {};
      const response = await api.get('/api/admin/users', { params });
      setUsers(response.data.items);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    api.get('/api/users/me')
      .then((response) => setCurrentUserId(response.data.id))
      .catch((error) => console.error('Failed to fetch current user:', error));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const openEdit = (user: User) => {
    setActionError('');
    setEditingUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      bio: user.bio || '',
    });
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setActionError('');
    try {
      await api.put(`/api/admin/users/${editingUser.id}`, editForm);
      setEditingUser(null);
      await fetchUsers();
    } catch (error: any) {
      setActionError(getErrorMessage(error, '保存失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateError('');
    try {
      await api.post('/api/admin/users', createForm);
      setShowCreate(false);
      setCreateForm({ username: '', email: '', password: '', role: 'user', bio: '' });
      await fetchUsers();
    } catch (error: any) {
      setCreateError(getErrorMessage(error, '创建失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setSubmitting(true);
    setActionError('');
    try {
      await api.delete(`/api/admin/users/${deletingUser.id}`);
      setDeletingUser(null);
      await fetchUsers();
    } catch (error: any) {
      setActionError(getErrorMessage(error, '删除失败，请稍后重试'));
    } finally {
      setSubmitting(false);
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
    setSelected(e.target.checked ? new Set(users.map((user) => user.id)) : new Set());
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selected.size} 项吗？`)) return;
    try {
      await api.post('/api/admin/users/batch-delete', { ids: Array.from(selected) });
      setSelected(new Set());
      await fetchUsers();
    } catch (error: any) {
      alert(getErrorMessage(error, '批量删除失败，请稍后重试'));
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
        <h1 className="text-xl font-semibold text-gray-900">用户管理</h1>
        <button
          onClick={() => { setCreateError(''); setShowCreate(true); }}
          className="bg-[#f46] hover:bg-[#d63a5c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          添加用户
        </button>
      </div>

      {/* 搜索 */}
      <form onSubmit={handleSearch} className="flex items-end gap-4 py-4 border-b border-gray-200">
        <input
          placeholder="搜索用户名或邮箱..."
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

      {/* 用户表格 */}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3.5 text-left w-10">
              <input
                type="checkbox"
                className="accent-[#f46]"
                checked={users.length > 0 && selected.size === users.length}
                onChange={toggleSelectAll}
              />
            </th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-20">ID</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400">用户名</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400">邮箱</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-24">角色</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-32">注册时间</th>
            <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 w-32">操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
              <td className="px-4 py-3.5">
                <input
                  type="checkbox"
                  className="accent-[#f46]"
                  checked={selected.has(user.id)}
                  onChange={() => toggleSelect(user.id)}
                />
              </td>
              <td className="px-4 py-3.5">
                <span className="text-gray-400 font-mono text-sm">#{user.id}</span>
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#f46]/10 text-[#f46] rounded-full flex items-center justify-center font-medium text-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">{user.username}</span>
                </div>
              </td>
              <td className="px-4 py-3.5 text-gray-600">{user.email}</td>
              <td className="px-4 py-3.5">
                <span className={`text-xs font-medium ${user.role === 'admin' ? 'text-[#f46]' : 'text-gray-500'}`}>
                  {user.role === 'admin' ? '管理员' : '用户'}
                </span>
              </td>
              <td className="px-4 py-3.5 text-sm text-gray-500">
                {new Date(user.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEdit(user)}
                    className="text-sm text-[#f46] hover:text-[#d63a5c] font-medium transition-colors"
                  >
                    编辑
                  </button>
                  {user.id === currentUserId ? (
                    <span className="text-sm text-gray-300 cursor-not-allowed" title="不能删除当前登录的管理员账号">删除</span>
                  ) : (
                    <button
                      onClick={() => { setActionError(''); setDeletingUser(user); }}
                      className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="text-center py-16 border-b border-gray-100">
          <p className="text-gray-400 text-sm">暂无用户</p>
        </div>
      )}

      {/* 编辑用户弹窗 */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">编辑用户</h2>
            </div>
            <form onSubmit={submitEdit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">用户名</label>
                <input
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">角色</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className={selectCls}
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">简介</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>
              {actionError && <p className="text-sm text-red-500">{actionError}</p>}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#f46] hover:bg-[#d63a5c] text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 添加用户弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">添加用户</h2>
            </div>
            <form onSubmit={submitCreate} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">昵称 / 用户名</label>
                <input
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">邮箱</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">密码</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">角色</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className={selectCls}
                >
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">简介（可选）</label>
                <textarea
                  value={createForm.bio}
                  onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
              {createError && <p className="text-sm text-red-500">{createError}</p>}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#f46] hover:bg-[#d63a5c] text-white text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {submitting ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">确认删除用户？</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600">
                即将删除用户「{deletingUser.username}」（#{deletingUser.id}），该操作不可恢复。
              </p>
              {actionError && <p className="text-sm text-red-500 mt-3">{actionError}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {submitting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
