import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  ViewportPortal,
  Controls,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type CoordinateExtent
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Alert, Badge, Button, Card, Form } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { getPlanGraph } from '../api/planGraphAdapter';
import { studyPlansApi, careerName, type StudyPlan } from '../api/studyPlans';
import type { GraphData, IntermediateProgress, SubjectStatus } from '../types';
import { useCareerSelection } from '../context/CareerContext';
import { useTheme } from '../hooks/useTheme';
import { yearLabel } from '../utils/subjects';
import { STATUS_BADGE, statusColor, statusLabel, resolveNodeStatus } from '../utils/status';
import { instituteColor, instituteGradientTec } from '../utils/instituteColors';
import { getDirectSuccessorCodes, HIGHLIGHT_COLOR } from '../utils/graphHighlight';
import { getStudyPath } from '../utils/studyPaths';
import SubjectStatusAction from '../components/SubjectStatusAction';
import SubjectStatusIcon from '../components/SubjectStatusIcon';
import AcademicEdge from '../components/AcademicEdge';
import { useAcademicEdgeLayout } from '../hooks/useAcademicEdgeLayout';
import type { AcademicLayout } from '../utils/academicEdgeLayout';
import '../components/AcademicMap.css';

interface PlanNodeData {
  onAdvance?: (code: string, backwards?: boolean) => void;
  progressSaving?: boolean;
  code: string;
  name: string;
  year: number | null;
  cuatrimestre?: number | null;
  duration?: string | null;
  status: SubjectStatus;
  available: boolean;
  critical: boolean;
  optimal: boolean;
  highlightedNext: boolean;
  newlyUnlocked?: boolean;
  selectedSubject: boolean;
  credits: number;
}

const BORDER_WIDTH = 2;
const DIMMED_OPACITY = 0.55;
const AVAILABLE_COLOR = '#3B82F6';
const IN_PROGRESS_COLOR = '#0561e5';
const UNLOCK_COLOR = IN_PROGRESS_COLOR;
const UNLOCK_HIGHLIGHT_MS = 5000;
const GRAPH_BACKGROUND = {
  color: '#f8fbff',
  dotsColor: '#d3dceb',
  dotsGap: 24,
  dotsSize: 1.4,
  dark: {
    color: '#101923',
    dotsColor: '#293547',
  },
};
// Configuración de las flechas
const EDGE_COLORS = {
  normal: '#94a3b8',
  critical: '#fd7e14',
  optimal: '#d9870b',
};

const EDGE_WIDTH = {
  normal: 1.25,
  critical: 3,
  optimal: 3,
};

const ARROW_SIZE = {
  width: 40,
  height: 40,
};
function nodeBorder(
  d: Pick<PlanNodeData, 'optimal' | 'critical' | 'available' | 'status' | 'highlightedNext' | 'newlyUnlocked'>,
  selected = false
): string {
  const width = `${BORDER_WIDTH}px solid`;

  if (d.optimal) return `${width} ${EDGE_COLORS.optimal}`;
  if (d.critical) return `${width} ${EDGE_COLORS.critical}`;
  if (selected) return `${width} #2563EB`;
  if (d.newlyUnlocked) return `${width} ${UNLOCK_COLOR}`;
  if (d.highlightedNext) return `${width} ${HIGHLIGHT_COLOR}`;
  if (d.status === 'Aprobada') return `${width} #258b43`;
  if (d.status === 'Cursando') return `${width} ${IN_PROGRESS_COLOR}`;
  if (d.available) return `${width} ${AVAILABLE_COLOR}`;

  return `${width} #CBD5E1`;
}

function StatusBadges({ d }: { d: Pick<PlanNodeData, 'available' | 'optimal' | 'critical'> }) {
  return (
    <>
      {d.available && <span className="badge text-bg-warning" style={{ fontSize: 9 }}>disponible</span>}
      {d.optimal && <span className="badge" style={{ fontSize: 9, background: '#d9870b' }}>óptima</span>}
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
  const status = resolveNodeStatus(n.status, availableSet.has(n.code));
  return {
    code: n.code,
    name: n.name,
    year: n.year,
    cuatrimestre: n.cuatrimestre,
    duration: n.duration ?? null,
    status,
    available: status === 'Disponible',
    critical: criticalSet.has(n.code),
    optimal: fastSet.has(n.code),
    highlightedNext: false,
    selectedSubject: false,
    credits: n.credits,
  };
}





function PlanNode({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const d = data as unknown as PlanNodeData;
  const pathColor = d.optimal ? EDGE_COLORS.optimal : d.critical ? EDGE_COLORS.critical : undefined;
  const color = pathColor ?? statusColor(d.status);
  const border = nodeBorder(d, d.selectedSubject);

  return (
    <div
      className={`plan-node${!pathColor && d.status === 'Cursando' ? ' plan-node--in-progress' : ''}${d.highlightedNext || d.newlyUnlocked ? ' plan-node--highlighted-next' : ''}`}
      style={{
        ...(d.newlyUnlocked ? { '--plan-highlight-color': UNLOCK_COLOR } : {}),
        background: color,
        color: pathColor ? '#211407' : '#23395d',
        outline: pathColor && d.selectedSubject ? '2px solid #23395d' : undefined,
        outlineOffset: 3,
        borderRadius: 12,

        width: 220,
        height: 'auto',
        minHeight: 90,

        boxSizing: 'border-box',
        border,

        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        textAlign: 'left',
        gap: 10,
      }}
    >
      <SubjectStatusAction
        status={d.status}
        name={d.name}
        onAdvance={d.onAdvance ? () => d.onAdvance?.(d.code) : undefined}
        onRevert={d.onAdvance ? () => d.onAdvance?.(d.code, true) : undefined}
        disabled={d.progressSaving}
        highlightColor={d.newlyUnlocked ? UNLOCK_COLOR : d.highlightedNext ? HIGHLIGHT_COLOR : undefined}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0 }}
      />

      {/* Nombre de la materia */}
      <div
        style={{
          fontWeight: 700,
          fontSize: 15,
          lineHeight: 1.4,
          width: '100%',
          overflowWrap: 'break-word',
          paddingRight: 16,
        }}
      >
        {d.name}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0 }}
      />
    </div>
  );
}




