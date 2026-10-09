import { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Alert, Badge, Button, Card, Form } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { getPlanGraph } from '../api/planGraphAdapter';
import { studyPlansApi, careerName, type StudyPlan } from '../api/studyPlans';
import type { GraphData, IntermediateProgress } from '../types';
import { useCareerSelection } from '../context/CareerContext';
import { yearLabel } from '../utils/subjects';
import { STATUS_COLOR, STATUS_BADGE, statusColor, statusLabel } from '../utils/status';
import ColorDot from '../components/ColorDot';

interface PlanNodeData {
  code: string;
  name: string;
  year: number | null;
  cuatrimestre?: number | null;
  duration?: string | null;
  status: string;
  available: boolean;
  critical: boolean;
  optimal: boolean;
  credits: number;
}

function nodeBorder(d: Pick<PlanNodeData, 'optimal' | 'critical' | 'available'>, selected = false): string {
  if (selected) return '3px solid #212529';
  if (d.optimal) return '3px solid #6f42c1';
  if (d.critical) return '3px solid #fd7e14';
  if (d.available) return '3px solid #ffc107';
  return '3px solid rgba(0,0,0,.15)';
}

function StatusBadges({ d }: { d: Pick<PlanNodeData, 'available' | 'optimal' | 'critical'> }) {
  return (
    <>
      {d.available && <span className="badge text-bg-warning" style={{ fontSize: 9 }}>disponible</span>}
      {d.optimal && <span className="badge" style={{ fontSize: 9, background: '#6f42c1' }}>óptima</span>}
      {d.critical && <span className="badge text-bg-dark" style={{ fontSize: 9 }}>crítico</span>}
    </>
  );
}

function toPlanNodeData(
  n: { code: string; name: string; year: number | null; cuatrimestre: number | null; duration?: string | null; status: PlanNodeData['status']; credits: number },
  availableSet: Set<string>,
  criticalSet: Set<string>,
  fastSet: Set<string>,
): PlanNodeData {
  return {
    code: n.code,
    name: n.name,
    year: n.year,
    cuatrimestre: n.cuatrimestre,
    duration: n.duration ?? null,
    status: n.status,
    available: availableSet.has(n.code),
    critical: criticalSet.has(n.code),
    optimal: fastSet.has(n.code),
    credits: n.credits,
  };
}

