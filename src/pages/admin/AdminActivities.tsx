import { useState, type ChangeEvent } from 'react';
import { CalendarDays, Clock, ImagePlus, Images, Loader2, PencilLine, Plus, Star, Trash2, X } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/shared/PageHeader';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Slideshow from '@/components/parent/Slideshow';
import { Field } from '@/components/admin/fields';
import type { Activity, ActivityImage } from '@/types';
import { supabase } from '@/lib/supabase';
import { TODAY } from '@/utils/today';
import { isActivityLive } from '@/utils/stats';
import { daysBetween, formatDate } from '@/utils/format';

const blank: Omit<Activity, 'id'> = { image: '', images: [], title: '', description: '', date: TODAY, durationDays: 6 };

export default function AdminActivities() {
  const { activities, addActivity, updateActivity, deleteActivity } = useData();
  const toast = useToast();
  const [modal, setModal] = useState<{ open: boolean; id?: string }>({ open: false });
  const [d, setD] = useState<Omit<Activity, 'id'>>(blank);
  const [err, setErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const live = activities.filter((a) => isActivityLive(a, TODAY));

  const openNew = () => {
    setD(blank);
    setErr('');
    setModal({ open: true });
  };
  const openEdit = (a: Activity) => {
    setD(a);
    setErr('');
    setModal({ open: true, id: a.id });
  };
  // رفع عدة صور دفعة واحدة — تنضاف لنفس المنشور
  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setErr('');
    const added: ActivityImage[] = [];
    for (const [k, f] of files.entries()) {
      const ext = f.name.split('.').pop() || 'jpg';
      // اسم لاتيني عشوائي: أسماء الملفات العربية ترفضها حاوية التخزين
      const path = `${Date.now()}-${k}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { data, error } = await supabase.storage.from('activity-images').upload(path, f, { upsert: true });
      if (error) {
        setErr(`تعذّر رفع الصورة "${f.name}": ${error.message}`);
        continue;
      }
      added.push({ url: supabase.storage.from('activity-images').getPublicUrl(data.path).data.publicUrl });
    }
    setUploading(false);
    setD((x) => ({ ...x, images: [...x.images, ...added] }));
  };
  const setCaption = (k: number, caption: string) => setD((x) => ({ ...x, images: x.images.map((im, j) => (j === k ? { ...im, caption } : im)) }));
  const removeImage = (k: number) => setD((x) => ({ ...x, images: x.images.filter((_, j) => j !== k) }));
  const makeMain = (k: number) => setD((x) => ({ ...x, images: [x.images[k], ...x.images.filter((_, j) => j !== k)] }));
  const save = async () => {
    if (!d.images.length) return setErr('اختر صورة واحدة على الأقل.');
    setSaving(true);
    setErr('');
    try {
      if (modal.id) await updateActivity(modal.id, d);
      else await addActivity(d);
      toast(modal.id ? 'تم حفظ التعديلات' : 'تمت إضافة الصورة');
      setModal({ open: false });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="الصور والأنشطة"
        subtitle="الصور التي تظهر في السلايد شو بصفحة ولي الأمر"
        actions={
          <button className="btn-accent" onClick={openNew}>
            <Plus className="h-4 w-4" /> إضافة صورة
          </button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <p className="mb-2 text-[12px] text-navy-400">معاينة السلايد شو الحالي ({live.length} صور معروضة)</p>
          <Slideshow items={live} className="h-[300px]" />
        </div>
        <div className="grid content-start gap-4 sm:grid-cols-2 xl:col-span-8 2xl:grid-cols-3">
          {activities.map((a) => {
            const on = isActivityLive(a, TODAY);
            const left = a.durationDays - daysBetween(a.date, TODAY);
            return (
              <article key={a.id} className="card overflow-hidden">
                <div className="relative aspect-[16/10] bg-navy-100">
                  <img src={a.image} alt={a.title} className="h-full w-full object-cover" />
                  {a.images.length > 1 && (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-navy-900/70 px-2.5 py-1 text-[11px] font-bold text-white">
                      <Images className="h-3.5 w-3.5" /> {a.images.length} صور
                    </span>
                  )}
                  <Badge tone={on ? 'green' : 'gray'} dot className="absolute right-3 top-3 bg-white/90">
                    {on ? `معروضة – متبقي ${left} ${left === 1 ? 'يوم' : 'أيام'}` : 'انتهت مدة العرض'}
                  </Badge>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-navy-900">{a.title || <span className="font-normal text-navy-300">بدون عنوان</span>}</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] text-navy-500">{a.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-[12px] text-navy-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(a.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {a.durationDays} أيام
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-ghost flex-1 py-1.5 text-[12px]" onClick={() => openEdit(a)}>
                      <PencilLine className="h-3.5 w-3.5" /> تعديل
                    </button>
                    <button
                      className="btn py-1.5 text-[12px] text-burgundy-600 hover:bg-burgundy-50"
                      onClick={async () => {
                        if (!confirm(a.images.length > 1 ? `حذف هذا المنشور بصوره (${a.images.length})؟` : 'حذف هذه الصورة؟')) return;
                        try {
                          await deleteActivity(a.id);
                          toast('تم حذف الصورة');
                        } catch (e) {
                          toast(e instanceof Error ? e.message : 'حدث خطأ أثناء الحذف.');
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> حذف
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        title={modal.id ? 'تعديل المنشور' : 'إضافة صور'}
        subtitle="تقدر ترفع أكثر من صورة مرة وحدة، والعنوان اختياري"
        size="xl"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setModal({ open: false })}>
              إلغاء
            </button>
            <button className="btn-primary" onClick={save} disabled={saving || uploading}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {modal.id ? 'حفظ التعديلات' : d.images.length > 1 ? `نشر ${d.images.length} صور` : 'إضافة الصورة'}
            </button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {d.images.length > 0 && (
            <ul className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
              {d.images.map((im, k) => (
                <li key={im.url} className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
                  <div className="relative aspect-[16/10] bg-navy-50">
                    <img src={im.url} alt="" className="h-full w-full object-cover" />
                    {k === 0 ? (
                      <span className="absolute right-2 top-2 rounded-full bg-gold-300 px-2 py-0.5 text-[11px] font-bold text-navy-900">الصورة الرئيسية</span>
                    ) : (
                      <button type="button" onClick={() => makeMain(k)} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-navy-700 hover:bg-white">
                        <Star className="h-3 w-3" /> اجعلها الرئيسية
                      </button>
                    )}
                    <button type="button" onClick={() => removeImage(k)} className="absolute left-2 top-2 rounded-full bg-white/90 p-1 text-burgundy-600 hover:bg-white" aria-label="إزالة الصورة">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    className="input rounded-none border-0 border-t border-navy-50 text-[13px]"
                    value={im.caption ?? ''}
                    onChange={(e) => setCaption(k, e.target.value)}
                    placeholder={k === 0 ? 'بدون: يظهر العنوان الرئيسي' : 'عنوان لهذه الصورة (اختياري)'}
                  />
                </li>
              ))}
            </ul>
          )}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-200 bg-navy-50/40 py-6 text-[13px] text-navy-500 hover:bg-navy-50 sm:col-span-2">
            {uploading ? <Loader2 className="h-8 w-8 animate-spin text-navy-300" /> : <ImagePlus className="h-8 w-8 text-navy-300" />}
            {uploading ? 'جارٍ رفع الصور...' : d.images.length ? 'إضافة صور أخرى لنفس المنشور' : 'اختر صورة أو أكثر من جهازك'}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} disabled={uploading} />
          </label>
          <Field label="العنوان الرئيسي (اختياري — يظهر على الصورة الرئيسية فقط)" className="sm:col-span-2">
            <input className="input" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="جانب من لقاء اليوم" />
          </Field>
          <Field label="الوصف (اختياري)" className="sm:col-span-2">
            <textarea className="input min-h-[70px]" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </Field>
          <Field label="تاريخ النشر">
            <input type="date" className="input" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} />
          </Field>
          <Field label="مدة العرض (بالأيام)">
            <input type="number" min={1} className="input" value={d.durationDays} onChange={(e) => setD({ ...d, durationDays: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          {err && <p className="rounded-xl bg-burgundy-50 px-3 py-2 text-[13px] text-burgundy-700 sm:col-span-2">{err}</p>}
        </div>
      </Modal>
    </div>
  );
}