function YearLabel({ data }: NodeProps<Node<Record<string, unknown>>>) {
  const { label, width, isYear, subjectCount } = data as { label: string; width: number; isYear: boolean; subjectCount?: number };
  return (
    <div
      style={{
        width,
        fontWeight: isYear ? 700 : 600,
        fontSize: 16,
        color: 'var(--bs-secondary-color)',
        whiteSpace: 'nowrap',
        textAlign: isYear ? 'center' : 'left',
        paddingBottom: isYear ? 8 : 0,
        borderBottom: isYear ? '1px solid var(--bs-secondary-color)' : undefined,
      }}
    >
      {label}
      {!isYear && <div className="plan-semester-count">{subjectCount} {subjectCount === 1 ? 'materia' : 'materias'}</div>}
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
const edgeTypes = { academic: AcademicEdge };
const EMPTY_EDGES: GraphData['edges'] = [];

function LayoutViewport({ layout }: { layout: AcademicLayout | undefined }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!layout) return;
    const frame = requestAnimationFrame(() => { void fitView({ padding: 0.2 }); });
    return () => cancelAnimationFrame(frame);
  }, [layout, fitView]);
  return null;
}

// Separación visual del grafo: dos columnas de cuatrimestres dentro de cada año.
const GRAPH_SPACING = {
  nodeWidth: 220,
  columnGap: 90,
  yearGap: 140,
  rowGap: 152,
};

const STATUS_LEGEND: { status: SubjectStatus; label: string; stat: 'aprobadas' | 'regulares' | 'enCurso' | 'bloqueadas' | 'disponibles' }[] = [
  { status: 'Aprobada', label: 'Aprobadas', stat: 'aprobadas' },
  { status: 'Regular', label: 'Regulares', stat: 'regulares' },
  { status: 'Cursando', label: 'En curso', stat: 'enCurso' },
  { status: 'Bloqueada', label: 'Bloqueadas', stat: 'bloqueadas' },
  { status: 'Disponible', label: 'Disponibles', stat: 'disponibles' },
];

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

