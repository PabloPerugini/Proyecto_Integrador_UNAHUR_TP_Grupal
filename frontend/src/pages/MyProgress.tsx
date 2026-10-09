import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Spinner, Table } from 'react-bootstrap';
import { studyPlansApi, orderedSubjects, subjectName, careerName, type StudyPlan, type PlanSubject, type ProgressStatus, type UserStudyPlan } from '../api/studyPlans';
import { uploadPdf } from '../api/client';
import { useCareerSelection } from '../context/CareerContext';
import { useFlashMessage } from '../hooks/useFlashMessage';
import PageHeader from '../components/PageHeader';
import MessageBanner from '../components/MessageBanner';
import PdfDropzone from '../components/PdfDropzone';
import { IconBoard, IconCheck, IconCoins } from '../components/icons';

const STATUS: Record<ProgressStatus, string> = {
  PENDIENTE: 'Pendiente', CURSANDO: 'Cursando', REGULARIZADA: 'Regularizada', APROBADA: 'Aprobada',
};
interface Draft { status: ProgressStatus; grade: string }
interface HistorySubject { code?: string; name?: string; status?: string; nota?: number | null }
interface HistoryResponse { subjects: HistorySubject[]; detectedCount?: number }
const fmt = new Intl.NumberFormat('es-AR');
function getId(value: string | { _id: string } | null | undefined): string | null {
  return !value ? null : typeof value === 'string' ? value : value._id;
}
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function Ring({ value, color }: { value: number; color: string }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const r = 43; const circumference = 2 * Math.PI * r;
  return <div className="ring" style={{ width: 96, height: 96 }}>
    <svg width="96" height="96">
      <circle className="ring__track" cx="48" cy="48" r={r} strokeWidth="9" fill="none" />
      <circle className="ring__value" cx="48" cy="48" r={r} stroke="#198754" strokeWidth="9" fill="none" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safe / 100)} />
    </svg><div className="ring__center" style={{ color }}>{safe}%</div>
  </div>;
}
export default function MyProgress() {
  const { careerId: selectedFromContext, setCareerId } = useCareerSelection(); // ahora representa StudyPlan
  const { msg, flash, flashFromError, clear } = useFlashMessage();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedId, setSelectedId] = useState(selectedFromContext ?? '');
  const [subjects, setSubjects] = useState<PlanSubject[]>([]);
  const [enrollments, setEnrollments] = useState<UserStudyPlan[]>([]);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [original, setOriginal] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyPreview, setHistoryPreview] = useState<{ matched: number; missing: number } | null>(null);
  const enrollment = enrollments.find(x => getId(x.studyPlan) === selectedId);
  const selectedPlan = plans.find(p => p._id === selectedId);

  useEffect(() => {
    let active = true;
    Promise.all([studyPlansApi.getAll(), studyPlansApi.getMine()]).then(([p,e]) => {
      if (!active) return;
      setPlans(p); setEnrollments(e);
      setSelectedId(current => p.some(x => x._id === current) ? current :
        p.some(x => x._id === selectedFromContext) ? selectedFromContext! : p[0]?._id ?? '');
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error cargando planes'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const loadProgress = useCallback(async (planId: string, personalId?: string) => {
    const [items, progress] = await Promise.all([
      studyPlansApi.getSubjects(planId),
      personalId ? studyPlansApi.getProgress(personalId) : Promise.resolve([]),
    ]);
    const current = new Map(progress.map(p => [getId(p.planSubject), p]));
    const next: Record<string, Draft> = {};
    for (const item of items) {
      const saved = current.get(item._id);
      next[item._id] = { status: saved?.status ?? 'PENDIENTE', grade: saved?.grade == null ? '' : String(saved.grade) };
    }
    setSubjects(orderedSubjects(items)); setDraft(next); setOriginal(next);
  }, []);

  useEffect(() => {
    if (!selectedId) { setSubjects([]); return; }
    let active = true;
    setLoading(true); setError(null); setSubjects([]); setHistoryPreview(null);
    // Los valores se asignan solo si la solicitud corresponde al plan actual.
    Promise.all([
      studyPlansApi.getSubjects(selectedId),
      enrollment ? studyPlansApi.getProgress(enrollment._id) : Promise.resolve([]),
    ]).then(([items, progress]) => {
      if (!active) return;
      const current = new Map(progress.map(p => [getId(p.planSubject), p]));
      const next: Record<string, Draft> = {};
      for (const item of items) {
        const p = current.get(item._id);
        next[item._id] = { status: p?.status ?? 'PENDIENTE', grade: p?.grade == null ? '' : String(p.grade) };
      }
      setSubjects(orderedSubjects(items)); setDraft(next); setOriginal(next);
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error cargando materias'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selectedId, enrollment?._id]);

  const update = (id: string, change: Partial<Draft>) => {
    setDraft(p => ({ ...p, [id]: { ...p[id], status: p[id]?.status ?? 'PENDIENTE', grade: p[id]?.grade ?? '', ...change } }));
  };
  const dirty = subjects.filter(s => draft[s._id] && (draft[s._id].status !== original[s._id]?.status || draft[s._id].grade !== original[s._id]?.grade));
  const saveAll = async () => {
    if (!enrollment || working || dirty.length === 0) return;
    setWorking(true);
    let saved = 0;
    try {
      for (const item of dirty) {
        const value = draft[item._id];
        const grade = value.grade.trim() === '' ? null : Number(value.grade);
        if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 10)) throw new Error(`La nota de ${subjectName(item)} debe estar entre 0 y 10`);
        await studyPlansApi.saveProgress(enrollment._id, item._id, { status: value.status, grade });
        saved++;
      }
      await loadProgress(selectedId, enrollment._id);
      flash('success', `Se guardó tu progreso en ${saved} materia(s).`);
    } catch (e) {
      // Si falló una operación intermedia, recargar el estado real desde MongoDB.
      try { await loadProgress(selectedId, enrollment._id); } catch { /* mensaje principal primero */ }
      flashFromError(e, `Se guardaron ${saved} de ${dirty.length} materias`);
    } finally { setWorking(false); }
  };
  const addToMine = async () => {
    if (!selectedId || working) return;
    setWorking(true);
    try {
      const added = await studyPlansApi.enroll(selectedId);
      setEnrollments(p => [...p, added]);
      flash('success', 'Plan agregado a tu progreso académico.');
    } catch (e) { flashFromError(e, 'No se pudo agregar el plan'); }
    finally { setWorking(false); }
  };
  const onHistory = async (files: File[]) => {
    const file = files[0]; if (!file || !enrollment) return;
    setWorking(true); setHistoryPreview(null);
    try {
      const response = await uploadPdf<HistoryResponse>('/progress/parse-history', file);
      const records = Array.isArray(response.subjects) ? response.subjects : [];
      const approved = records.filter(r => String(r.status).toLowerCase() === 'aprobada');
      let matched = 0;
      const changes: Record<string, Draft> = { ...draft };
      for (const row of approved) {
        const byCode = row.code?.trim() && subjects.filter(s => (s.code ?? '').trim().toLowerCase() === row.code!.trim().toLowerCase());
        const candidates = byCode && byCode.length ? byCode : subjects.filter(s => normalize(subjectName(s)) === normalize(row.name ?? ''));
        if (candidates.length === 1) {
          const item = candidates[0];
          changes[item._id] = { status: 'APROBADA', grade: typeof row.nota === 'number' ? String(row.nota) : changes[item._id]?.grade ?? '' };
          matched++;
        }
      }
      setDraft(changes); setHistoryPreview({ matched, missing: approved.length - matched });
      flash('info', `${matched} materias reconocidas. Revisalas y presioná Guardar cambios.`);
    } catch (e) { flashFromError(e, 'Error leyendo historia académica'); }
    finally { setWorking(false); }
  };

  const approved = subjects.filter(s => draft[s._id]?.status === 'APROBADA');
  const creditsTotal = subjects.reduce((a,s) => a + (s.credits ?? 0), 0);
  const creditsApproved = approved.reduce((a,s) => a + (s.credits ?? 0), 0);
  const percentage = creditsTotal ? Math.round(creditsApproved * 100 / creditsTotal) : subjects.length ? Math.round(approved.length * 100 / subjects.length) : 0;
  const byYear = useMemo(() => {
    const map = new Map<number,{ total: number; approved: number }>();
    for (const item of subjects) {
      const year = item.year ?? 0;
      const group = map.get(year) || { total: 0, approved: 0 };
      group.total++;
      if (draft[item._id]?.status === 'APROBADA') group.approved++;
      map.set(year, group);
    }
    return [...map.entries()].sort((a,b) => a[0] - b[0]);
  }, [subjects, draft]);
  return <div>
    <PageHeader title="Mi progreso" sub="Marcá las materias que cursaste y seguí cuánto te falta para recibirte." />
    <MessageBanner message={msg} onClose={clear} />
    <div className="card mb-4"><div className="card-body">
      <Form.Label>Plan de estudios</Form.Label>
      <Form.Select value={selectedId} onChange={e => { setSelectedId(e.target.value); setCareerId(e.target.value); }}>
        {!selectedId && <option value="">Seleccioná un plan...</option>}
        {plans.map(p => <option key={p._id} value={p._id}>{p.name} — {careerName(p)}</option>)}
      </Form.Select>
    </div></div>
    {loading && <div className="text-center py-5"><Spinner animation="border" /> Cargando tu progreso…</div>}
    {error && !loading && <Alert variant="danger">{error}</Alert>}
    {!loading && !error && plans.length === 0 && <Alert variant="info">Todavía no hay planes de estudio disponibles. Podés importar uno desde Cargar plan.</Alert>}
    {!loading && !error && selectedPlan && !enrollment && <Alert variant="info">
      Para registrar tus notas y materias, agregá <strong>{selectedPlan.name}</strong> a tu progreso.
      <div className="mt-2"><Button disabled={working} onClick={() => void addToMine()}>Agregar a mi progreso</Button></div>
    </Alert>}
    {!loading && !error && selectedPlan && <>
      <div className="stat-grid">
        <div className="stat-card"><span className="stat-card__label">materias aprobadas</span><span className="stat-card__value">{fmt.format(approved.length)}</span><span className="stat-card__foot">de {subjects.length} en total</span><div className="stat-card__bar"><span style={{ width: `${subjects.length ? approved.length * 100 / subjects.length : 0}%` }} /></div></div>
        <div className="stat-card"><span className="stat-card__label">créditos</span><span className="stat-card__value">{fmt.format(creditsApproved)}<span className="fs-6 text-muted fw-semibold"> / {fmt.format(creditsTotal)}</span></span><span className="stat-card__foot">aprobados sobre total del plan</span></div>
        <div className="stat-card"><span className="stat-card__label">avance</span><div className="ring-wrap"><Ring value={percentage} color="#198754" /></div></div>
        <div className="stat-card"><span className="stat-card__label">te faltan</span><span className="stat-card__value">{subjects.length - approved.length}</span><span className="stat-card__foot">materias por aprobar</span></div>
      </div>
      {byYear.length > 0 && <div className="card mb-4"><div className="card-header d-flex align-items-center gap-2"><IconBoard size={16} /> Avance por año</div><div className="card-body d-grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
        {byYear.map(([year,v]) => <div key={year}><div className="yr-row mb-1"><span className="yr-row__label">{year === 0 ? 'Sin año' : `Año ${year}`}</span><span className="text-muted small">{v.approved}/{v.total}</span></div><div className="mini-progress"><div className="mini-progress__bar" style={{ width: `${v.total ? v.approved * 100 / v.total : 0}%` }} /></div></div>)}
      </div></div>}
      {enrollment && <div className="card mb-4"><div className="card-header d-flex align-items-center gap-2"><IconCheck size={16} /> Importar historia académica (PDF)</div><div className="card-body">
        <PdfDropzone onFiles={onHistory} multiple={false} text="Arrastrá tu historia académica acá" hint="Se reconocerán las materias aprobadas; revisalas antes de guardar" />
        {historyPreview && <Alert variant="info" className="mt-3">{historyPreview.matched} aprobadas reconocidas; {historyPreview.missing} sin coincidencia. Los cambios aún no se guardaron.</Alert>}
      </div></div>}
      <div className="card mb-4"><div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap"><span className="d-flex align-items-center gap-2"><IconCoins size={16} /> Estado por materia</span>{enrollment && <Button size="sm" disabled={working || dirty.length === 0} onClick={() => void saveAll()}>{working ? 'Guardando…' : `Guardar cambios (${dirty.length})`}</Button>}</div>
        <div className="card-body"><Table size="sm" responsive striped hover><thead><tr><th>Materia</th><th>Año</th><th>Estado</th><th>Nota</th><th>Créditos</th></tr></thead><tbody>
          {subjects.map(s => <tr key={s._id}><td><strong>{subjectName(s)}</strong><div className="text-muted small">{s.code || 'Sin código'}</div></td><td>{s.year ?? '—'}{s.period != null ? ` · ${s.period}º` : ''}</td>
            <td><Form.Select size="sm" disabled={!enrollment || working} value={draft[s._id]?.status ?? 'PENDIENTE'} onChange={e => update(s._id, { status: e.target.value as ProgressStatus })}>{(Object.keys(STATUS) as ProgressStatus[]).map(k => <option key={k} value={k}>{STATUS[k]}</option>)}</Form.Select></td>
            <td><Form.Control size="sm" type="number" min={0} max={10} style={{ width: 86 }} disabled={!enrollment || working} value={draft[s._id]?.grade ?? ''} onChange={e => update(s._id, { grade: e.target.value })} /></td><td>{s.credits ?? 0}</td></tr>)}
        </tbody></Table>
        {!subjects.length && <p className="text-muted">Este plan todavía no tiene materias.</p>}
        {enrollment && dirty.length > 0 && <Button disabled={working} onClick={() => void saveAll()}>{working ? 'Guardando…' : `Guardar cambios (${dirty.length})`}</Button>}
      </div></div>
    </>}
  </div>;
}
