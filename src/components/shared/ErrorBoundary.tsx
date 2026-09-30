import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * يمسك أي خطأ بالصفحة ويعرض رسالة مع زر إعادة تحميل، بدل ما تصير الشاشة كلها بيضا.
 * إعادة التحميل تمسح المسودات المؤقتة (sessionStorage) لأن مسودة تالفة ممكن تكون سبب الخطأ نفسه.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  private reload = () => {
    try {
      sessionStorage.clear();
    } catch {
      /* التخزين غير متاح */
    }
    location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card-quiet space-y-3 p-10 text-center">
        <AlertTriangle className="mx-auto h-9 w-9 text-burgundy-500" />
        <p className="text-[15px] font-bold text-navy-800">صار خطأ بهذه الصفحة</p>
        <p className="text-[12px] text-navy-400" dir="ltr">
          {this.state.error.message}
        </p>
        <button className="btn-accent mx-auto" onClick={this.reload}>
          <RotateCcw className="h-4 w-4" /> إعادة تحميل الصفحة
        </button>
      </div>
    );
  }
}
