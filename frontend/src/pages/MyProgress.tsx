import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Spinner, Table } from 'react-bootstrap';
import { studyPlansApi, orderedSubjects, subjectName, careerName, prerequisiteId, type StudyPlan, type PlanSubject, type ProgressStatus, type UserStudyPlan } from '../api/studyPlans';
import { uploadPdf } from '../api/client';
import { useCareerSelection } from '../context/CareerContext';
import { useFlashMessage } from '../hooks/useFlashMessage';
import PageHeader from '../components/PageHeader';
import MessageBanner from '../components/MessageBanner';
import PdfDropzone from '../components/PdfDropzone';
import { IconCheck, IconCoins } from '../components/icons';
import { instituteColor, instituteGradientTec } from '../utils/instituteColors';
import { matchHistorySubject } from '../utils/progressHistoryMatch';

// La tabla solo permite elegir estados registrables; DISPONIBLE/BLOQUEADA son
// estados derivados que calcula el plan (no se guardan).
type SelectableStatus = Extract<ProgressStatus, 'PENDIENTE' | 'CURSANDO' | 'REGULARIZADA' | 'APROBADA'>;
const STATUS: Record<SelectableStatus, string> = {
  PENDIENTE: 'Pendiente', CURSANDO: 'Cursando', REGULARIZADA: 'Regularizada', APROBADA: 'Aprobada',
};
interface Draft { status: ProgressStatus; grade: string }
interface HistorySubject { code?: string; name?: string; status?: string; nota?: number | null }
interface HistoryResponse { subjects: HistorySubject[]; detectedCount?: number }
const fmt = new Intl.NumberFormat('es-AR');
function getId(value: string | { _id: string } | null | undefined): string | null {
  return !value ? null : typeof value === 'string' ? value : value._id;
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
  const [tab, setTab] = useState<'lic' | 'tec'>('lic');
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
  }, [selectedFromContext]);

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
  }, [selectedId, enrollment]);

  const update = (id: string, change: Partial<Draft>) => {
    setDraft(p => ({ ...p, [id]: { ...p[id], status: p[id]?.status ?? 'PENDIENTE', grade: p[id]?.grade ?? '', ...change } }));
  };
  const dirty = subjects.filter(s => draft[s._id] && (draft[s._id].status !== original[s._id]?.status || draft[s._id].grade !== original[s._id]?.grade));
  const saveAll = async () => {
    if (!enrollment || working || dirty.length === 0) return;
    // Pre-chequeo local de correlativas (el back revalida y es la fuente).
    const byId = new Map(subjects.map(s => [s._id, s]));
    const blocked: string[] = [];
    for (const item of dirty) {
      const value = draft[item._id];
      if (!value || value.status === 'PENDIENTE') continue;
      for (const p of item.prerequisites ?? []) {
        const refId = prerequisiteId(p);
        const ref = refId ? byId.get(refId) : undefined;
        const state = ref ? draft[ref._id]?.status ?? 'PENDIENTE' : 'PENDIENTE';
        const ok = p.requiredStatus === 'APROBADA'
          ? state === 'APROBADA'
          : state === 'REGULARIZADA' || state === 'APROBADA';
        if (!ok && ref) blocked.push(`${subjectName(item)} ← ${subjectName(ref)}`);
      }
    }
    if (blocked.length > 0) {
      flash('danger', `Faltan correlativas: ${[...new Set(blocked)].slice(0, 5).join('; ')}${blocked.length > 5 ? '…' : ''}`);
      return;
    }
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
        const item = matchHistorySubject(row, subjects, subjectName);
        if (item) {
          changes[item._id] = { status: 'APROBADA', grade: typeof row.nota === 'number' ? String(row.nota) : changes[item._id]?.grade ?? '' };
          matched++;
        }
      }
      setDraft(changes); setHistoryPreview({ matched, missing: approved.length - matched });
      flash('info', `${matched} materias reconocidas. Revisalas y presioná Guardar cambios.`);
    } catch (e) { flashFromError(e, 'Error leyendo historia académica'); }
    finally { setWorking(false); }
  };

  const exportCsv = () => {
    const rows = [
      ['codigo', 'materia', 'año', 'estado', 'nota', 'creditos'],
      ...subjects.map((s) => [
        s.code ?? '',
        subjectName(s),
        s.year ?? '',
        draft[s._id]?.status ?? 'PENDIENTE',
        draft[s._id]?.grade ?? '',
        s.credits ?? 0,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `progreso-${selectedPlan?.name ?? 'plan'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const approved = subjects.filter(s => draft[s._id]?.status === 'APROBADA');
  const baseColor = (() => {
    const c = selectedPlan?.career;
    if (c && typeof c === 'object') {
      if (c.color) return c.color;
      const u = c.academicUnit;
      if (u && typeof u === 'object' && u.name)
        return instituteColor(u.name, u.color);
    }
    return '#238a42';
  })();
  // Pestaña tecnicatura: mismo progreso, vista filtrada (cuenta para ambas).
  const visibleSubjects = tab === 'tec' ? subjects.filter(s => s.intermediate) : subjects;
  const grades = approved
    .filter(s => (draft[s._id]?.grade ?? '').trim() !== '')
    .map(s => Number(draft[s._id]?.grade))
    .filter(n => Number.isFinite(n));
  const average = grades.length
    ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 100) / 100
    : null;
  const creditsTotal = subjects.reduce((a,s) => a + (s.credits ?? 0), 0);
  const creditsApproved = approved.reduce((a,s) => a + (s.credits ?? 0), 0);
  const percentage = subjects.length ? Math.round(approved.length * 100 / subjects.length) : 0;
  return <div>
    <PageHeader title="Mi progreso" sub="Marcá las materias que cursaste y seguí cuánto te falta para recibirte." />
    <MessageBanner message={msg} onClose={clear} />
    {!loading && !error && selectedPlan && <div className="progress-controls">
      <div className="card progress-plan-select"><div className="card-body">
        <Form.Label htmlFor="progress-plan">Plan de estudios</Form.Label>
        <div className="progress-plan-select__field">
          <span className="progress-plan-select__measure" aria-hidden="true">{selectedPlan.name} — {careerName(selectedPlan)}</span>
        <Form.Select id="progress-plan" value={selectedId} onChange={e => { setSelectedId(e.target.value); setCareerId(e.target.value); setTab('lic'); }}>
          {!selectedId && <option value="">Seleccioná un plan...</option>}
          {plans.filter((p) => p._id === selectedId || enrollments.some((e) => getId(e.studyPlan) === p._id)).map(p => <option key={p._id} value={p._id}>{p.name} — {careerName(p)}</option>)}
        </Form.Select>
        </div>
      </div></div>
    </div>}
    {loading && <div className="text-center py-5"><Spinner animation="border" /> Cargando tu progreso…</div>}
    {error && !loading && <Alert variant="danger">{error}</Alert>}
    {!loading && !error && plans.length === 0 && <Alert variant="info">Todavía no hay planes de estudio disponibles. Podés importar uno desde Cargar plan.</Alert>}
    {!loading && !error && selectedPlan && !enrollment && <Alert variant="info">
      Para registrar tus notas y materias, agregá <strong>{selectedPlan.name}</strong> a tu progreso.
      <div className="mt-2"><Button disabled={working} onClick={() => void addToMine()}>Agregar a mi progreso</Button></div>
    </Alert>}
    {!loading && !error && selectedPlan && <>
      <div className="stat-grid progress-overview">
        <div className="stat-card progress-overview__summary">
          <div className="progress-overview__topline">
            <div className="progress-overview__heading">
              <strong className="stat-card__value">{percentage}%</strong>
              <span className="stat-card__foot">{fmt.format(approved.length)} de {fmt.format(subjects.length)} <span className="progress-overview__subject-word">materias</span><br className="progress-overview__mobile-break" /> aprobadas</span>
            </div>
            <div className="progress-overview__metrics">
              <div className="progress-overview__average progress-overview__credits" aria-label={`${creditsApproved} de ${creditsTotal} créditos aprobados`}>
                <span className="stat-card__foot">Créditos<span className="progress-overview__credits-suffix"> aprobados</span></span>
                <strong>{fmt.format(creditsApproved)}<span className="progress-overview__total"> / {fmt.format(creditsTotal)}</span></strong>
              </div>
              <div className="progress-overview__average" aria-label={`Promedio: ${average === null ? 'sin notas' : average.toFixed(2)}`}>
                <span className="stat-card__foot">Promedio</span>
                <strong>{average === null ? '—' : average.toFixed(2)}</strong>
              </div>
            </div>
          </div>
          <div className="progress-overview__bar" role="progressbar" aria-label="Progreso de materias aprobadas" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
            <span style={{ width: `${percentage}%` }} />
          </div>
        </div>

      </div>
      {enrollment && <div className="card mb-4"><div className="card-header d-flex align-items-center gap-2"><IconCheck size={16} /> Importar historia académica (PDF)</div><div className="card-body">
        <PdfDropzone onFiles={onHistory} multiple={false} text="Arrastrá tu historia académica acá" hint="Se reconocerán las materias aprobadas; revisalas antes de guardar" />
        {historyPreview && <Alert variant="info" className="mt-3">{historyPreview.matched} aprobadas reconocidas; {historyPreview.missing} sin coincidencia. Los cambios aún no se guardaron.</Alert>}
      </div></div>}
      <div className="card mb-4 subject-editor">
        <div className="card-header d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <span className="d-flex align-items-center gap-2"><IconCoins size={16} /> Estado por materia</span>
          {selectedPlan?.intermediateTitle && <div className="d-flex flex-wrap gap-2">
            <Button size="sm" variant={tab === 'lic' ? 'primary' : 'outline-primary'} onClick={() => setTab('lic')}>Licenciatura</Button>
            <Button size="sm" variant={tab === 'tec' ? 'primary' : 'outline-primary'} style={tab === 'tec' ? { background: instituteGradientTec(baseColor), borderColor: 'transparent' } : undefined} onClick={() => setTab('tec')}>Tecnicatura</Button>
          </div>}
          {enrollment && <div className="subject-editor__actions">
            <Button size="sm" variant="outline-secondary" onClick={() => exportCsv()}>Exportar CSV</Button>
            <Button size="sm" disabled={working || dirty.length === 0} onClick={() => void saveAll()}>{working ? 'Guardando…' : `Guardar cambios (${dirty.length})`}</Button>
          </div>}
        </div>
        <div className="card-body">{tab === 'tec' && <p className="small text-muted">Vista de tecnicatura{selectedPlan?.intermediateTitle ? `: ${selectedPlan.intermediateTitle}` : ''}: lo que cargues acá cuenta para ambas titulaciones.</p>}
        <div className="d-none d-md-block"><Table size="sm" responsive striped hover><thead><tr><th>Materia</th><th>Año</th><th>Estado</th><th>Nota</th><th>Créditos</th></tr></thead><tbody>
          {visibleSubjects.map(s => <tr key={s._id}><td><strong>{subjectName(s)}</strong><div className="text-muted small">{s.code || 'Sin código'}</div></td><td>{s.year ?? '—'}{s.period != null ? ` · ${s.period}º` : ''}</td>
            <td><Form.Select size="sm" disabled={!enrollment || working} value={draft[s._id]?.status ?? 'PENDIENTE'} onChange={e => update(s._id, { status: e.target.value as ProgressStatus })}>{(Object.keys(STATUS) as SelectableStatus[]).map(k => <option key={k} value={k}>{STATUS[k]}</option>)}</Form.Select></td>
            <td><Form.Control size="sm" type="number" min={0} max={10} style={{ width: 86 }} disabled={!enrollment || working} value={draft[s._id]?.grade ?? ''} onChange={e => update(s._id, { grade: e.target.value })} /></td><td>{s.credits ?? 0}</td></tr>)}
        </tbody></Table></div>
        <div className="subject-editor__cards d-md-none">
          {visibleSubjects.map(s => (
            <article className="subject-editor__subject" key={s._id} aria-labelledby={`subject-title-${s._id}`}>
              <h3 id={`subject-title-${s._id}`} className="subject-editor__name">{subjectName(s)}</h3>
              <p className="subject-editor__meta">
                {s.code || 'Sin código'} · {s.year == null ? 'Sin año' : `Año ${s.year}.º`}{s.period != null ? ` · ${s.period}.º` : ''}
                {(s.credits ?? 0) > 0 && <> · {s.credits} créditos</>}
              </p>
              <div className="subject-editor__fields">
                <Form.Group controlId={`subject-status-${s._id}`}>
                  <Form.Label>Estado</Form.Label>
                  <Form.Select size="sm" disabled={!enrollment || working} value={draft[s._id]?.status ?? 'PENDIENTE'} onChange={e => update(s._id, { status: e.target.value as ProgressStatus })}>
                    {(Object.keys(STATUS) as SelectableStatus[]).map(k => <option key={k} value={k}>{STATUS[k]}</option>)}
                  </Form.Select>

                </Form.Group>
                <Form.Group controlId={`subject-grade-${s._id}`}>
                  <Form.Label>Nota</Form.Label>
                  <Form.Control size="sm" type="number" min={0} max={10} placeholder="—" disabled={!enrollment || working} value={draft[s._id]?.grade ?? ''} onChange={e => update(s._id, { grade: e.target.value })} />
                </Form.Group>
              </div>
            </article>
          ))}
        </div>
        {!visibleSubjects.length && <p className="text-muted">{tab === 'tec' && subjects.length > 0 ? 'La tecnicatura todavía no tiene materias marcadas.' : 'Este plan todavía no tiene materias.'}</p>}
        {enrollment && dirty.length > 0 && <Button disabled={working} onClick={() => void saveAll()}>{working ? 'Guardando…' : `Guardar cambios (${dirty.length})`}</Button>}
      </div></div>
    </>}
  </div>;
}