function PlanNode({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const d = data as unknown as PlanNodeData;
  const color = statusColor(d.status);
  const label = statusLabel(d.status);
  const border = nodeBorder(d);
  return (
    <div
      style={{
        background: color,
        color: '#fff',
        borderRadius: 8,
        padding: '6px 10px 5px',
        minWidth: 170,
        maxWidth: 220,
        border,
        boxShadow: '0 2px 6px rgba(0,0,0,.25)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#333' }} />
      <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{d.name}</div>
      <div style={{ fontSize: 11, opacity: 0.92, marginTop: 2 }}>
        Año {d.year ?? '—'} · {d.code} · {d.credits} cr
      </div>
      <div style={{ fontSize: 10, opacity: 0.95, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
        {label}
        <StatusBadges d={d} />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#333' }} />
    </div>
  );
}

function YearLabel({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const year = (data as { year?: number }).year;
  return (
    <div
      style={{
        fontWeight: 700,
        fontSize: 14,
        color: 'var(--bs-secondary-color)',
        whiteSpace: 'nowrap',
        transform: 'translateX(-50%)',
        textAlign: 'center',
      }}
    >
      Año {year}
    </div>
  );
}

function IntermediateBanner({ intermediate }: { intermediate: IntermediateProgress }) {
  const complete = intermediate.total > 0 && intermediate.aprobadas >= intermediate.total;
  const pct = intermediate.total > 0 ? Math.min(100, Math.round((intermediate.aprobadas / intermediate.total) * 100)) : 0;
  return (
    <div className="px-3" style={{ margin: '0 auto', width: '100%', paddingBottom: 0 }}>
      <div
        className="d-flex align-items-center gap-2 flex-wrap"
        style={{
          padding: '6px 12px',
          borderRadius: 10,
          background: complete ? 'rgba(25,135,84,.12)' : 'rgba(20,108,67,.06)',
          border: `1px solid ${complete ? 'rgba(25,135,84,.35)' : 'rgba(20,108,67,.25)'}`,
        }}
      >
        <span className="fw-semibold small">
          Título intermedio{intermediate.title ? `: ${intermediate.title}` : ''}
        </span>
        {complete ? (
          <Badge bg="success">Completado — podés titularte</Badge>
        ) : (
          <span className="small text-muted">
            {intermediate.aprobadas}/{intermediate.total} materias · {intermediate.creditsAprob}/{intermediate.credits} créditos
          </span>
        )}
        <div className="progress flex-grow-1" style={{ height: 8, maxWidth: 260, marginBottom: 0 }}>
          <div
            className="progress-bar bg-success"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { plan: PlanNode, yearLabel: YearLabel };

const LEGEND: { color: string; label: string }[] = [
  { color: STATUS_COLOR.Aprobada, label: 'Aprobada' },
  { color: STATUS_COLOR.Regular, label: 'Regular' },
  { color: STATUS_COLOR.Cursando, label: 'En curso' },
  { color: STATUS_COLOR.Pendiente, label: 'Pendiente' },
  { color: '#ffc107', label: 'Disponible' },
  { color: '#fd7e14', label: 'Camino crítico' },
  { color: '#6f42c1', label: 'Ruta óptima' },
];

function FitButton() {
  const { fitView } = useReactFlow();
  return (
    <Button variant="outline-secondary" size="sm" onClick={() => fitView({ padding: 0.2 })}>
      Ajustar vista
    </Button>
  );
}

interface FastPathStep {
  code: string;
  name: string;
  cost: number;
}

interface DetailProps {
  graph: GraphData;
  selectedNode: GraphData['nodes'][number] | null;
  requires: GraphData['nodes'][number][];
  successors: GraphData['nodes'][number][];
  fastPath: { steps: FastPathStep[]; cost: number };
  onClose: () => void;
}

function DetailPanel({ graph, selectedNode, requires, successors, fastPath, onClose }: DetailProps) {
  return (
    <div className="plan-detail">
      <Card>
        <Card.Header className="d-flex align-items-center">
          <span className="me-auto fw-semibold">Detalle</span>
          <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={onClose}>✕</Button>
        </Card.Header>
        <Card.Body>
          {!selectedNode && <p className="text-muted mb-0">Tocá una materia para ver sus correlatividades.</p>}
          {selectedNode && (
            <>
              <h5 className="mb-1">{selectedNode.name}</h5>
              <p className="text-muted mb-1">
                <code>{selectedNode.code}</code> · año {selectedNode.year ?? '-'} · cuat. {selectedNode.cuatrimestre ?? '-'} · {selectedNode.credits} cr
              </p>
              <div className="mb-2">
                <Badge bg={(graph.availableNow ?? []).includes(selectedNode.code) ? 'warning' : 'secondary'} text="dark">
                  {(graph.availableNow ?? []).includes(selectedNode.code) ? 'Disponible ahora' : 'Bloqueada'}
                </Badge>
              </div>

              <div className="mt-2"><strong>Se requiere para cursar:</strong></div>
              <ul className="small mb-3 ps-3">
                {requires.length === 0 && <li className="text-muted">(ninguna)</li>}
                {requires.map((r) => (
                  <li key={r.code}>{r.name} <Badge bg={STATUS_BADGE[r.status]}>{statusLabel(r.status)}</Badge></li>
                ))}
              </ul>

              <div><strong>Habilita:</strong></div>
              <ul className="small mb-0 ps-3">
                {successors.length === 0 && <li className="text-muted">(ninguna)</li>}
                {successors.map((r) => <li key={r.code}>{r.name}</li>)}
              </ul>

              {fastPath.cost > 0 && (
                <div className="mt-3 p-2" style={{ background: 'rgba(111,66,193,.14)', borderRadius: 8, borderLeft: '3px solid #6f42c1' }}>
                  <div className="fw-semibold" style={{ color: '#6f42c1', fontSize: 13 }}>
                    ¡Podés cursarla en ≈ {fastPath.cost}{' '}
                    {fastPath.cost === 1 ? 'cuatrimestre' : 'cuatrimestres'}!
                  </div>
                  <div className="small text-muted mb-2">
                    Si rendís a tiempo y en el orden ideal, este es el camino más corto para aprobarla:
                  </div>
                  <ol className="small mb-2 ps-3" style={{ lineHeight: 1.6 }}>
                    {fastPath.steps.map((s, i) => {
                      const isLast = i === fastPath.steps.length - 1;
                      const acc = fastPath.steps.slice(0, i + 1).reduce((a, x) => a + (x.cost ?? 0), 0);
                      return (
                        <li key={s.code}>
                          <span className={isLast ? 'fw-bold' : ''}>{s.name}</span>
                          <span className="text-muted">
                            {' '}
                            · {s.cost === 0 ? 'ya aprobada' : s.cost === 1 ? '+1 cdm. por cursarla' : '+2 cdm. por cursarla'}
                            {s.cost > 0 && <span> (acumulado ≈ {acc})</span>}
                          </span>
                          {isLast && (
                            <span className="badge ms-1" style={{ background: '#6f42c1' }}>
                              esta materia
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="small text-muted" style={{ opacity: 0.85 }}>
                    Cálculo: 1 cuatrimestre por materia cuatrimestral, 2 si es anual, TC o TF. Ya aprobadas no cuentan.
                    No contempla superposición horaria ni cupos.
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default function PlanGraph({ initialView = 'grafo' }: { initialView?: 'grafo' | 'tablero' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { careerId: selectedCareerId, setCareerId: setSelectedCareerId } = useCareerSelection();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const view = initialView;
  const [pinnedCode, setPinnedCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const selectedPlan = useMemo(() => plans.find((p) => p._id === id) ?? null, [plans, id]);

  useEffect(() => {
    let active = true;
    studyPlansApi.getAll().then(result => { if (active) setPlans(result); }).catch(e => { if (active) setErr(e instanceof Error ? e.message : 'Error cargando planes'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!id || !selectedPlan) return;
    let active = true;
    setSelectedCareerId(id); // el contexto guarda ahora el ID del StudyPlan
    setGraph(null);
    setPinnedCode(null);
    setErr(null);
    getPlanGraph(selectedPlan).then(g => { if (active) setGraph(g); }).catch(e => {
      if (active) setErr(e instanceof Error ? e.message : 'No se pudo cargar el plan');
    });
    return () => { active = false; };
  }, [id, selectedPlan, setSelectedCareerId]);

  useEffect(() => {
    if (id || plans.length === 0) return;
    const chosen = plans.some(p => p._id === selectedCareerId) ? selectedCareerId : plans[0]._id;
    navigate(`/${view}/${chosen}`, { replace: true });
  }, [id, plans, selectedCareerId, navigate, view]);

  const changeCareer = (newId: string) => {
    if (!newId) return;
    setSelectedCareerId(newId);
    navigate(`/${view}/${newId}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinnedCode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectedCode = pinnedCode;

  const selectedNode = useMemo(() => graph?.nodes.find((n) => n.code === selectedCode) ?? null, [graph, selectedCode]);
  const byCodeMap = useMemo(() => new Map((graph?.nodes ?? []).map((n) => [n.code, n])), [graph]);

  const fastPath = useMemo(() => {
    if (!graph || !selectedCode || !byCodeMap.has(selectedCode)) {
      return { set: new Set<string>(), edgeSet: new Set<string>(), chain: [] as string[], chainNames: [] as string[], chainCosts: [] as number[], cost: 0 };
    }
    const prereqOf = new Map<string, string[]>();
    for (const e of graph.edges) {
      const subs = prereqOf.get(e.target) ?? [];
      subs.push(e.source);
      prereqOf.set(e.target, subs);
    }
    // costo en cuatrimestres: cuatrimestral = 1, anual/TC/TF = 2; aprobadas = 0.
    const costOf = (code: string) => {
      const n = byCodeMap.get(code);
      if (!n || (n.status ?? 'Pendiente') === 'Aprobada') return 0;
      return n.duration === 'A' || n.duration === 'TF' ? 2 : 1;
    };
    const memo = new Map<string, number>();
    const chainMemo = new Map<string, string[]>();
    const computing = new Set<string>();
    const dp = (code: string): number => {
      if (computing.has(code)) return 0;
      if (memo.has(code)) return memo.get(code)!;
      computing.add(code);
      let best = 0;
      let bestSub: string | null = null;
      for (const p of prereqOf.get(code) ?? []) {
        const node = byCodeMap.get(p);
        if (!node || (node.status ?? 'Pendiente') === 'Aprobada') continue;
        const d = dp(p) + costOf(p);
        if (d > best) {
          best = d;
          bestSub = p;
        }
      }
      computing.delete(code);
      memo.set(code, best);
      const subChain = bestSub && chainMemo.has(bestSub) ? chainMemo.get(bestSub)! : [];
      chainMemo.set(code, bestSub && subChain.length ? [...subChain, code] : [code]);
      return best;
    };
    const chain = chainMemo.get(selectedCode) ?? [selectedCode];
    const cost = dp(selectedCode) + costOf(selectedCode);
    const set = new Set(chain);
    const edgeSet = new Set<string>();
    for (let i = 0; i < chain.length - 1; i += 1) edgeSet.add(`${chain[i]}->${chain[i + 1]}`);
    return {
      set,
      edgeSet,
      chain,
      chainNames: chain.map((c) => byCodeMap.get(c)!.name),
      chainCosts: chain.map(costOf),
      cost,
    };
  }, [graph, selectedCode, byCodeMap]);

  const fastPathSteps = useMemo(
    () =>
      fastPath.chain.map((code, i) => ({
        code,
        name: byCodeMap.get(code)?.name ?? code,
        cost: fastPath.chainCosts[i] ?? 0,
      })),
    [fastPath.chain, fastPath.chainCosts, byCodeMap],
  );

  const flowNodes: Node[] = useMemo(() => {
    if (!graph) return [];
    const criticalSet = new Set(graph.criticalPath ?? []);
    const availableSet = new Set(graph.availableNow ?? []);
    const yearGroups = new Map<number, PlanNodeData[]>();
    const planNodes: Node[] = graph.nodes.map((n) => {
      const data = toPlanNodeData(n, availableSet, criticalSet, fastPath.set);
      if (n.year != null) {
        const arr = yearGroups.get(n.year) ?? [];
        arr.push(data);
        yearGroups.set(n.year, arr);
      }
      return { id: n.code, type: 'plan' as const, position: n.position, data: { ...data } };
    });
    const labels: Node[] = [];
    for (const [year, list] of yearGroups) {
      const x = list.reduce((a, d) => a + (graph.nodes.find((n) => n.code === d.code)?.position.x ?? 0), 0) / list.length;
      const top = Math.min(...list.map((d) => graph.nodes.find((n) => n.code === d.code)?.position.y ?? 0)) - 40;
      labels.push({
        id: `year-${year}`,
        type: 'yearLabel' as const,
        position: { x, y: top },
        data: { year },
        draggable: false,
        selectable: false,
      });
    }
    labels.sort((a, b) => (a.data as { year: number }).year - (b.data as { year: number }).year);
    return [...planNodes, ...labels];
  }, [graph, fastPath]);

  const flowEdges: Edge[] = useMemo(() => {
    if (!graph) return [];
    const criticalSet = new Set(graph.criticalPath ?? []);
    return graph.edges.map((e) => {
      const onOptimal = fastPath.edgeSet.has(e.id);
      const onCritical = criticalSet.has(e.source) && criticalSet.has(e.target);
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: onOptimal || onCritical,
        style: onOptimal
          ? { stroke: '#6f42c1', strokeWidth: 2.5, strokeDasharray: '6 3' }
          : onCritical
            ? { stroke: '#fd7e14', strokeWidth: 2 }
            : undefined,
      };
    });
  }, [graph, fastPath]);

  const boardGroups = useMemo(() => {
    interface YearGroup {
      year: number;
      c1: PlanNodeData[];
      c2: PlanNodeData[];
      anual: PlanNodeData[];
      cuat: PlanNodeData[];
      total: number;
      aprobadas: number;
      credits: number;
      creditsAprob: number;
    }
    if (!graph) return [] as YearGroup[];
    const criticalSet = new Set(graph.criticalPath ?? []);
    const availableSet = new Set(graph.availableNow ?? []);
    const m = new Map<number, YearGroup>();
    for (const n of graph.nodes) {
      const y = n.year ?? 999;
      const g = m.get(y) ?? { year: y, c1: [], c2: [], anual: [], cuat: [], total: 0, aprobadas: 0, credits: 0, creditsAprob: 0 };
      const data = toPlanNodeData(n, availableSet, criticalSet, fastPath.set);
      g.total += 1;
      g.credits += n.credits ?? 0;
      if (n.status === 'Aprobada') {
        g.aprobadas += 1;
        g.creditsAprob += n.credits ?? 0;
      }
      if (n.cuatrimestre === 1) g.c1.push(data);
      else if (n.cuatrimestre === 2) g.c2.push(data);
      else if (n.duration === 'A' || n.duration === 'TF') g.anual.push(data);
      else g.cuat.push(data);
      m.set(y, g);
    }
    const out = [...m.values()].sort((a, b) => a.year - b.year);
    for (const g of out) {
      // Merge cuatrimestral subjects (no cuat assigned) into the last cuatrimestre
      if (g.cuat.length > 0) {
        const target = g.c2.length > 0 ? g.c2 : g.c1;
        target.push(...g.cuat);
        g.cuat = [];
      }
      g.c1.sort((a, b) => a.name.localeCompare(b.name));
      g.c2.sort((a, b) => a.name.localeCompare(b.name));
      g.anual.sort((a, b) => a.name.localeCompare(b.name));
    }
    return out;
  }, [graph, fastPath]);

  const requires = useMemo(() => {
    if (!selectedNode || !graph) return [];
    return Array.from(byCodeMap.values()).filter((n) =>
      graph.edges.some((e) => e.target === selectedNode.code && e.source === n.code),
    );
  }, [selectedNode, byCodeMap, graph]);

  const successors = useMemo(() => {
    if (!selectedNode || !graph) return [];
    return Array.from(byCodeMap.values()).filter((n) =>
      graph.edges.some((e) => e.source === selectedNode.code && e.target === n.code),
    );
  }, [selectedNode, byCodeMap, graph]);

  if (err) {
    return <Alert variant="danger" className="mt-3">{err}</Alert>;
  }

  const renderCard = (d: PlanNodeData, selected: boolean) => {
    const border = nodeBorder(d, selected);
    return (
      <button
        key={d.code}
        onClick={() => setPinnedCode((prev) => (prev === d.code ? null : d.code))}
        style={{
          background: statusColor(d.status),
          color: '#fff',
          border,
          borderRadius: 10,
          padding: '8px 12px',
          minWidth: 200,
          maxWidth: 240,
          flex: '1 1 200px',
          textAlign: 'left',
          boxShadow: '0 2px 6px rgba(0,0,0,.2)',
          cursor: 'pointer',
        }}
      >
        <div className="d-flex justify-content-between align-items-start gap-2">
          <span style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{d.name}</span>
          <span
            className="badge"
            style={{
              background: 'rgba(255,255,255,.22)',
              color: '#fff',
              fontSize: 9,
              flexShrink: 0,
              border: '1px solid rgba(255,255,255,.4)',
            }}
          >
            {d.cuatrimestre === 1 ? '1C' : d.cuatrimestre === 2 ? '2C' : d.duration === 'A' || d.duration === 'TF' ? 'Anual' : 'Cuatrimestral'}
          </span>
        </div>
        <div style={{ fontSize: 11, opacity: 0.92, marginTop: 3 }}>
          {d.code} · {d.credits} cr · {statusLabel(d.status)}
        </div>
        <div style={{ fontSize: 10, opacity: 0.95, marginTop: 3 }}>
          <StatusBadges d={d} />
        </div>
      </button>
    );
  };

  return (
    <ReactFlowProvider>
      <div className="plan-graph" style={{ height: 'calc(100dvh - 118px)', display: 'flex', flexDirection: 'column', maxWidth: 1400, margin: '0 auto' }}>
        <div className="d-flex align-items-center gap-3 px-3 pt-3 pb-2 flex-wrap">
          <div className="d-flex align-items-center gap-2 me-auto">
            {graph?.color && (
              <ColorDot color={graph.color} size={16} />
            )}
            <div>
              <h1 className="mb-0 fs-4">
                {selectedPlan ? `${careerName(selectedPlan)} · ${selectedPlan.name}` : 'Plan de estudios'} ·{' '}
                {view === 'grafo' ? 'Correlatividades' : 'Tablero de avance'}
              </h1>
              {plans.length > 0 && (
                <Form.Select
                  size="sm"
                  value={id ?? ''}
                  onChange={(e) => changeCareer(e.target.value)}
                  aria-label="Cambiar plan de estudios"
                  style={{ maxWidth: 320 }}
                >
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} — {careerName(p)}</option>
                  ))}
                </Form.Select>
              )}
            </div>
          </div>

          {graph && (
            <div className="d-flex gap-1 small text-muted flex-wrap">
              <Badge bg="secondary">Materias {graph.stats.total}</Badge>
              <Badge bg="success">{graph.stats.aprobadas} aprobadas</Badge>
              <Badge bg="warning" text="dark">{graph.stats.disponibles} disponibles</Badge>
              <Badge bg="secondary">Créditos {graph.stats.creditsAprobados}/{graph.stats.creditsTotal}</Badge>
            </div>
          )}

          {view === 'grafo' && <FitButton />}
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/')}>← Volver</Button>
        </div>

        {err && <Alert variant="danger" className="mx-3">{err}</Alert>}
        {id && !selectedPlan && plans.length > 0 && <Alert variant="warning" className="mx-3">Seleccioná un plan válido. Los enlaces antiguos de carrera ya no corresponden al grafo.</Alert>}
        {graph && graph.edges.length === 0 && <Alert variant="info" className="mx-3 py-1 small">No hay correlatividades vinculadas todavía. Podés agregarlas desde Administrar plan.</Alert>}
        {graph?.intermediate && graph.intermediate.total > 0 && (
          <IntermediateBanner intermediate={graph.intermediate} />
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 8px 8px' }}>
          {view === 'grafo' && graph && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8, flexShrink: 0 }}>
              <div
                style={{
                  maxWidth: '94%',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px 14px',
                  padding: '5px 16px',
                  borderRadius: 999,
                  background: 'var(--bs-body-bg)',
                  border: '1px solid var(--bs-border-color)',
                  boxShadow: '0 2px 8px rgba(0,0,0,.12)',
                }}
              >
                <span className="small fw-semibold text-secondary me-1" style={{ whiteSpace: 'nowrap' }}>Leyenda</span>
                {LEGEND.map((l) => (
                  <span
                    key={l.label}
                    className="d-inline-flex align-items-center gap-1"
                    style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--bs-body-color)' }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        display: 'inline-block',
                        background: l.color,
                        border: '1px solid rgba(0,0,0,.3)',
                      }}
                    />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {view === 'grafo' && graph && (
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                  if (node.type === 'yearLabel') return;
                  setPinnedCode((prev) => (prev === node.id ? null : node.id));
                }}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable
                defaultEdgeOptions={{ markerEnd: { type: 'arrowclosed' } }}
                style={{ width: '100%', height: '100%' }}
              >
                <Background gap={20} color="var(--bs-secondary-bg)" />
                <Controls position="bottom-left" />
              </ReactFlow>
            )}

          {view === 'tablero' && graph && (
            <div style={{ height: '100%', overflow: 'auto', padding: '4px 12px 20px' }}>
              {boardGroups.map((g) => (
                <div
                  key={g.year}
                  className="card mb-3"
                  style={{ borderLeft: `5px solid ${graph.color ?? '#0d6efd'}`, borderRadius: 10 }}
                >
                  <div className="card-body py-2 px-3 d-flex flex-wrap align-items-center gap-3">
                    <div className="fw-bold" style={{ color: graph.color ?? '#0d6efd', minWidth: 90 }}>
                      {yearLabel(g.year)}
                    </div>
                    <div className="small text-muted">
                      {g.total} materias · {g.aprobadas} aprobadas ·{' '}
                      {g.creditsAprob}/{g.credits} créditos
                    </div>
                    {g.aprobadas === g.total && g.total > 0 && (
                      <span className="badge text-bg-success ms-auto">año completo</span>
                    )}
                  </div>
                  <div className="card-body pt-0 px-3 pb-3 d-flex flex-wrap gap-2">
                    {g.c1.length > 0 && (
                      <div className="flex-grow-1" style={{ minWidth: 220 }}>
                        <div className="small fw-semibold text-muted mb-1">Cuatrimestre 1</div>
                        <div className="d-flex flex-wrap gap-2">{g.c1.map((d) => renderCard(d, d.code === selectedCode))}</div>
                      </div>
                    )}
                    {g.c2.length > 0 && (
                      <div className="flex-grow-1" style={{ minWidth: 220 }}>
                        <div className="small fw-semibold text-muted mb-1">Cuatrimestre 2</div>
                        <div className="d-flex flex-wrap gap-2">{g.c2.map((d) => renderCard(d, d.code === selectedCode))}</div>
                      </div>
                    )}
                    {g.anual.length > 0 && (
                      <div className="flex-grow-1" style={{ minWidth: 220 }}>
                        <div className="small fw-semibold text-muted mb-1">Anual / TC / TF</div>
                        <div className="d-flex flex-wrap gap-2">{g.anual.map((d) => renderCard(d, d.code === selectedCode))}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {graph && pinnedCode && (
            <DetailPanel
              graph={graph}
              selectedNode={selectedNode}
              requires={requires}
              successors={successors}
              fastPath={{ steps: selectedCode ? fastPathSteps : [], cost: selectedCode ? fastPath.cost : 0 }}
              onClose={() => setPinnedCode(null)}
            />
          )}
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}