function DetailPanel({ selectedNode, requires, successors, fastPath, onClose }: DetailProps) {
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
                <Badge bg={STATUS_BADGE[selectedNode.status]}>
                  {statusLabel(selectedNode.status)}
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
                <div className="mt-3 p-2" style={{ background: 'rgba(217,135,11,.14)', borderRadius: 8, borderLeft: '3px solid #d9870b' }}>
                  <div className="fw-semibold" style={{ color: '#b26a00', fontSize: 13 }}>
                    Para llegar a aprobar esta materia: ≈ {fastPath.cost}{' '}
                    {fastPath.cost === 1 ? 'cuatrimestre' : 'cuatrimestres'} como mínimo
                  </div>
                  <div className="small text-muted mb-2">
                    De las secuencias de correlativas que llevan a esta materia, esta es la que más tiempo requiere.
                    Seguí el orden de la lista y avanzá con las otras correlativas en paralelo.
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
                            · {s.cost === 0 ? 'ya aprobada' : s.cost === 1 ? '1 cuatrimestre' : '2 cuatrimestres'}
                            {s.cost > 0 && <span> (total hasta acá: {acc})</span>}
                          </span>
                          {isLast && (
                            <span className="badge ms-1" style={{ background: '#d9870b' }}>
                              esta materia
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="small text-muted" style={{ opacity: 0.85 }}>
                    El tiempo incluye la materia elegida y supone que podés cursar las otras ramas en paralelo.
                    {' '}Las aprobadas no suman tiempo; las que estás cursando cuentan con su duración completa.
                    {' '}La oferta de materias, los horarios y los cupos pueden alargar este plazo.
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
  const { theme } = useTheme();
  const graphBackground = theme === 'dark' ? GRAPH_BACKGROUND.dark : GRAPH_BACKGROUND;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { careerId: selectedCareerId, setCareerId: setSelectedCareerId } = useCareerSelection();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [enrollments, setEnrollments] = useState<string[]>([]);
  const [tab, setTab] = useState<'lic' | 'tec'>('lic');
  const [interCodes, setInterCodes] = useState<Set<string> | null>(null);

  // Subgrafo de la vista: Licenciatura completa o solo tecnicatura.
  // Con set vacío se muestra vacío (aviso), nunca la Licenciatura.
  const displayGraph = useMemo(() => {
    if (!graph || tab === 'lic' || !interCodes) return graph;
    const nodes = graph.nodes.filter((n) => interCodes.has(n.code));
    const inSet = new Set(nodes.map((n) => n.code));
    const edges = graph.edges.filter((e) => inSet.has(e.source) && inSet.has(e.target));
    const availableNow = (graph.availableNow ?? []).filter((c) => inSet.has(c));
    const aprobadas = nodes.filter((n) => n.status === 'Aprobada');
    const creditsTotal = nodes.reduce((a, n) => a + (n.credits ?? 0), 0);
    const creditsAprobados = aprobadas.reduce((a, n) => a + (n.credits ?? 0), 0);
    return {
      ...graph,
      nodes,
      edges,
      availableNow,
      criticalPath: (graph.criticalPath ?? []).filter((c) => inSet.has(c)),
      topologicalOrder: (graph.topologicalOrder ?? []).filter((c) => inSet.has(c)),
      stats: {
        ...graph.stats,
        total: nodes.length,
        aprobadas: aprobadas.length,
        disponibles: availableNow.length,
        bloqueadas: nodes.filter((n) => n.status === 'Bloqueada').length,
        enCurso: nodes.filter((n) => n.status === 'Cursando').length,
        regulares: nodes.filter((n) => n.status === 'Regular').length,
        creditsTotal,
        creditsAprobados,
      },
    };
  }, [graph, tab, interCodes]);
  const view = initialView;
  const [pinnedCode, setPinnedCode] = useState<string | null>(null);
  const [pathMode, setPathMode] = useState<'critical' | 'optimal' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const selectedPlan = useMemo(() => plans.find((p) => p._id === id) ?? null, [plans, id]);
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [unlockHighlight, setUnlockHighlight] = useState<{ source: string; codes: Set<string> } | null>(null);
  useEffect(() => {
    if (!unlockHighlight) return;
    const timer = window.setTimeout(() => setUnlockHighlight(null), UNLOCK_HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [unlockHighlight]);
  const newlyUnlockedCodes = useMemo(() => new Set(
    (graph?.nodes ?? []).filter(node => node.status === 'Disponible' && unlockHighlight?.codes.has(node.code)).map(node => node.code),
  ), [graph, unlockHighlight]);
  const progressOperation = useRef<symbol | null>(null);
  useEffect(() => {
    progressOperation.current = null;
    setProgressSaving(false);
    setProgressError(null);
    setUnlockHighlight(null);
    setPathMode(null);
    setPinnedCode(null);
    return () => { progressOperation.current = null; };
  }, [id]);

  const advanceSubject = useCallback(async (code: string, backwards = false) => {
    const subject = graph?.nodes.find(node => node.code === code);
    const status = backwards
      ? subject?.status === 'Aprobada' ? 'CURSANDO' : subject?.status === 'Cursando' ? 'DISPONIBLE' : null
      : subject?.status === 'Disponible' ? 'CURSANDO' : subject?.status === 'Cursando' ? 'APROBADA' : null;
    if (!status || !subject?.planSubjectId || !graph?.userStudyPlanId || !selectedPlan || progressOperation.current) return;
    const operation = Symbol();
    progressOperation.current = operation;
    setProgressSaving(true);
    setProgressError(null);
    let saved = false;
    try {
      await studyPlansApi.saveProgress(graph.userStudyPlanId, subject.planSubjectId, { status });
      saved = true;
      const updated = await getPlanGraph(selectedPlan, true);
      if (progressOperation.current === operation) {
        if (backwards) setUnlockHighlight(null);
        if (status === 'APROBADA') {
          const successors = getDirectSuccessorCodes(updated.edges, code);
          const previous = new Map(graph.nodes.map(node => [node.code, node.status]));
          const codes = new Set(updated.nodes.filter(node => successors.has(node.code)
            && previous.get(node.code) === 'Bloqueada' && node.status === 'Disponible').map(node => node.code));
          setUnlockHighlight(codes.size ? { source: code, codes } : null);
        }
        setGraph(updated);
      }
    } catch (error) {
      if (progressOperation.current === operation) setProgressError(saved
        ? 'El cambio se guardó, pero no se pudo actualizar el mapa. Recargá la página para ver el progreso actualizado.'
        : error instanceof Error ? error.message : 'No se pudo guardar el progreso. Intentá nuevamente.');
    } finally {
      if (progressOperation.current === operation) {
        progressOperation.current = null;
        setProgressSaving(false);
      }
    }
  }, [graph, selectedPlan]);

  // Color del instituto (oficial UNAHUR) con fallback a carrera/grafo.
  const planBaseColor = useMemo(() => {
    const c = selectedPlan?.career;
    if (c && typeof c === 'object') {
      if (c.color) return c.color;
      const u = c.academicUnit;
      if (u && typeof u === 'object' && u.name)
        return instituteColor(u.name, u.color);
    }
    return graph?.color ?? '#238a42';
  }, [selectedPlan, graph]);

  useEffect(() => {
    let active = true;
    studyPlansApi.getAll().then(result => { if (active) setPlans(result); }).catch(e => { if (active) setErr(e instanceof Error ? e.message : 'Error cargando planes'); });
    studyPlansApi.getMine().then(
      (mine) => {
        if (!active) return;
        setEnrollments(
          mine.map((e) => (typeof e.studyPlan === 'string' ? e.studyPlan : e.studyPlan?._id)).filter((x): x is string => Boolean(x)),
        );
      },
      () => { if (active) setEnrollments([]); },
    );
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!id || !selectedPlan) return;
    let active = true;
    setSelectedCareerId(id); // el contexto guarda ahora el ID del StudyPlan
    setGraph(null);
    setPinnedCode(null);
    setTab('lic');
    setInterCodes(null);
    setErr(null);
    if (selectedPlan.intermediateTitle) {
      studyPlansApi.getIntermediate(id).then(
        (v) => { if (active) setInterCodes(new Set(v.subjects.map((s) => s.code))); },
        () => { if (active) setInterCodes(null); },
      );
    }
    getPlanGraph(selectedPlan).then(g => { if (active) setGraph(g); }).catch(e => {
      if (active) setErr(e instanceof Error ? e.message : 'No se pudo cargar el plan');
    });
    return () => { active = false; };
  }, [id, selectedPlan, setSelectedCareerId]);

  useEffect(() => {
    if (id || plans.length === 0) return;
    // Ámbito a lo elegido: recordado, inscripto o explorar (nunca el primero).
    if (plans.some(p => p._id === selectedCareerId)) {
      navigate(`/${view}/${selectedCareerId}`, { replace: true });
    } else if (enrollments.length > 0 && plans.some(p => p._id === enrollments[0])) {
      navigate(`/${view}/${enrollments[0]}`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [id, plans, selectedCareerId, enrollments, navigate, view]);

  const changeCareer = (newId: string) => {
    if (!newId) return;
    setSelectedCareerId(newId);
    navigate(`/${view}/${newId}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinnedCode(null);
        setPathMode(mode => mode === 'optimal' ? null : mode);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Tec sin materias marcadas: se muestra aviso en vez de canvas vacío.
  const tecEmpty = tab === 'tec' && (displayGraph?.nodes.length ?? -1) === 0;

  const selectedCode = pinnedCode;

  const selectedNode = useMemo(() => displayGraph?.nodes.find((n) => n.code === selectedCode) ?? null, [displayGraph, selectedCode]);
  const byCodeMap = useMemo(() => new Map((displayGraph?.nodes ?? []).map((n) => [n.code, n])), [displayGraph]);
  const highlightedNextCodes = useMemo(() => getDirectSuccessorCodes(
    displayGraph?.edges ?? [], selectedNode?.code ?? null,
  ), [displayGraph, selectedNode]);

  const fastPath = useMemo(() => getStudyPath(
    displayGraph?.nodes ?? [], displayGraph?.edges ?? [], selectedCode,
  ), [displayGraph, selectedCode]);
  const criticalPath = useMemo(() => getStudyPath(
    displayGraph?.nodes ?? [], displayGraph?.edges ?? [],
  ), [displayGraph]);
  const activePath = pathMode === 'critical' && criticalPath.chain.length > 0
    ? criticalPath
    : pathMode === 'optimal' && fastPath.chain.length > 0 ? fastPath : null;
  const activeMode = activePath ? pathMode : null;

  const fastPathSteps = useMemo(
    () =>
      fastPath.chain.map((code, i) => ({
        code,
        name: byCodeMap.get(code)?.name ?? code,
        cost: fastPath.chainCosts[i] ?? 0,
      })),
    [fastPath.chain, fastPath.chainCosts, byCodeMap],
  );

  const baseNodes: Node[] = useMemo(() => {
    const g = displayGraph;
    if (!g) return [];
    const criticalSet = new Set<string>();
    const availableSet = new Set(g.availableNow ?? []);
    const yearGroups = new Map<number | null, GraphData['nodes']>();
    for (const n of g.nodes) {
      const list = yearGroups.get(n.year) ?? [];
      list.push(n);
      yearGroups.set(n.year, list);
    }

    const nodes: Node[] = [];
    const { nodeWidth, columnGap, yearGap, rowGap } = GRAPH_SPACING;
    const columnStep = nodeWidth + columnGap;
    const yearWidth = nodeWidth * 2 + columnGap;
    const addLabel = (id: string, label: string, x: number, y: number, isYear = false) => {
      nodes.push({
        id,
        type: 'yearLabel' as const,
        position: { x, y },
        data: { label, width: isYear ? yearWidth : nodeWidth, isYear },
        draggable: false,
        selectable: false,
        focusable: false,
      });
    };
    const addGroup = (
      id: string,
      label: string,
      subjects: GraphData['nodes'],
      x: number,
      y: number
    ) => {
      // No crear columnas vacías
      if (subjects.length === 0) return;

      addLabel(id, label, x, y);

      nodes[nodes.length - 1].data.subjectCount = subjects.length;

      subjects.forEach((n, row) => {
        nodes.push({
          id: n.code,
          type: 'plan',
          position: {
            x,
            y: y + 64 + row * rowGap,
          },
          data: {
            ...toPlanNodeData(
              n,
              availableSet,
              criticalSet,
              new Set()
            ),
          },
        });
      });
    };
    const sortedYears = [...yearGroups.entries()].sort(
      ([a], [b]) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER),
    );
    sortedYears.forEach(([year, subjects], index) => {
      const c1: GraphData['nodes'] = [];
      const c2: GraphData['nodes'] = [];
      const annual: GraphData['nodes'] = [];
      const unassigned: GraphData['nodes'] = [];
      for (const n of subjects) {
        if (n.duration === 'A') annual.push(n);
        else if (n.cuatrimestre === 1) c1.push(n);
        else if (n.cuatrimestre === 2) c2.push(n);
        else unassigned.push(n);
      }

      const x = index * (yearWidth + yearGap);
      const id = `graph-heading-${year ?? 'unknown'}`;
      addLabel(id, year == null ? 'Sin año' : `Año ${year}`, x, 0, true);
      addGroup(`${id}-c1`, '1.er cuatrimestre', c1, x, 50);
      addGroup(`${id}-c2`, '2.º cuatrimestre', c2, x + columnStep, 50);

      // Las anuales y las materias sin período no se asignan a un cuatrimestre ficticio.
      const extraY = 114 + Math.max(c1.length, c2.length) * rowGap + 30;
      if (annual.length > 0) addGroup(`${id}-annual`, 'Anuales', annual, x, extraY);
      if (unassigned.length > 0) addGroup(`${id}-unassigned`, 'Sin cuatrimestre', unassigned, x + columnStep, extraY);
    });
    return nodes;
  }, [displayGraph]);

  const { layout, layoutError, onNodesChange, nodeSizes } = useAcademicEdgeLayout(baseNodes, displayGraph?.edges ?? EMPTY_EDGES);
  const flowNodes: Node[] = useMemo(() => baseNodes.map(node => {
    const related = node.id === selectedCode || highlightedNextCodes.has(node.id) || newlyUnlockedCodes.has(node.id);
    return {
      ...node,
      position: layout?.positions[node.id] ?? node.position,
      style: { opacity: node.type === 'plan' && (activePath ? !activePath.set.has(node.id) : selectedNode && !related) ? DIMMED_OPACITY : 1 },
      data: node.type === 'plan' ? {
        ...node.data,
        optimal: activeMode === 'optimal' && fastPath.set.has(node.id),
        critical: activeMode === 'critical' && criticalPath.set.has(node.id),
        highlightedNext: !activeMode && highlightedNextCodes.has(node.id),
        newlyUnlocked: !activeMode && newlyUnlockedCodes.has(node.id),
        selectedSubject: node.id === selectedCode,
        // React Flow stores this handler in data; only the icon's click invokes it.
        // eslint-disable-next-line react-hooks/refs
        onAdvance: graph?.userStudyPlanId ? advanceSubject : undefined,
        progressSaving,
      } : {
        ...node.data,
        width: layout?.yearWidths[node.id] ?? node.data.width,
      },
    };
  }), [baseNodes, layout, fastPath.set, criticalPath.set, activeMode, activePath, highlightedNextCodes, selectedCode, selectedNode, graph?.userStudyPlanId, advanceSubject, progressSaving, newlyUnlockedCodes]);

  const MAP_MARGINS = {
    left: 700,    // Espacio a la izquierda
    right: 700,   // Espacio a la derecha
    top: 25,     // Espacio arriba
    bottom: 400,  // Espacio abajo
  };

  const mapExtent = useMemo<CoordinateExtent>(() => {
    // Límites temporales si todavía no hay materias
    if (flowNodes.length === 0) {
      return [
        [-500, -500],
        [500, 500],
      ];
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    flowNodes.forEach((node) => {
      const { x, y } = node.position;

      // Calcular ancho de cada nodo
      const fallbackWidth =
        node.type === 'yearLabel' &&
        typeof node.data.width === 'number'
          ? node.data.width
          : GRAPH_SPACING.nodeWidth;

      const width =
        nodeSizes[node.id]?.width ?? fallbackWidth;

      // Calcular alto de cada nodo
      const height =
        nodeSizes[node.id]?.height ??
        (node.type === 'yearLabel' ? 55 : 110);

      // Detectar los extremos del grafo
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);

      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });

    // Aplicar márgenes independientes
    return [
      [
        minX - MAP_MARGINS.left,
        minY - MAP_MARGINS.top,
      ],
      [
        maxX + MAP_MARGINS.right,
        maxY + MAP_MARGINS.bottom,
      ],
    ];
  }, [flowNodes, nodeSizes]);

  const semesterPanels = useMemo(() => {
    const getPosition = (node: Node) =>
      layout?.positions[node.id] ?? node.position;

    // Agrupar materias según su encabezado de cuatrimestre
    const groups: {
      heading: Node;
      subjects: Node[];
    }[] = [];

    let currentGroup: {
      heading: Node;
      subjects: Node[];
    } | null = null;

    for (const node of baseNodes) {
      if (node.type === 'yearLabel') {
        if (node.data.isYear) {
          currentGroup = null;
        } else {
          currentGroup = {
            heading: node,
            subjects: [],
          };

          groups.push(currentGroup);
        }
      } else if (node.type === 'plan' && currentGroup) {
        currentGroup.subjects.push(node);
      }
    }

    return groups.map(({ heading, subjects }) => {
      const p = getPosition(heading);

      const paddingTop = -12;
      const paddingBottom = 24;

      const panelTop = p.y - paddingTop;

      const headingBottom =
        p.y + (nodeSizes[heading.id]?.height ?? 40);

      const subjectsBottom = subjects.map((subject) => {
        const position = getPosition(subject);
        const height = nodeSizes[subject.id]?.height ?? 100;

        return position.y + height;
      });

      const contentBottom = Math.max(
        headingBottom,
        ...subjectsBottom
      );

      const height = Math.max(
        100,
        contentBottom - panelTop + paddingBottom
      );

      return {
        id: heading.id,
        x: p.x - 24,
        y: panelTop,
        width: GRAPH_SPACING.nodeWidth + 48,
        height,
      };
    });
  }, [baseNodes, layout, nodeSizes]);


  const flowEdges: Edge[] = useMemo(() => {
    if (!displayGraph) return [];

    return displayGraph.edges.map((e) => {
      const highlightedNext = !activeMode && e.source === selectedCode && highlightedNextCodes.has(e.target);
      const newlyUnlocked = !activeMode && e.source === unlockHighlight?.source && newlyUnlockedCodes.has(e.target);
      const leadsToAvailable = !activeMode && byCodeMap.get(e.source)?.status === 'Aprobada'
        && byCodeMap.get(e.target)?.status === 'Disponible';
      const onOptimal = activeMode === 'optimal' && fastPath.edgeSet.has(e.id);
      const onCritical = activeMode === 'critical' && criticalPath.edgeSet.has(e.id);

      // Color de la línea y la punta
      const color = newlyUnlocked ? UNLOCK_COLOR : highlightedNext
        ? HIGHLIGHT_COLOR
        : onOptimal
        ? EDGE_COLORS.optimal
        : onCritical
          ? EDGE_COLORS.critical
          : leadsToAvailable ? AVAILABLE_COLOR : EDGE_COLORS.normal;

      // Grosor de la línea
      const baseWidth = onOptimal
        ? EDGE_WIDTH.optimal
        : onCritical
          ? EDGE_WIDTH.critical
          : EDGE_WIDTH.normal;
      const strokeWidth = highlightedNext || newlyUnlocked ? 1.5 : baseWidth;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'academic',
        data: { sections: layout?.routes[e.id] },
        animated: onOptimal || onCritical,

        // Estilo de la línea
        style: {
          stroke: color,
          strokeWidth,
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
          opacity: activeMode ? (onOptimal || onCritical ? 1 : 0.2) : selectedNode && !highlightedNext && !newlyUnlocked ? DIMMED_OPACITY : 1,
          ...(onOptimal ? { strokeDasharray: '6 3' } : {}),
        },

        // Estilo de la punta
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: ARROW_SIZE.width,
          height: ARROW_SIZE.height,
          markerUnits: 'userSpaceOnUse',
        },
      };
    });
  }, [displayGraph, fastPath, criticalPath, activeMode, selectedCode, highlightedNextCodes, selectedNode, layout, unlockHighlight, newlyUnlockedCodes, byCodeMap]);


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
    if (!displayGraph) return [] as YearGroup[];
    const criticalSet = activeMode === 'critical' ? criticalPath.set : new Set<string>();
    const optimalSet = activeMode === 'optimal' ? fastPath.set : new Set<string>();
    const availableSet = new Set(displayGraph.availableNow ?? []);
    const m = new Map<number, YearGroup>();
    for (const n of displayGraph.nodes) {
      const y = n.year ?? 999;
      const g = m.get(y) ?? { year: y, c1: [], c2: [], anual: [], cuat: [], total: 0, aprobadas: 0, credits: 0, creditsAprob: 0 };
      const data = toPlanNodeData(n, availableSet, criticalSet, optimalSet);
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
  }, [displayGraph, fastPath, criticalPath, activeMode]);

  const requires = useMemo(() => {
    if (!selectedNode || !displayGraph) return [];
    return Array.from(byCodeMap.values()).filter((n) =>
      displayGraph.edges.some((e) => e.target === selectedNode.code && e.source === n.code),
    );
  }, [selectedNode, byCodeMap, displayGraph]);

  const successors = useMemo(() => {
    return Array.from(byCodeMap.values()).filter((n) => highlightedNextCodes.has(n.code));
  }, [byCodeMap, highlightedNextCodes]);

  if (err) {
    return <Alert variant="danger" className="mt-3">{err}</Alert>;
  }

  const renderCard = (d: PlanNodeData, selected: boolean) => {
    const border = nodeBorder(d, selected);
    const pathColor = d.optimal ? EDGE_COLORS.optimal : d.critical ? EDGE_COLORS.critical : undefined;
    return (
      <button
        key={d.code}
        className={!pathColor && d.status === 'Cursando' ? 'plan-node--in-progress' : undefined}
        onClick={() => setPinnedCode((prev) => (prev === d.code ? null : d.code))}
        style={{
          background: pathColor ?? statusColor(d.status),
          color: pathColor ? '#211407' : '#fff',
          opacity: activePath && !activePath.set.has(d.code) ? DIMMED_OPACITY : 1,
          outline: pathColor && selected ? '2px solid #23395d' : undefined,
          outlineOffset: 3,
          border,
          borderRadius: 10,
          padding: '8px 12px',
          minWidth: 200,
          maxWidth: 240,
          flex: '1 1 200px',
          textAlign: 'left',
          boxShadow: d.status === 'Cursando' ? undefined : '0 2px 6px rgba(0,0,0,.2)',
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
      <div
        className="plan-graph"
        style={{
          '--plan-highlight-color': HIGHLIGHT_COLOR,
          '--plan-in-progress-color': IN_PROGRESS_COLOR,
          height: 'calc(100dvh - 118px)',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: 'none',
          margin: '0 auto',
        } as CSSProperties}
      >
        <header className="plan-map-header">
          <div className="plan-map-heading">
            <h1 className="plan-map-heading__title">
              {selectedPlan?.name ?? 'Plan de estudios'}
            </h1>
            <p className="plan-map-heading__subtitle">
              {selectedPlan ? `${careerName(selectedPlan)} · ` : ''}
              {view === 'grafo' ? 'mapa de correlatividades' : 'tablero de avance'}
            </p>
            {displayGraph && (
              <p className="small text-secondary mt-1 mb-0">
                <strong>{displayGraph.stats.total}</strong> {displayGraph.stats.total === 1 ? 'materia' : 'materias'}
              </p>
            )}
          </div>
        </header>

        <div className="plan-map-toolbar">
          {plans.length > 0 && (
            <Form.Select
              size="sm"
              className="plan-map-header__select"
              value={id ?? ''}
              onChange={(e) => changeCareer(e.target.value)}
              aria-label="Cambiar plan de estudios"
            >
              {plans
                .filter((p) => p._id === id || enrollments.includes(p._id))
                .map((p) => (
                  <option key={p._id} value={p._id}>{p.name} — {careerName(p)}</option>
                ))}
            </Form.Select>
          )}
          {selectedPlan?.intermediateTitle && (
            <div className="d-flex gap-1" role="tablist" aria-label="Vista del plan">
              <Button
                size="sm"
                role="tab"
                aria-selected={tab === 'lic'}
                variant={tab === 'lic' ? 'primary' : 'outline-primary'}
                onClick={() => { setTab('lic'); setPinnedCode(null); setPathMode(null); }}
              >
                Licenciatura
              </Button>
              <Button
                size="sm"
                role="tab"
                aria-selected={tab === 'tec'}
                variant={tab === 'tec' ? 'primary' : 'outline-primary'}
                style={tab === 'tec' ? { background: instituteGradientTec(planBaseColor), borderColor: 'transparent' } : undefined}
                onClick={() => { setTab('tec'); setPinnedCode(null); setPathMode(null); }}
                title={interCodes ? `${interCodes.size} materias de la tecnicatura` : selectedPlan.intermediateTitle}
              >
                Tecnicatura
              </Button>
            </div>
          )}

          <div className="d-flex flex-wrap align-items-center gap-2 ms-auto" role="group" aria-label="Navegación y caminos del plan">
            <Button variant="outline-secondary" size="sm" onClick={() => navigate('/')}>← Volver</Button>
            <Button
              variant={activeMode === 'critical' ? 'warning' : 'outline-secondary'}
              size="sm"
              aria-pressed={activeMode === 'critical'}
              aria-describedby="plan-path-help"
              disabled={criticalPath.chain.length === 0}
              style={activeMode === 'critical' ? { background: EDGE_COLORS.critical, borderColor: EDGE_COLORS.critical, color: '#211407' } : undefined}
              title="Ver la secuencia de materias pendientes que más tiempo requiere en todo el plan"
              onClick={() => setPathMode(mode => mode === 'critical' ? null : 'critical')}
            >
              Camino crítico
            </Button>
            <Button
              variant={pathMode === 'optimal' ? 'warning' : 'outline-secondary'}
              size="sm"
              aria-pressed={pathMode === 'optimal'}
              aria-describedby="plan-path-help"
              disabled={!displayGraph?.nodes.length}
              style={pathMode === 'optimal' ? { background: EDGE_COLORS.optimal, borderColor: EDGE_COLORS.optimal, color: '#211407' } : undefined}
              title={pathMode === 'optimal' ? 'Desactivar el camino óptimo' : 'Activar y elegir una materia para ver cómo llegar a aprobarla'}
              onClick={() => setPathMode(mode => mode === 'optimal' ? null : 'optimal')}
            >
              Camino óptimo
            </Button>
          </div>
        </div>

        {err && <Alert variant="danger" className="mx-3">{err}</Alert>}
        {progressError && <Alert variant="warning" className="mx-3" dismissible onClose={() => setProgressError(null)}>{progressError}</Alert>}
        {criticalPath.hasCycle && <Alert variant="warning" className="mx-3 py-1 small">Hay un ciclo entre las correlativas pendientes. No se puede calcular el camino crítico.</Alert>}
        <div id="plan-path-help" className="mx-3 mb-2 small" role="status">
          {activePath ? (
            <>
              <div>
                <strong>{activeMode === 'critical' ? 'Camino crítico: mirá el plan completo.' : `Camino óptimo: cómo llegar a ${selectedNode?.name}.`}</strong>{' '}
                {activeMode === 'critical'
                  ? 'Resalta la secuencia de materias pendientes que más tiempo requiere. Cada una habilita la siguiente: retrasar esta secuencia puede demorar la finalización del plan.'
                  : 'Resalta la secuencia de correlativas que más tiempo requiere hasta aprobar la materia elegida, incluyéndola. Te permite identificar por dónde empezar.'}
              </div>
              <div className="text-muted">
                Tiempo estimado de esta secuencia: <strong>≈ {activePath.cost} {activePath.cost === 1 ? 'cuatrimestre' : 'cuatrimestres'}</strong>.
                {' '}Supone que avanzás con las otras correlativas en paralelo; también tenés que cumplirlas.
                {' '}Volvé a pulsar el botón activo para recuperar los colores de estado.
              </div>
            </>
          ) : pathMode === 'optimal' ? (
            <div className="rounded px-3 py-2" style={{ background: 'rgba(217,135,11,.12)', borderLeft: `3px solid ${EDGE_COLORS.optimal}` }}>
              <strong>Camino óptimo activado.</strong>{' '}
              {displayGraph?.nodes.every(node => node.status === 'Aprobada')
                ? 'Ya aprobaste todas las materias de esta vista. No quedan recorridos pendientes.'
                : selectedNode?.status === 'Aprobada'
                  ? `Ya aprobaste ${selectedNode.name}. Elegí otra materia para ver cómo llegar a aprobarla.`
                  : fastPath.hasCycle
                    ? 'Las correlativas de esta materia forman un ciclo y no permiten calcular el recorrido. Podés elegir otra materia.'
                    : `Hacé clic en una materia ${view === 'grafo' ? 'del mapa' : 'del tablero'} para ver el recorrido hasta aprobarla y su tiempo estimado.`}
              {' '}Para salir, volvé a pulsar «Camino óptimo».
            </div>
          ) : (
            <span className="text-muted">
              <strong>Camino crítico:</strong> qué secuencia de materias puede demorar la finalización del plan.
              {' '}<strong>Camino óptimo:</strong> activá el botón y elegí una materia para ver cómo llegar a aprobarla.
            </span>
          )}
        </div>
        {view === 'grafo' && layoutError && <Alert variant="warning" className="mx-3">No se pudieron optimizar las flechas. Se muestran conexiones ortogonales simples. {layoutError}</Alert>}
        {id && !selectedPlan && plans.length > 0 && <Alert variant="warning" className="mx-3">Seleccioná un plan válido. Los enlaces antiguos de carrera ya no corresponden al grafo.</Alert>}
        {displayGraph && displayGraph.edges.length === 0 && <Alert variant="info" className="mx-3 py-1 small">No hay correlatividades vinculadas todavía. Podés agregarlas desde Administrar plan.</Alert>}
        {graph?.intermediate && graph.intermediate.total > 0 && (
          <IntermediateBanner intermediate={graph.intermediate} />
        )}
        {tab === 'tec' && (
          <Alert variant="info" className="mx-3 py-1 small">
            Vista de tecnicatura: tu avance acá cuenta para ambas titulaciones.
          </Alert>
        )}

        {tecEmpty && (
          <Alert variant="warning" className="mx-3">
            La tecnicatura de este plan todavía no tiene materias marcadas.
            El administrador las marca desde Editar plan.
          </Alert>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: '0 8px 8px' }}>
          {displayGraph && !tecEmpty && (
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
                <span className="small fw-semibold text-secondary me-1" style={{ whiteSpace: 'nowrap' }}>Estados</span>
                {STATUS_LEGEND.map((l) => (
                  <span
                    key={l.label}
                    className="d-inline-flex align-items-center gap-1"
                    style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--bs-body-color)' }}
                  >
                    <span className="d-inline-flex" aria-hidden="true"><SubjectStatusIcon status={l.status} /></span>
                    {l.label}
                    <strong className="plan-state-count">{displayGraph.stats[l.stat]}</strong>
                  </span>
                ))}
                {activeMode && (
                  <span className="d-inline-flex align-items-center gap-1 border-start ps-3" style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--bs-body-color)' }}>
                    <svg width="28" height="16" viewBox="0 0 28 16" fill="none" aria-hidden="true" style={{ color: EDGE_COLORS[activeMode] }}>
                      <path d="M1 8h24m-6-5 6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {activeMode === 'critical' ? 'Camino crítico' : 'Camino óptimo'}
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 400, position: 'relative', height: '100%' }}>
            {view === 'grafo' && graph && !tecEmpty && (
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                translateExtent={mapExtent}
                onNodeClick={(_, node) => {
                  if (node.type === 'yearLabel') return;
                  setPinnedCode((prev) => (prev === node.id ? null : node.id));
                }}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.38}
                nodesDraggable={false}
                panOnDrag={true}
                nodeClickDistance={7}
                defaultEdgeOptions={{
                  type: 'academic',
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  background: graphBackground.color,
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                <ViewportPortal>
                  {semesterPanels.map(panel => <div key={panel.id} className="plan-semester-panel" aria-hidden="true"
                    style={{ left: panel.x, top: panel.y, width: panel.width, height: panel.height }} />)}
                </ViewportPortal>
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={GRAPH_BACKGROUND.dotsGap}
                  size={GRAPH_BACKGROUND.dotsSize}
                  color={graphBackground.dotsColor}
                  bgColor={graphBackground.color}
                />
                <Controls position="bottom-left" />
                <LayoutViewport layout={layout} />
              </ReactFlow>
            )}

          {view === 'tablero' && graph && !tecEmpty && (
            <div style={{ height: '100%', overflow: 'auto', padding: '4px 12px 20px' }}>
              {boardGroups.map((g) => (
                <div
                  key={g.year}
                  className="card mb-3"
                  style={{ borderLeft: `5px solid ${planBaseColor}`, borderRadius: 10 }}
                >
                  <div className="card-body py-2 px-3 d-flex flex-wrap align-items-center gap-3">
                    <div className="fw-bold" style={{ color: planBaseColor, minWidth: 90 }}>
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

          {displayGraph && pinnedCode && (
            <DetailPanel
              graph={displayGraph}
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
