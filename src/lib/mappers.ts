/**
 * تحويل بين أعمدة قاعدة البيانات (snake_case) وأنواع التطبيق (camelCase).
 * الحقول المتداخلة (memorization, revision, prayers) تُخزَّن كما هي (jsonb) بلا تحويل إضافي.
 */
import type { Activity, DailyWorship, HonorBoard, NextRequirement, SessionRecord, Student } from '@/types';

export function studentFromRow(r: any): Student {
  return {
    id: r.id,
    name: r.name,
    shortName: r.short_name,
    photo: r.photo_url ?? undefined,
    birthDate: r.birth_date ?? '',
    group: r.group_name,
    guardianName: r.guardian_name ?? '',
    guardianEmail: r.guardian_email ?? undefined,
    joinedAt: r.joined_at,
    notes: r.notes ?? undefined,
    active: r.active,
  };
}

export function studentToRow(s: Partial<Student>) {
  const row: Record<string, unknown> = {};
  if (s.id !== undefined) row.id = s.id;
  if (s.name !== undefined) row.name = s.name;
  if (s.shortName !== undefined) row.short_name = s.shortName;
  if (s.photo !== undefined) row.photo_url = s.photo || null;
  if (s.birthDate !== undefined) row.birth_date = s.birthDate || null;
  if (s.group !== undefined) row.group_name = s.group;
  if (s.guardianName !== undefined) row.guardian_name = s.guardianName;
  if (s.guardianEmail !== undefined) row.guardian_email = s.guardianEmail || null;
  if (s.joinedAt !== undefined) row.joined_at = s.joinedAt;
  if (s.notes !== undefined) row.notes = s.notes;
  if (s.active !== undefined) row.active = s.active;
  return row;
}

export function sessionFromRow(r: any): SessionRecord {
  return {
    id: r.id,
    studentId: r.student_id,
    date: r.date,
    attendance: r.attendance,
    commitment: r.commitment ?? undefined,
    score: r.score ?? undefined,
    memorization: r.memorization ?? undefined,
    revision: r.revision ?? undefined,
    notes: r.notes ?? undefined,
  };
}

export function sessionToRow(s: SessionRecord) {
  return {
    id: s.id,
    student_id: s.studentId,
    date: s.date,
    attendance: s.attendance,
    commitment: s.commitment ?? null,
    score: s.score ?? null,
    memorization: s.memorization ?? null,
    revision: s.revision ?? null,
    notes: s.notes ?? null,
  };
}

export function dailyWorshipFromRow(r: any): DailyWorship {
  return {
    id: r.id,
    studentId: r.student_id,
    date: r.date,
    prayers: r.prayers,
    morningAdhkar: r.morning_adhkar,
    eveningAdhkar: r.evening_adhkar,
    sleepAdhkar: r.sleep_adhkar,
    duhaRakahs: r.duha_rakahs,
    qiyam: r.qiyam,
    witrRakahs: r.witr_rakahs,
    rawatibRakahs: r.rawatib_rakahs,
    parentsSatisfaction: r.parents_satisfaction,
    wirdFromPage: r.wird_from_page ?? undefined,
    wirdToPage: r.wird_to_page ?? undefined,
    charity: r.charity,
    notes: r.notes ?? undefined,
  };
}

export function dailyWorshipToRow(d: DailyWorship) {
  return {
    id: d.id,
    student_id: d.studentId,
    date: d.date,
    prayers: d.prayers,
    morning_adhkar: d.morningAdhkar,
    evening_adhkar: d.eveningAdhkar,
    sleep_adhkar: d.sleepAdhkar,
    duha_rakahs: d.duhaRakahs,
    qiyam: d.qiyam,
    witr_rakahs: d.witrRakahs,
    rawatib_rakahs: d.rawatibRakahs,
    parents_satisfaction: d.parentsSatisfaction,
    wird_from_page: d.wirdFromPage ?? null,
    wird_to_page: d.wirdToPage ?? null,
    charity: d.charity,
    notes: d.notes ?? null,
  };
}

export function requirementFromRow(r: any): NextRequirement {
  return {
    studentId: r.student_id,
    date: r.date,
    memorization: r.memorization ?? '',
    revision: r.revision ?? '',
    extraTask: r.extra_task ?? undefined,
    notes: r.notes ?? undefined,
    updatedAt: r.updated_at,
  };
}

export function requirementToRow(r: NextRequirement) {
  return {
    student_id: r.studentId,
    date: r.date,
    memorization: r.memorization,
    revision: r.revision,
    extra_task: r.extraTask ?? null,
    notes: r.notes ?? null,
    updated_at: r.updatedAt,
  };
}

export function activityFromRow(r: any): Activity {
  return {
    id: r.id,
    image: r.image_url,
    title: r.title,
    description: r.description ?? '',
    date: r.date,
    durationDays: r.duration_days,
  };
}

export function activityToRow(a: Partial<Activity>) {
  const row: Record<string, unknown> = {};
  if (a.id !== undefined) row.id = a.id;
  if (a.image !== undefined) row.image_url = a.image;
  if (a.title !== undefined) row.title = a.title;
  if (a.description !== undefined) row.description = a.description;
  if (a.date !== undefined) row.date = a.date;
  if (a.durationDays !== undefined) row.duration_days = a.durationDays;
  return row;
}

export function honorBoardFromRow(r: any): HonorBoard {
  return {
    id: r.id,
    title: r.title,
    periodFrom: r.period_from,
    periodTo: r.period_to,
    published: r.published,
    entries: r.entries ?? [],
    createdAt: r.created_at,
  };
}

export function honorBoardToRow(h: HonorBoard) {
  return {
    id: h.id,
    title: h.title,
    period_from: h.periodFrom,
    period_to: h.periodTo,
    published: h.published,
    entries: h.entries,
    created_at: h.createdAt,
  };
}
