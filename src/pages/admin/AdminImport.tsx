import { useMemo, useState, type ChangeEvent } from 'react';
import { AlertTriangle, FileSpreadsheet, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from '@/components/shared/PageHeader';
import Select from '@/components/ui/Select';
import type { AttendanceStatus, DailyWorship, MemorizationEntry, RevisionEntry, SessionRecord, Student } from '@/types';
import { LogParseError, normalizeArabic, parseRecitationLog, type LogEntry, type ParsedLog } from '@/utils/recitationLog';
import { completionPercent } from '@/utils/quran';
import { suggestScore } from '@/utils/stats';
import { weekDates, weekStartOf, weekWorshipScore } from '@/utils/worship';
import { PROJECT } from '@/data/project';
import { cx, formatDate, formatLongDate } from '@/utils/format';

const NEW_STUDENT = '__new__';

interface NameMatch {
  fileName: string;
  studentId: string; // '' = غير محدد، NEW_STUDENT = إضافة طالب جديد
  ignored: boolean;
}

/** ربط الأسماء اللي اختارها المشرف يدويًا (اسم بالشيت → طالب) — يُتذكّر للاستيراد الأسبوعي القادم على نفس الجهاز */
const NAME_MAP_KEY = 'mukhbiteen.import.nameMap';
function loadNameMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(NAME_MAP_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function saveNameMap(pairs: [string, string][]) {
  try {
    localStorage.setItem(NAME_MAP_KEY, JSON.stringify({ ...loadNameMap(), ...Object.fromEntries(pairs) }));
  } catch {
    /* التخزين غير متاح */
  }
}

const pagesLabel = (n: number) => (n >= 3 && n <= 10 ? `${n} صفحات` : `${n} صفحة`);

/** يحوّل صف الشيت لسجل دوام، مع الحفاظ على ما أُدخل يدويًا بالموقع (الالتزام، الملاحظات، العلامة...) */
function toSession(e: LogEntry, studentId: string, prev: SessionRecord | undefined, opts: { defaultGrade: number; zeroAs: AttendanceStatus; weekWorship: number }): SessionRecord {
  const id = `${studentId}-${e.date}`;
  const recited = (e.memCompleted ?? 0) > 0 || (e.revCompleted ?? 0) > 0;
  const prevAttended = prev?.attendance === 'present' || prev?.attendance === 'late';
  const attendance: AttendanceStatus = recited ? (prevAttended ? prev!.attendance : 'present') : prev?.attendance ?? opts.zeroAs;
  if (attendance !== 'present' && attendance !== 'late') return { id, studentId, date: e.date, attendance, notes: prev?.notes };

  const hasMem = (e.memRequired ?? 0) > 0 || (e.memCompleted ?? 0) > 0 || !!e.memText;
  const hasRev = (e.revRequired ?? 0) > 0 || (e.revCompleted ?? 0) > 0 || !!e.revText;
  const memReq = e.memRequired ?? 0;
  const memDone = e.memCompleted ?? 0;
  const revReq = e.revRequired ?? 0;
  const revDone = e.revCompleted ?? 0;
  const memorization: MemorizationEntry | null = hasMem
    ? {
        required: prev?.memorization?.required || (memReq ? pagesLabel(memReq) : ''),
        recited: e.memText ?? prev?.memorization?.recited ?? '',
        requiredPages: memReq,
        completedPages: memDone,
        completion: completionPercent(memReq, memDone),
        grade: e.grade ?? prev?.memorization?.grade ?? opts.defaultGrade,
        notes: prev?.memorization?.notes,
      }
    : null;
  const revision: RevisionEntry | null = hasRev
    ? {
        required: prev?.revision?.required || (revReq ? pagesLabel(revReq) : ''),
        revised: e.revText ?? prev?.revision?.revised ?? '',
        requiredPages: revReq,
        completedPages: revDone,
        completion: completionPercent(revReq, revDone),
        grade: e.grade ?? prev?.revision?.grade ?? opts.defaultGrade,
        notes: prev?.revision?.notes,
      }
    : null;
  return {
    id,
    studentId,
    date: e.date,
    attendance,
    commitment: prev?.commitment,
    score: prev?.score ?? suggestScore({ attendance, memGrade: memorization?.grade, revGrade: revision?.grade, weekWorship: opts.weekWorship }),
    memorization,
    revision,
    notes: prev?.notes,
  };
}

export default function AdminImport() {
  const { students, sessions, dailyWorship, upsertSessions, addStudent, deleteSessions } = useData();
  const toast = useToast();

  const [log, setLog] = useState<ParsedLog | null>(null);
  const [fileName, setFileName] = useState('');
  const [matches, setMatches] = useState<NameMatch[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [onlyNew, setOnlyNew] = useState(false);
  const [zeroAs, setZeroAs] = useState<AttendanceStatus>('absent');
  const [defaultGrade, setDefaultGrade] = useState(90);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => {
    setLog(null);
    setMatches([]);
    setErr('');
    setFileName('');
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      const parsed = await parseRecitationLog(file);
      const byName = new Map(students.map((s) => [normalizeArabic(s.name), s.id]));
      const remembered = loadNameMap();
      const exists = new Set(students.map((s) => s.id));
      const lookup = (n: string) => byName.get(normalizeArabic(n)) ?? (exists.has(remembered[normalizeArabic(n)]) ? remembered[normalizeArabic(n)] : '');
      setLog(parsed);
      setFileName(file.name);
      setFrom(parsed.dates[0]);
      setTo(parsed.dates[parsed.dates.length - 1]);
      setMatches(parsed.studentNames.map((n) => ({ fileName: n, studentId: lookup(n), ignored: false })));
    } catch (x) {
      setErr(x instanceof LogParseError ? x.message : 'تعذّر قراءة الملف. تأكد إنه بصيغة Excel (xlsx) صحيحة.');
    } finally {
      setBusy(false);
    }
  };

  const sessionIds = useMemo(() => new Set(sessions.map((s) => s.id)), [sessions]);

  /** صفوف الملف الداخلة فعلًا بالاستيراد (حسب الفترة والخيارات)، مجمّعة حسب اسم الطالب بالملف */
  const plan = useMemo(() => {
    const perName = new Map<string, { entries: LogEntry[]; fresh: number; updates: number }>();
    if (!log) return perName;
    const idOf = new Map(matches.map((m) => [m.fileName, m]));
    log.entries.forEach((e) => {
      if (e.date < from || e.date > to) return;
      const m = idOf.get(e.studentName);
      const exists = !!m?.studentId && m.studentId !== NEW_STUDENT && sessionIds.has(`${m.studentId}-${e.date}`);
      if (onlyNew && exists) return;
      const p = perName.get(e.studentName) ?? { entries: [], fresh: 0, updates: 0 };
      p.entries.push(e);
      if (exists) p.updates++;
      else p.fresh++;
      perName.set(e.studentName, p);
    });
    return perName;
  }, [log, matches, from, to, onlyNew, sessionIds]);

  const active = matches.filter((m) => !m.ignored);
  const unresolved = active.filter((m) => !m.studentId && plan.get(m.fileName)?.entries.length).length;
  const totalRows = active.reduce((a, m) => a + (plan.get(m.fileName)?.entries.length ?? 0), 0);
  const takenIds = new Set(matches.filter((m) => !m.ignored && m.studentId && m.studentId !== NEW_STUDENT).map((m) => m.studentId));
  const duplicateTarget = matches.some((m, i) => !m.ignored && m.studentId && m.studentId !== NEW_STUDENT && matches.findIndex((x) => !x.ignored && x.studentId === m.studentId) !== i);

  const setMatch = (fileName: string, p: Partial<NameMatch>) => setMatches((ms) => ms.map((m) => (m.fileName === fileName ? { ...m, ...p } : m)));

  const worshipFor = (studentId: string, date: string) => {
    const dates = weekDates(weekStartOf(date)).filter((d) => d <= date);
    const days = dates.map((d) => dailyWorship.find((w) => w.id === `${studentId}-${d}`)).filter((x): x is DailyWorship => !!x);
    return weekWorshipScore(days);
  };

  const runImport = async () => {
    if (!log) return;
    setBusy(true);
    try {
      const idByName = new Map<string, string>();
      for (const m of active) {
        if (!m.studentId || !plan.get(m.fileName)?.entries.length) continue;
        if (m.studentId === NEW_STUDENT) {
          const first = plan.get(m.fileName)!.entries.map((e) => e.date).sort()[0];
          const created: Student = await addStudent({ name: m.fileName, shortName: m.fileName, birthDate: '', group: PROJECT.group, guardianName: '', guardianEmail: '', joinedAt: first, notes: '', active: true });
          idByName.set(m.fileName, created.id);
        } else idByName.set(m.fileName, m.studentId);
      }
      const byId = new Map(sessions.map((s) => [s.id, s]));
      const records: SessionRecord[] = [];
      idByName.forEach((sid, name) => {
        plan.get(name)!.entries.forEach((e) => {
          records.push(toSession(e, sid, byId.get(`${sid}-${e.date}`), { defaultGrade, zeroAs, weekWorship: worshipFor(sid, e.date) }));
        });
      });
      await upsertSessions(records);
      saveNameMap([...idByName].map(([name, sid]) => [normalizeArabic(name), sid]));
      toast(`تم استيراد ${records.length} سجل دوام لـ ${idByName.size} طالبًا`);
      reset();
    } catch (x) {
      toast(x instanceof Error ? x.message : 'حدث خطأ أثناء الاستيراد.');
    } finally {
      setBusy(false);
    }
  };

  /* ---------- الأيام المسجّلة (للحذف) ---------- */
  const days = useMemo(() => {
    const map = new Map<string, SessionRecord[]>();
    sessions.forEach((s) => map.set(s.date, [...(map.get(s.date) ?? []), s]));
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sessions]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const deleteDay = async (date: string, list: SessionRecord[]) => {
    if (!confirm(`حذف دوام ${formatLongDate(date)} لكل الطلاب (${list.length} سجل)؟ لا يمكن التراجع عن الحذف.`)) return;
    setDeleting(date);
    try {
      await deleteSessions(list.map((s) => s.id));
      toast('تم حذف دوام هذا اليوم');
    } catch (x) {
      toast(x instanceof Error ? x.message : 'حدث خطأ أثناء الحذف.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="استيراد سجل التسميع" subtitle="ارفع شيت سجل التسميع الأسبوعي كما هو، ويتم تحديث دوام كل الطلاب بكل التواريخ مباشرة" />

      {!log ? (
        <section className="card space-y-3 p-5">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-navy-200 bg-navy-50/40 p-10 text-center text-[13px] text-navy-500 hover:bg-navy-50">
            {busy ? <Loader2 className="h-9 w-9 animate-spin text-navy-300" /> : <UploadCloud className="h-9 w-9 text-navy-300" />}
            {busy ? 'جارٍ القراءة...' : 'اختر ملف سجل التسميع (xlsx) من جهازك'}
            <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={onFile} disabled={busy} />
          </label>
          {err && (
            <p className="flex items-center gap-2 rounded-xl bg-burgundy-50 px-3 py-2 text-[13px] text-burgundy-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
            </p>
          )}
          <ul className="space-y-1 text-[12px] text-navy-400">
            <li className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 shrink-0" /> نفس شيت "سجل التسميع": عمود تاريخ الدوام، واسم كل طالب فوق أعمدته (حفظ مطلوب، الصفحات المسمّعة حفظًا، حفظ مسمّع، مراجعة مطلوبة، الصفحات المسمّعة مراجعةً، مراجعة مسمّعة، جودة التسميع %).
            </li>
            <li className="pr-6">يقبل كمان الشكل الطويل (صف لكل طالب بكل تاريخ مع عمود "اسم الطالب"). صف "المجموع" والتواريخ الفاضية يتم تجاهلها تلقائيًا.</li>
            <li className="pr-6">كل أسبوع ارفع نفس الملف بعد إضافة الأسبوع الجديد — الأيام الموجودة تتحدّث بدون تكرار.</li>
          </ul>
        </section>
      ) : (
        <>
          <section className="card space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="section-title">{fileName}</h3>
                <p className="text-[12px] text-navy-400">
                  {log.studentNames.length} طالبًا – {log.dates.length} يوم دوام ({formatDate(log.dates[0])} – {formatDate(log.dates[log.dates.length - 1])})
                </p>
              </div>
              <button className="btn-ghost" onClick={reset}>
                اختيار ملف آخر
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label>
                <span className="field-label">من تاريخ</span>
                <input type="date" className="input" value={from} min={log.dates[0]} max={to} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                <span className="field-label">إلى تاريخ</span>
                <input type="date" className="input" value={to} min={from} max={log.dates[log.dates.length - 1]} onChange={(e) => setTo(e.target.value)} />
              </label>
              <label>
                <span className="field-label">الطالب اللي ما سمّع شيء يُسجَّل</span>
                <Select
                  value={zeroAs}
                  onChange={(v) => setZeroAs(v as AttendanceStatus)}
                  options={[
                    { value: 'absent', label: 'غائب' },
                    { value: 'present', label: 'حاضر (لم يُنجز)' },
                  ]}
                />
              </label>
              <label>
                <span className="field-label">جودة التسميع إذا كانت فاضية بالشيت</span>
                <input type="number" min={0} max={100} className="input" value={defaultGrade} onChange={(e) => setDefaultGrade(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-navy-700">
              <input type="checkbox" className="h-4 w-4 accent-burgundy-600" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
              استيراد الأيام الجديدة فقط (تجاهل الأيام المسجّلة مسبقًا بالموقع)
            </label>
            <p className="text-[12px] text-navy-400">الأيام المسجّلة مسبقًا تتحدّث أرقام الحفظ والمراجعة فيها فقط — الالتزام والملاحظات والعلامة المدخلة يدويًا تبقى كما هي.</p>
          </section>

          {(unresolved > 0 || duplicateTarget) && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {duplicateTarget ? 'فيه اسمين بالملف مربوطين بنفس الطالب — صحّح الربط قبل الاستيراد.' : 'فيه أسماء ما طابقت أي طالب بالموقع — حدّد الطالب الصحيح، أو أضفه كطالب جديد، أو تجاهل الاسم.'}
            </p>
          )}

          <section className="card overflow-hidden">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[820px] text-[13px]">
                <thead className="bg-navy-50/60 text-right text-[12px] text-navy-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">الاسم بالملف</th>
                    <th className="px-3 py-3 font-medium">الطالب بالموقع</th>
                    <th className="px-3 py-3 font-medium">أيام جديدة</th>
                    <th className="px-3 py-3 font-medium">أيام تتحدّث</th>
                    <th className="px-3 py-3 font-medium">الحفظ (مطلوب / مسمّع)</th>
                    <th className="px-3 py-3 font-medium">المراجعة (مطلوب / مسمّع)</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => {
                    const p = plan.get(m.fileName);
                    const sum = (k: keyof LogEntry) => p?.entries.reduce((a, e) => a + ((e[k] as number | undefined) ?? 0), 0) ?? 0;
                    return (
                      <tr key={m.fileName} className={cx('border-t border-navy-50', m.ignored ? 'opacity-40' : !m.studentId && 'bg-amber-50/50')}>
                        <td className="px-5 py-2.5 font-bold text-navy-900">{m.fileName}</td>
                        <td className="px-3 py-2.5">
                          <Select
                            small
                            className="w-52"
                            ariaLabel="تحديد الطالب"
                            value={m.studentId}
                            onChange={(v) => setMatch(m.fileName, { studentId: v })}
                            options={[
                              { value: '', label: '— اختر —' },
                              { value: NEW_STUDENT, label: '+ إضافة كطالب جديد' },
                              ...students.filter((s) => s.id === m.studentId || !takenIds.has(s.id)).map((s) => ({ value: s.id, label: s.name })),
                            ]}
                          />
                        </td>
                        <td className="px-3 py-2.5 text-emerald-700">{p?.fresh ?? 0}</td>
                        <td className="px-3 py-2.5 text-navy-600">{p?.updates ?? 0}</td>
                        <td className="px-3 py-2.5 text-navy-600">
                          {sum('memRequired')} / {sum('memCompleted')}
                        </td>
                        <td className="px-3 py-2.5 text-navy-600">
                          {sum('revRequired')} / {sum('revCompleted')}
                        </td>
                        <td className="px-5 py-2.5 text-left">
                          <button type="button" className="text-[12px] font-medium text-burgundy-600 hover:underline" onClick={() => setMatch(m.fileName, { ignored: !m.ignored })}>
                            {m.ignored ? 'إلغاء التجاهل' : 'تجاهل'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy-100 bg-white/95 px-5 py-3 shadow-lift backdrop-blur">
            <span className="text-[13px] text-navy-500">{totalRows} سجل دوام جاهز للحفظ</span>
            <button className="btn-accent px-10 py-3 text-[15px]" onClick={runImport} disabled={busy || totalRows === 0 || unresolved > 0 || duplicateTarget}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />} استيراد وحفظ
            </button>
          </div>
        </>
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-navy-50 px-5 py-4">
          <h3 className="section-title">أيام الدوام المسجّلة</h3>
          <p className="text-[12px] text-navy-400">لحذف دوام يوم كامل لكل الطلاب (مثلًا تاريخ انكتب غلط بالشيت). لحذف يوم لطالب واحد: صفحة الطالب ← تبويب الدوام.</p>
        </div>
        {days.length === 0 ? (
          <p className="p-6 text-center text-navy-400">لا يوجد أي دوام مسجّل بعد.</p>
        ) : (
          <ul className="scrollbar-thin max-h-[420px] divide-y divide-navy-50 overflow-y-auto">
            {days.map(([date, list]) => (
              <li key={date} className="flex items-center gap-3 px-5 py-2.5">
                <span className="flex-1 text-[13px] font-medium text-navy-800">{formatLongDate(date)}</span>
                <span className="text-[12px] text-navy-400">
                  {list.length} طالب – حاضر {list.filter((s) => s.attendance === 'present' || s.attendance === 'late').length}
                </span>
                <button className="rounded-lg p-1.5 text-burgundy-500 hover:bg-burgundy-50 disabled:opacity-40" onClick={() => deleteDay(date, list)} disabled={deleting === date} aria-label="حذف دوام هذا اليوم">
                  {deleting === date ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
