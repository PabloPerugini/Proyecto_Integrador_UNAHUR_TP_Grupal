import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { studyPlansApi, orderedSubjects, subjectName, prerequisiteId, type StudyPlan, type PlanSubject, type ProgressStatus, type UserStudyPlan } from '../api/studyPlans';
import { uploadPdf } from '../api/client';
import { useCareerSelection } from '../context/CareerContext';
import { useFlashMessage } from '../hooks/useFlashMessage';
import PageHeader from '../components/PageHeader';
import MessageBanner from '../components/MessageBanner';
import PdfDropzone from '../components/PdfDropzone';
import { instituteColor, instituteGradientTec } from '../utils/instituteColors';
import { matchHistorySubject } from '../utils/progressHistoryMatch';

// La tabla solo permite elegir estados registrables; DISPONIBLE/BLOQUEADA son
// estados derivados que calcula el plan (no se guardan).
type SelectableStatus = Extract<ProgressStatus, 'PENDIENTE' | 'CURSANDO' | 'REGULARIZADA' | 'APROBADA'>;
type SubjectFilter = 'TODAS' | 'PENDIENTE' | 'CURSANDO' | 'APROBADA';
const STATUS: Record<SelectableStatus, string> = {
  CURSANDO: 'Cursando', APROBADA: 'Aprobada', REGULARIZADA: 'Regularizada', PENDIENTE: 'Pendiente',
};
interface Draft { status: ProgressStatus; grade: string }
interface HistorySubject { code?: string; name?: string; status?: string; nota?: number | null }
interface HistoryResponse { subjects: HistorySubject[]; detectedCount?: number }
const fmt = new Intl.NumberFormat('es-AR');
function getId(value: string | { _id: string } | null | undefined): string | null {
  return !value ? null : typeof value === 'string' ? value : value._id;
}

