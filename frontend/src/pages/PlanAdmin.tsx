import { useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { studyPlansApi, orderedSubjects, subjectName, careerName, prerequisiteId, type StudyPlan, type PlanSubject, type PlanPrerequisite, type CorrParseResult } from '../api/studyPlans';
import { useFlashMessage } from '../hooks/useFlashMessage';
import PageHeader from '../components/PageHeader';
import MessageBanner from '../components/MessageBanner';

interface SubjectForm {
  code: string; year: string; period: string; credits: string; optional: boolean; intermediate: boolean;
  prerequisites: PlanPrerequisite[];
}
function fromSubject(s: PlanSubject): SubjectForm {
  return { code: s.code ?? '', year: s.year == null ? '' : String(s.year), period: s.period == null ? '' : String(s.period), credits: String(s.credits ?? 0), optional: Boolean(s.optional), intermediate: Boolean(s.intermediate),
    prerequisites: (s.prerequisites ?? []).map(p => ({ planSubject: prerequisiteId(p) ?? '', requiredStatus: p.requiredStatus })).filter(p => Boolean(p.planSubject)) };
}
function validNum(value: string, label: string, min: number, max: number): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} debe estar entre ${min} y ${max}`);
  return n;
}
export default function PlanAdmin() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { msg, flash, flashFromError, clear } = useFlashMessage();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selected, setSelected] = useState(id ?? '');
  const [subjects, setSubjects] = useState<PlanSubject[]>([]);
  const [draft, setDraft] = useState<Record<string, SubjectForm>>({});
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'draft'|'published'>('draft');
  const [intermediateTitle, setIntermediateTitle] = useState('');
  const [creditsIntermediate, setCreditsIntermediate] = useState('');
  const [corrResult, setCorrResult] = useState<CorrParseResult | null>(null);
  const [bulkYear, setBulkYear] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = plans.find(p => p._id === selected);
  const intermediateCount = subjects.filter(s => s.intermediate).length;
  const bulkYears = Array.from(new Set(subjects.map(s => s.year).filter((y): y is number => typeof y === 'number'))).sort((a, b) => a - b);

  const loadPlans = async () => {
    const list = await studyPlansApi.getAll();
    setPlans(list);
    setSelected(current => list.some(p => p._id === current) ? current : list[0]?._id ?? '');
  };
  useEffect(() => { let active = true;
    studyPlansApi.getAll().then(list => { if (!active) return; setPlans(list); setSelected(cur => list.some(p => p._id === cur) ? cur : list[0]?._id ?? ''); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error cargando planes'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (id) setSelected(id);
  }, [id]);
  useEffect(() => {
    if (!selected) { setSubjects([]); return; }
    let active = true;
    setLoading(true); setError(null);
    studyPlansApi.getSubjects(selected).then(list => {
      if (!active) return;
      setSubjects(orderedSubjects(list));
      setDraft(Object.fromEntries(list.map(s => [s._id, fromSubject(s)])));
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Error cargando materias'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected]);
  useEffect(() => { setName(plan?.name ?? ''); setStatus(plan?.status ?? 'draft'); setIntermediateTitle(plan?.intermediateTitle ?? ''); setCreditsIntermediate(plan?.creditsIntermediate ? String(plan.creditsIntermediate) : ''); }, [plan?._id, plan?.name, plan?.status, plan?.intermediateTitle, plan?.creditsIntermediate]);

  const selectPlan = (next: string) => { setSelected(next); navigate(`/admin/${next}`); };
  const modify = (subjectId: string, change: Partial<SubjectForm>) => setDraft(current => ({ ...current, [subjectId]: { ...current[subjectId], ...change } }));
  const savePlan = async () => {
    if (!plan || !name.trim() || working) return;
    setWorking(true);
    try {
      await studyPlansApi.update(plan._id, {
        name: name.trim(),
        status,
        intermediateTitle: intermediateTitle.trim() || null,
        creditsIntermediate: intermediateTitle.trim() ? (validNum(creditsIntermediate || '0', 'Créditos tecnicatura', 0, 10000) ?? 0) : 0,
      });
      await loadPlans();
      flash('success', 'Datos del plan guardados.');
    } catch (e) { flashFromError(e, 'No se pudo guardar el plan'); }
    finally { setWorking(false); }
  };
  const saveSubject = async (subject: PlanSubject) => {
    const edit = draft[subject._id]; if (!edit || working || !plan) return;
    setWorking(true);
    try {
      await studyPlansApi.updateSubject(plan._id, subject._id, {
        code: edit.code.trim(), year: validNum(edit.year, 'Año', 1, 20), period: validNum(edit.period, 'Período', 1, 12),
        credits: validNum(edit.credits, 'Créditos', 0, 1000) ?? 0, optional: edit.optional, intermediate: edit.intermediate,
        prerequisites: edit.prerequisites.map(p => ({ planSubject: prerequisiteId(p) || '', requiredStatus: p.requiredStatus })),
      });
      const list = await studyPlansApi.getSubjects(plan._id);
      setSubjects(orderedSubjects(list)); setDraft(Object.fromEntries(list.map(s => [s._id, fromSubject(s)])));
      flash('success', `Materia ${subjectName(subject)} actualizada.`);
    } catch (e) { flashFromError(e, 'No se pudo actualizar la materia'); }
    finally { setWorking(false); }
  };
  const removeSubject = async (subject: PlanSubject) => {
    if (!plan || working || !window.confirm(`¿Quitar ${subjectName(subject)} del plan?`)) return;
    setWorking(true);
    try {
      await studyPlansApi.deleteSubject(plan._id, subject._id);
      const list = await studyPlansApi.getSubjects(plan._id);
      setSubjects(orderedSubjects(list)); setDraft(Object.fromEntries(list.map(s => [s._id, fromSubject(s)])));
      flash('success', 'Materia eliminada.');
    } catch(e) { flashFromError(e, 'No se pudo eliminar la materia. Puede tener correlativas o progreso asociado.'); }
    finally { setWorking(false); }
  };
  const togglePrerequisite = (subjectId: string, prerequisiteIdValue: string, enabled: boolean) => {
    const list = draft[subjectId]?.prerequisites ?? [];
    modify(subjectId, { prerequisites: enabled ? [...list, { planSubject: prerequisiteIdValue, requiredStatus: 'REGULARIZADA' }] : list.filter(p => prerequisiteId(p) !== prerequisiteIdValue) });
  };
  const updateRequirement = (subjectId: string, prerequisiteIdValue: string, requiredStatus: 'REGULARIZADA'|'APROBADA') => {
    modify(subjectId, { prerequisites: (draft[subjectId]?.prerequisites ?? []).map(p => prerequisiteId(p) === prerequisiteIdValue ? { ...p, requiredStatus } : p) });
  };
  const reloadSubjects = async (planId: string) => {
    const list = await studyPlansApi.getSubjects(planId);
    setSubjects(orderedSubjects(list)); setDraft(Object.fromEntries(list.map(s => [s._id, fromSubject(s)])));
  };
  const applyBulkIntermediate = async (intermediate: boolean) => {
    if (!plan || working) return;
    setWorking(true);
    try {
      const result = await studyPlansApi.bulkIntermediate(plan._id, {
        intermediate,
        ...(bulkYear ? { year: Number(bulkYear) } : {}),
      });
      await reloadSubjects(plan._id);
      flash('success', `${intermediate ? 'Marcadas' : 'Desmarcadas'} ${result.modified} materia(s)${bulkYear ? ` de ${bulkYear}º año` : ''}.`);
    } catch (e) { flashFromError(e, 'No se pudo actualizar la tecnicatura'); }
    finally { setWorking(false); }
  };
  const setAllRequiredStatus = async (requiredStatus: 'REGULARIZADA' | 'APROBADA') => {
    if (!plan || working) return;
    const targets = subjects.filter(s => (s.prerequisites ?? []).length > 0);
    if (!targets.length) { flash('danger', 'El plan no tiene correlativas cargadas.'); return; }
    const label = requiredStatus === 'APROBADA' ? 'deben estar aprobadas' : 'alcanza regularizada';
    if (!window.confirm(`¿Marcar las correlativas de ${targets.length} materia(s) como «${label}»?`)) return;
    setWorking(true);
    let saved = 0;
    try {
      for (const subject of targets) {
        const edit = draft[subject._id];
        if (!edit) continue;
        await studyPlansApi.updateSubject(plan._id, subject._id, {
          prerequisites: edit.prerequisites.map(p => ({ planSubject: prerequisiteId(p) || '', requiredStatus })),
        });
        saved += 1;
      }
      await reloadSubjects(plan._id);
      flash('success', `Correlativas de ${saved} materia(s) marcadas como «${label}».`);
    } catch (e) {
      await reloadSubjects(plan._id).catch(() => undefined);
      flashFromError(e, `Se actualizaron ${saved} materia(s) antes del error`);
    }
    finally { setWorking(false); }
  };
  const parseCorrFile = async (file: File) => {
    if (!plan || working) return;
    setWorking(true); clear();
    try {
      const r = await studyPlansApi.parseCorrelativas(plan._id, file);
      setCorrResult(r);
      flash('success', `PDF analizado: ${r.matchedCount}/${r.total} materias reconocidas.`);
    } catch (e) { flashFromError(e, 'No se pudo analizar el PDF de correlatividades'); }
    finally { setWorking(false); }
  };
  const applyCorr = async () => {
    if (!plan || !corrResult || working) return;
    const updates = corrResult.rows.filter(r => r.matched && r.code && r.requires.length).map(r => ({ code: r.code as string, requires: r.requires }));
    if (!updates.length) { flash('danger', 'No hay correlativas reconocidas para aplicar.'); return; }
    setWorking(true);
    try {
      const r = await studyPlansApi.saveCorrelativas(plan._id, updates);
      await reloadSubjects(plan._id); setCorrResult(null);
      flash('success', `Correlativas guardadas en ${r.saved} materias.${r.dropped.length ? ` Descartadas: ${r.dropped.length}.` : ''}`);
    } catch (e) { flashFromError(e, 'No se pudieron guardar las correlativas (¿ciclo?)'); }
    finally { setWorking(false); }
  };
  const clearCorr = async () => {
    if (!plan || working || !subjects.length || !window.confirm('¿Quitar TODAS las correlativas del plan?')) return;
    setWorking(true);
    try {
      await studyPlansApi.saveCorrelativas(plan._id, subjects.filter(s => s.code).map(s => ({ code: s.code as string, requires: [] })));
      await reloadSubjects(plan._id); setCorrResult(null);
      flash('success', 'Correlativas eliminadas del plan.');
    } catch (e) { flashFromError(e, 'No se pudieron eliminar las correlativas'); }
    finally { setWorking(false); }
  };
  return <div>
    <PageHeader title="Administrar planes de estudio" sub="Editá la información, las materias y las correlatividades del plan seleccionado." />
    <MessageBanner message={msg} onClose={clear} />
    <Card className="mb-4"><Card.Body>
      <Form.Label>Plan de estudios</Form.Label>
      <Form.Select value={selected} onChange={e => selectPlan(e.target.value)}><option value="">Seleccioná un plan</option>{plans.map(p => <option key={p._id} value={p._id}>{p.name} — {careerName(p)}</option>)}</Form.Select>
    </Card.Body></Card>
    {error && <div className="alert alert-danger">{error}</div>}
    {loading && <div className="text-center py-4"><Spinner animation="border" /> Cargando materias…</div>}
    {!loading && !error && !plan && <p className="text-muted">Todavía no hay planes registrados. Importá uno desde Cargar plan.</p>}
    {!loading && !error && plan && <>
      <Card className="mb-4"><Card.Header className="d-flex justify-content-between align-items-center"><strong>Información del plan</strong><Badge bg={plan.status === 'published' ? 'success' : 'secondary'}>{plan.status === 'published' ? 'Publicado' : 'Borrador'}</Badge></Card.Header><Card.Body>
        <Form.Group className="mb-3"><Form.Label>Nombre del plan</Form.Label><Form.Control value={name} onChange={e => setName(e.target.value)} /></Form.Group>
        <Form.Group className="mb-3"><Form.Label>Estado del plan</Form.Label><Form.Select value={status} onChange={e => setStatus(e.target.value as 'draft'|'published')}>
          <option value="draft">Borrador</option><option value="published">Publicado</option>
        </Form.Select><Form.Text muted>Publicar el borrador no lo convierte en un plan oficial; conserva su propietario.</Form.Text></Form.Group>
        <Form.Group className="mb-3"><Form.Label>Título intermedio (tecnicatura, opcional)</Form.Label><Form.Control value={intermediateTitle} onChange={e => setIntermediateTitle(e.target.value)} placeholder="Ej. Técnico/a Universitario/a en…" /></Form.Group>
        {intermediateTitle.trim() && <Form.Group className="mb-3"><Form.Label>Créditos de la tecnicatura</Form.Label><Form.Control type="number" min={0} value={creditsIntermediate} onChange={e => setCreditsIntermediate(e.target.value)} /></Form.Group>}
        <Button disabled={working || !name.trim()} onClick={() => void savePlan()}>Guardar datos del plan</Button>
      </Card.Body></Card>
      <Card className="mb-4"><Card.Header><strong>Correlatividades desde PDF</strong></Card.Header><Card.Body>
        <p className="small text-muted mb-2">Subí el PDF de correlatividades: se reconoce cada materia contra el plan (sin guardar) y después aplicás. Solo lo reconocido con requisitos se guarda; ante un ciclo no se guarda nada.</p>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <Form.Control type="file" accept="application/pdf" style={{ maxWidth: 320 }} disabled={working} onChange={e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) void parseCorrFile(f); }} />
          <Button size="sm" disabled={working || !corrResult} onClick={() => void applyCorr()}>Aplicar reconocidas</Button>
          <Button size="sm" variant="outline-danger" disabled={working || !subjects.length} onClick={() => void clearCorr()}>Quitar todas</Button>
        </div>
        {corrResult && <div className="mt-3">
          <p className="mb-1"><strong>{corrResult.matchedCount}/{corrResult.total}</strong> reconocidas · origen {corrResult.sourceKind ?? '—'}</p>
          <div className="table-responsive" style={{ maxHeight: 260, overflowY: 'auto' }}><Table size="sm" striped><thead><tr><th>Materia PDF</th><th>Plan</th><th>Requiere</th></tr></thead><tbody>
            {corrResult.rows.filter(r => r.matched).map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.code} · {r.dbName} ({r.confidence})</td><td>{r.requires.join(', ') || '—'}</td></tr>)}
          </tbody></Table></div>
          {!!corrResult.unmatched.length && <p className="small text-muted mt-2">Sin reconocer ({corrResult.unmatched.length}): {corrResult.unmatched.slice(0, 8).join(' · ')}{corrResult.unmatched.length > 8 ? '…' : ''}</p>}
        </div>}
      </Card.Body></Card>
      <Card className="mb-4"><Card.Header className="d-flex justify-content-between flex-wrap gap-2"><strong>Materias y correlatividades ({subjects.length})</strong><Button size="sm" variant="outline-secondary" onClick={() => navigate(`/grafo/${plan._id}`)}>Ver grafo</Button></Card.Header><Card.Body>
        <p className="small text-muted">Las materias importadas se editan aquí. Los nombres pertenecen al catálogo general de materias; en esta pantalla se editan sus datos propios del plan.</p>
        {intermediateTitle.trim() && intermediateCount === 0 && subjects.length > 0 && (
          <div className="alert alert-warning py-2">
            <strong>Atención:</strong> el plan declara el título intermedio «{intermediateTitle.trim()}» pero ninguna materia está marcada como parte de la tecnicatura. Marcá las que correspondan en la columna <em>Tec</em> o usá el marcado en lote.
          </div>
        )}
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <Form.Select size="sm" style={{ maxWidth: 200 }} aria-label="Alcance del marcado en lote" value={bulkYear} onChange={e => setBulkYear(e.target.value)}>
            <option value="">Todas las materias</option>
            {bulkYears.map(y => <option key={y} value={y}>{y}º año</option>)}
          </Form.Select>
          <Button size="sm" variant="outline-primary" disabled={working || !subjects.length} onClick={() => void applyBulkIntermediate(true)}>Marcar tecnicatura</Button>
          <Button size="sm" variant="outline-secondary" disabled={working || !subjects.length} onClick={() => void applyBulkIntermediate(false)}>Desmarcar</Button>
          <span className="small text-muted">{intermediateCount} de {subjects.length} materias marcadas como tecnicatura</span>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <span className="small text-muted">Requisito de correlativas del plan:</span>
          <Button size="sm" variant="outline-primary" disabled={working || !subjects.some(s => (s.prerequisites ?? []).length)} onClick={() => void setAllRequiredStatus('REGULARIZADA')}>Alcanza regularizada</Button>
          <Button size="sm" variant="outline-secondary" disabled={working || !subjects.some(s => (s.prerequisites ?? []).length)} onClick={() => void setAllRequiredStatus('APROBADA')}>Deben estar aprobadas</Button>
          <span className="small text-muted">Aplica el requisito a todas las correlativas del plan (después se ajusta materia por materia).</span>
        </div>
        <div className="table-responsive"><Table size="sm" striped hover><thead><tr><th>Materia</th><th>Código</th><th>Año</th><th>Período</th><th>Créditos</th><th>Optativa</th><th title="Pertenece a la tecnicatura intermedia">Tec</th><th>Correlatividades</th><th>Acciones</th></tr></thead><tbody>
          {subjects.map(s => {
            const v = draft[s._id]; if (!v) return null;
            return <tr key={s._id}><td style={{ minWidth: 190 }}><strong>{subjectName(s)}</strong></td>
              <td><Form.Control size="sm" style={{ minWidth: 90 }} value={v.code} onChange={e => modify(s._id, { code: e.target.value })} /></td>
              <td><Form.Control size="sm" type="number" min={1} style={{ width: 72 }} value={v.year} onChange={e => modify(s._id, { year: e.target.value })} /></td>
              <td><Form.Control size="sm" type="number" min={1} style={{ width: 72 }} value={v.period} onChange={e => modify(s._id, { period: e.target.value })} /></td>
              <td><Form.Control size="sm" type="number" min={0} style={{ width: 85 }} value={v.credits} onChange={e => modify(s._id, { credits: e.target.value })} /></td>
              <td><Form.Check type="checkbox" checked={v.optional} onChange={e => modify(s._id, { optional: e.target.checked })} /></td>
              <td><Form.Check type="checkbox" title="Pertenece a la tecnicatura intermedia" checked={v.intermediate} onChange={e => modify(s._id, { intermediate: e.target.checked })} /></td>
              <td style={{ minWidth: 260 }}><details><summary style={{ cursor: 'pointer' }}>{v.prerequisites.length} requisito(s)</summary><div className="p-2 border rounded mt-2" style={{ maxHeight: 240, overflowY: 'auto', minWidth: 260 }}>
                {subjects.filter(other => other._id !== s._id).map(other => {
                  const required = v.prerequisites.find(p => prerequisiteId(p) === other._id);
                  return <div key={other._id} className="mb-2"><Form.Check type="checkbox" label={`${other.code || '—'} · ${subjectName(other)}`} checked={Boolean(required)} onChange={e => togglePrerequisite(s._id, other._id, e.target.checked)} />
                    {required && <Form.Select size="sm" className="mt-1" value={required.requiredStatus} onChange={e => updateRequirement(s._id, other._id, e.target.value as 'APROBADA'|'REGULARIZADA')}><option value="REGULARIZADA">Alcanza regularizada</option><option value="APROBADA">Debe estar aprobada</option></Form.Select>}
                  </div>;
                })}
              </div></details></td>
              <td style={{ minWidth: 135 }}><Button size="sm" disabled={working} onClick={() => void saveSubject(s)}>Guardar</Button>{' '}<Button size="sm" variant="outline-danger" disabled={working} onClick={() => void removeSubject(s)}>Quitar</Button></td>
            </tr>;
          })}
        </tbody></Table></div>
        {!subjects.length && <p className="text-muted mb-0">El plan todavía no tiene materias. Cargalas desde la importación de PDF.</p>}
      </Card.Body></Card>
    </>}
  </div>;
}
