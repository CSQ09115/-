'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ConfigIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/config/weather');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-[#f46]"></div>
    </div>
  );
}
