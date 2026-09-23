import { useState } from 'react';

const KEY = 'mukhbiteen.sidebar.collapsed';

/** تذكّر حالة طي القائمة الجانبية (سطح المكتب) بين الجلسات */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(KEY, next ? '1' : '0');
      } catch {
        /* التخزين غير متاح */
      }
      return next;
    });

  return [collapsed, toggle] as const;
}