function ProgressStatusSelect({ value, disabled, label, onChange }: { value: SelectableStatus; disabled: boolean; label: string; onChange: (value: SelectableStatus) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="progress-status-select" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <button type="button" className={`progress-status progress-status-select__trigger progress-status--${value.toLowerCase()}`} aria-label={label} aria-haspopup="listbox" aria-expanded={open} disabled={disabled} onClick={() => setOpen(current => !current)}>
      <span>{STATUS[value]}</span><svg className={`progress-status-select__chevron${open ? ' progress-status-select__chevron--open' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <div className="progress-status-select__menu" role="listbox" aria-label={label}>
      {(Object.keys(STATUS) as SelectableStatus[]).filter(status => status !== value).map(status => <button key={status} type="button" role="option" className="progress-status-select__option" onMouseDown={event => event.preventDefault()} onClick={() => { onChange(status); setOpen(false); }}>{STATUS[status]}</button>)}
    </div>}
  </div>;
}

export default function MyProgress() {
  const { careerId: selectedFromContext, setCareerId } = useCareerSelection(); // ahora representa StudyPlan
  const { msg, flash, flashFromError, clear } = useFlashMessage();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const selectedId = selectedFromContext ?? '';
  const [subjects, setSubjects] = useState<PlanSubject[]>([]);
  const [enrollments, setEnrollments] = useState<UserStudyPlan[]>([]);
  const [draft, setDraft] = useState<Record<string, Draft>>({});
  const [original, setOriginal] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyPreview, setHistoryPreview] = useState<{ matched: number; missing: number } | null>(null);
  const [tab, setTab] = useState<'lic' | 'tec'>('lic');
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('TODAS');
  const [filterOpen, setFilterOpen] = useState(false);
  const [collapsedYears, setCollapsedYears] = useState<Set<string> | null>(null);
  const enrollment = enrollments.find(x => getId(x.studyPlan) === selectedId);
  const selectedPlan = plans.find(p => p._id === selectedId);

  useEffect(() => {
    let active = true;
    Promise.all([studyPlansApi.getAll(), studyPlansApi.getMine()]).then(([p,e]) => {
      if (!active) return;
      setPlans(p); setEnrollments(e);
      const next = p.some(x => x._id === selectedFromContext) ? selectedFromContext! : p[0]?._id ?? '';
      if (next && next !== selectedFromContext) setCareerId(next);
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
  const filteredSubjects = visibleSubjects.filter((subject) => {
    const matchesSearch = `${subjectName(subject)} ${subject.code ?? ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
    const matchesStatus = subjectFilter === 'TODAS' || (draft[subject._id]?.status ?? 'PENDIENTE') === subjectFilter;
    return matchesSearch && matchesStatus;
  });
  const groupedYears = new Map<string, { label: string; subjects: PlanSubject[] }>();
  for (const subject of visibleSubjects) {
    const key = subject.year == null ? 'year-none' : `year-${subject.year}`;
    const label = subject.year == null ? 'Sin año' : `${subject.year}.º año`;
    const group = groupedYears.get(key) ?? { label, subjects: [] };
    group.subjects.push(subject);
    groupedYears.set(key, group);
  }
  const sortedYearGroups = [...groupedYears.entries()].sort(([keyA], [keyB]) => {
    if (keyA === 'year-none') return 1;
    if (keyB === 'year-none') return -1;
    return Number(keyA.slice(5)) - Number(keyB.slice(5));
  }).map(([key, group]) => ({ key, ...group }));
  const visibleIds = new Set(filteredSubjects.map(subject => subject._id));
  const yearGroups = sortedYearGroups.map(group => ({ ...group, subjects: group.subjects.filter(subject => visibleIds.has(subject._id)) })).filter(group => group.subjects.length > 0);
  const firstYearKey = sortedYearGroups.find(group => group.subjects.some(subject => visibleIds.has(subject._id)))?.key;
  const isYearCollapsed = (key: string) => collapsedYears ? collapsedYears.has(key) : key !== firstYearKey;
  const toggleYear = (key: string) => setCollapsedYears(current => {
    const next = new Set(current ?? sortedYearGroups.filter(group => group.key !== firstYearKey).map(group => group.key));
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });

  useEffect(() => { setCollapsedYears(null); }, [selectedId, tab, subjects]);
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
  return <div className="progress-page">
    <PageHeader title="Mi progreso" />
    <MessageBanner message={msg} onClose={clear} />
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
      {enrollment && <div className="card mb-4 progress-import"><div className="card-body">
        <PdfDropzone onFiles={onHistory} multiple={false} text="Arrastrá tu historia académica acá" hint="o hacé clic para elegir el PDF de tu historia académica" />
        {historyPreview && <Alert variant="info" className="mt-3">{historyPreview.matched} aprobadas reconocidas; {historyPreview.missing} sin coincidencia. Los cambios aún no se guardaron.</Alert>}
      </div></div>}
      <div className="card mb-4 subject-editor">
        <div className="card-header subject-editor__header">
          <div className="subject-editor__topline">
            <div className="subject-editor__title-group">
              <h2 className="subject-editor__title">Mis materias</h2>
              {selectedPlan?.intermediateTitle && <div className="subject-editor__tabs" role="tablist" aria-label="Título del plan">
                <Button size="sm" role="tab" aria-selected={tab === 'lic'} variant={tab === 'lic' ? 'primary' : 'outline-primary'} onClick={() => setTab('lic')}>Licenciatura</Button>
                <Button size="sm" role="tab" aria-selected={tab === 'tec'} variant={tab === 'tec' ? 'primary' : 'outline-primary'} style={tab === 'tec' ? { background: instituteGradientTec(baseColor), borderColor: 'transparent' } : undefined} onClick={() => setTab('tec')}>Tecnicatura</Button>
              </div>}
            </div>
            {enrollment && <div className="subject-editor__actions">
              <Button size="sm" variant="outline-secondary" onClick={() => exportCsv()}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>Exportar CSV</Button>
              <Button size="sm" className="subject-editor__save" disabled={working || dirty.length === 0} onClick={() => void saveAll()}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 3h12l3 3v15H4V3h1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 3v6h8V3M8 21v-8h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>{working ? 'Guardando…' : `Guardar cambios${dirty.length ? ` (${dirty.length})` : ''}`}</Button>
            </div>}
          </div>
          <div className="subject-editor__filters">
            <div className="subject-editor__search"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg><Form.Control aria-label="Buscar materia" placeholder="Buscar materia..." value={search} onChange={event => setSearch(event.target.value)} /></div>
            <div className="subject-editor__filter-select" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFilterOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') setFilterOpen(false); }}>
              <button type="button" className="subject-editor__filter-trigger" aria-label="Filtrar materias por estado" aria-haspopup="listbox" aria-expanded={filterOpen} onClick={() => setFilterOpen(value => !value)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16l-6.3 7.2v5.1l-3.4 1.8v-6.9L4 5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span>{subjectFilter === 'TODAS' ? 'Todas' : STATUS[subjectFilter]}</span>
                <svg className={`subject-editor__filter-chevron${filterOpen ? ' subject-editor__filter-chevron--open' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              {filterOpen && <div className="subject-editor__filter-menu" role="listbox" aria-label="Estados de materias">
                {(['TODAS', 'PENDIENTE', 'CURSANDO', 'APROBADA', 'REGULARIZADA'] as SubjectFilter[]).map(filter => <button key={filter} type="button" role="option" aria-selected={subjectFilter === filter} className={`subject-editor__filter-option${subjectFilter === filter ? ' subject-editor__filter-option--selected' : ''}`} onMouseDown={event => event.preventDefault()} onClick={() => { setSubjectFilter(filter); setFilterOpen(false); }}>{filter === 'TODAS' ? 'Todas' : STATUS[filter]}</button>)}
              </div>}
            </div>
          </div>
        </div>
        <div className="card-body">{tab === 'tec' && <p className="small text-muted">Vista de tecnicatura{selectedPlan?.intermediateTitle ? `: ${selectedPlan.intermediateTitle}` : ''}: lo que cargues acá cuenta para ambas titulaciones.</p>}
        <div className="d-none d-md-block progress-year-list">
          {yearGroups.map(group => <section className="progress-year-panel" key={group.key}>
            <button type="button" className="progress-year-toggle progress-year-panel__toggle" aria-expanded={!isYearCollapsed(group.key)} onClick={() => toggleYear(group.key)}><span className="progress-year-heading"><span>{group.label}</span><span className="progress-year-count">{group.subjects.length} {group.subjects.length === 1 ? 'materia' : 'materias'}</span></span><span className="progress-year-column-label">Estado</span><span className="progress-year-column-label">Nota (opcional)</span><svg className={`progress-year-toggle__chevron${!isYearCollapsed(group.key) ? ' progress-year-toggle__chevron--expanded' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            {!isYearCollapsed(group.key) && <div className="progress-year-panel__subjects">{group.subjects.map(s => <div className="progress-subject-line" key={s._id}>
              <div className="progress-subject-line__name"><strong>{subjectName(s)}</strong></div>
              <ProgressStatusSelect label={`Estado de ${subjectName(s)}`} disabled={!enrollment || working} value={(draft[s._id]?.status ?? 'PENDIENTE') as SelectableStatus} onChange={status => update(s._id, { status })} />
              <Form.Control size="sm" type="number" min={0} max={10} placeholder="—" aria-label={`Nota de ${subjectName(s)}`} disabled={!enrollment || working} value={draft[s._id]?.grade ?? ''} onChange={e => update(s._id, { grade: e.target.value })} />
            </div>)}</div>}
          </section>)}
        </div>
        <div className="subject-editor__cards d-md-none">
          {yearGroups.map(group => <section className="progress-year-section" key={group.key}>
            <button type="button" className="progress-year-toggle progress-year-card-toggle" aria-expanded={!isYearCollapsed(group.key)} onClick={() => toggleYear(group.key)}><span>{group.label}</span><span className="progress-year-count">{group.subjects.length} {group.subjects.length === 1 ? 'materia' : 'materias'}</span><svg className={`progress-year-toggle__chevron${!isYearCollapsed(group.key) ? ' progress-year-toggle__chevron--expanded' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            {!isYearCollapsed(group.key) && group.subjects.map(s => <article className="subject-editor__subject" key={s._id} aria-labelledby={`subject-title-${s._id}`}>
              <h3 id={`subject-title-${s._id}`} className="subject-editor__name">{subjectName(s)}</h3>
              <p className="subject-editor__meta">
                {s.year == null ? 'Sin año' : `Año ${s.year}.º`}{s.period != null ? ` · ${s.period}.º` : ''}
                {(s.credits ?? 0) > 0 && <> · {s.credits} créditos</>}
              </p>
              <div className="subject-editor__fields">
                <Form.Group controlId={`subject-status-${s._id}`}>
                  <Form.Label>Estado</Form.Label>
                  <ProgressStatusSelect label={`Estado de ${subjectName(s)}`} disabled={!enrollment || working} value={(draft[s._id]?.status ?? 'PENDIENTE') as SelectableStatus} onChange={status => update(s._id, { status })} />

                </Form.Group>
                <Form.Group controlId={`subject-grade-${s._id}`}>
                  <Form.Label>Nota</Form.Label>
                  <Form.Control size="sm" type="number" min={0} max={10} placeholder="—" disabled={!enrollment || working} value={draft[s._id]?.grade ?? ''} onChange={e => update(s._id, { grade: e.target.value })} />
                </Form.Group>
              </div>
            </article>)}
          </section>)}
        </div>
        {!filteredSubjects.length && <p className="text-muted">{search || subjectFilter !== 'TODAS' ? 'No hay materias que coincidan con la búsqueda y el filtro.' : tab === 'tec' && subjects.length > 0 ? 'La tecnicatura todavía no tiene materias marcadas.' : 'Este plan todavía no tiene materias.'}</p>}
        {enrollment && dirty.length > 0 && <div className="subject-editor__footer-actions"><Button disabled={working} onClick={() => void saveAll()}>{working ? 'Guardando…' : `Guardar cambios (${dirty.length})`}</Button></div>}
      </div></div>
    </>}
  </div>;
}
