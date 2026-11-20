interface ApiEndpoint {
  method: string;
  path: string;
  desc: string;
  auth?: boolean;
}

const API_GROUPS: { title: string; endpoints: ApiEndpoint[] }[] = [
  {
    title: '用户与认证',
    endpoints: [
      { method: 'POST', path: '/api/users/register', desc: '注册（需邮箱验证码）' },
      { method: 'POST', path: '/api/users/login', desc: '登录，返回 access_token（表单提交）' },
      { method: 'POST', path: '/api/users/send-verification-code', desc: '发送邮箱验证码（register / password_reset）' },
      { method: 'POST', path: '/api/users/verify-email', desc: '校验邮箱验证码' },
      { method: 'POST', path: '/api/users/forgot-password', desc: '发送密码重置验证码' },
      { method: 'POST', path: '/api/users/reset-password', desc: '使用验证码重置密码' },
      { method: 'GET', path: '/api/users/me', desc: '当前用户信息', auth: true },
    ],
  },
  {
    title: '植物百科',
    endpoints: [
      { method: 'GET', path: '/api/plants', desc: '植物列表（支持分页搜索）' },
      { method: 'GET', path: '/api/plants/{id}', desc: '植物详情' },
      { method: 'GET', path: '/api/plants/{id}/diaries', desc: '植物养护日记' },
    ],
  },
  {
    title: '商品与订单',
    endpoints: [
      { method: 'GET', path: '/api/products', desc: '商品列表' },
      { method: 'GET', path: '/api/products/{id}', desc: '商品详情' },
      { method: 'GET', path: '/api/cart', desc: '购物车', auth: true },
      { method: 'POST', path: '/api/orders', desc: '创建订单', auth: true },
      { method: 'GET', path: '/api/orders/my', desc: '我的订单', auth: true },
      { method: 'POST', path: '/api/payments', desc: '支付（模拟流程）', auth: true },
    ],
  },
  {
    title: '短信验证码登录',
    endpoints: [
      { method: 'POST', path: '/api/users/send-sms-code', desc: '发送短信验证码（互亿无线，同一手机号 60 秒限频）' },
      { method: 'POST', path: '/api/users/login-by-sms', desc: '手机号 + 验证码登录，首次登录自动创建账号，返回 Token' },
    ],
  },
  {
    title: 'AI 与识别',
    endpoints: [
      { method: 'POST', path: '/api/ai/chat', desc: 'AI 问诊对话', auth: true },
      { method: 'POST', path: '/api/recognition/plant', desc: '植物识别（上传图片）', auth: true },
      { method: 'POST', path: '/api/diagnosis/pest', desc: '病虫害识别（上传图片）', auth: true },
    ],
  },
  {
    title: '其他能力',
    endpoints: [
      { method: 'GET', path: '/api/weather', desc: '天气查询' },
      { method: 'GET', path: '/api/recommend', desc: '植物推荐' },
      { method: 'GET', path: '/api/reminders', desc: '养护提醒', auth: true },
      { method: 'GET', path: '/api/diaries', desc: '养护日记', auth: true },
      { method: 'GET', path: '/api/devices', desc: 'IoT 设备数据', auth: true },
      { method: 'WS', path: '/ws/{user_id}', desc: 'WebSocket 实时推送' },
    ],
  },
  {
    title: '管理端接口（需管理员权限）',
    endpoints: [
      { method: 'GET', path: '/api/admin/stats/overview', desc: '仪表盘统计', auth: true },
      { method: 'GET', path: '/api/admin/plants', desc: '植物管理列表', auth: true },
      { method: 'GET', path: '/api/admin/users', desc: '用户管理列表', auth: true },
      { method: 'GET', path: '/api/admin/orders', desc: '订单管理列表', auth: true },
      { method: 'GET', path: '/api/admin/system-config', desc: '系统配置读取', auth: true },
      { method: 'GET', path: '/api/admin/email-logs', desc: '邮件发送日志', auth: true },
    ],
  },
];

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-blue-50 text-blue-600',
  POST: 'bg-green-50 text-green-600',
  PUT: 'bg-yellow-50 text-yellow-600',
  DELETE: 'bg-red-50 text-red-500',
  WS: 'bg-purple-50 text-purple-600',
};

export default function ApiDocsPage() {
  return (
    <div>
      {/* 页头 */}
      <div className="pb-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">API 对接文档</h1>
        <p className="text-sm text-gray-400 mt-1.5 max-w-3xl">
          后端基础地址：<code className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-xs">http://localhost:8000</code>
          。需要鉴权的接口请在请求头携带{' '}
          <code className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-xs">Authorization: Bearer &lt;access_token&gt;</code>
          ，登录/注册接口返回的 access_token 有效期见后台配置。完整接口定义可在{' '}
          <code className="text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded text-xs">http://localhost:8000/docs</code>{' '}
          查看 Swagger 文档。
        </p>
      </div>

      {/* 接口分组：卡片式，下划线分隔行 */}
      <div className="pt-6 space-y-8">
        {API_GROUPS.map((group) => (
          <section key={group.title}>
            <h2 className="text-[15px] font-semibold text-gray-900 pb-2.5 border-b border-gray-200">
              {group.title}
            </h2>
            <div className="divide-y divide-gray-100">
              {group.endpoints.map((endpoint) => (
                <div key={`${endpoint.method}-${endpoint.path}`} className="flex items-center gap-3 py-2.5">
                  <span className={`shrink-0 w-16 text-center px-1.5 py-0.5 rounded text-xs font-semibold font-mono ${METHOD_STYLES[endpoint.method] || 'bg-gray-100 text-gray-500'}`}>
                    {endpoint.method}
                  </span>
                  <code className="text-sm text-gray-900 font-mono truncate">{endpoint.path}</code>
                  {endpoint.auth && (
                    <span className="shrink-0 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">需登录</span>
                  )}
                  <span className="ml-auto text-sm text-gray-400 text-right">{endpoint.desc}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
