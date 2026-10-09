export type CareerStatus = 'draft' | 'published';

export interface Career {
  _id: string;
  name: string;
  institute?: string;
  color?: string;
  planResolution?: string;
  ruleCode?: string;
  durationYears?: number;
  creditsFinal?: number;
  creditsIntermediate?: number;
  intermediateTitle?: string | null;
  status?: CareerStatus;
  subjectCount?: number;
  description?: string;
  university?: string | { _id: string; name: string } | null;
  academicUnit?: string | null;
  createdAt?: string;
  updatedAt?: string;
  reused?: boolean;
}

export type SubjectKind = 'Materia' | 'ACA' | 'AU' | 'OTRA';
export type SubjectStatus = 'Aprobada' | 'Regular' | 'Cursando' | 'Pendiente';

export interface Hours {
  his: number;
  hit: number;
  hite: number;
  hip: number;
  htat: number;
  ht: number;
}

export interface Subject {
  _id: string;
  careerId: string;
  code: string;
  name: string;
  year: number | null;
  cuatrimestre: number | null;
  duration: 'C' | 'A' | 'TF';
  hours: Hours;
  credits: number;
  kind: SubjectKind;
  generic?: string | null;
  optional: boolean;
  intermediate?: boolean;
  requires: string[];
}

export interface ParsedSubject {
  code: string;
  name: string;
  year: number | null;
  cuatrimestre: number | null;
  duration: 'C' | 'A' | 'TF';
  credits: number;
  kind: SubjectKind;
  optional?: boolean;
  intermediate?: boolean;
  status?: SubjectStatus;
  nota?: number | null;
  fecha?: string | null;
  origen?: string | null;
}

export interface ProgressEntry {
  _id?: string;
  subjectCode: string;
  status: SubjectStatus;
  nota: number | null;
  fecha: string | null;
  origen: string | null;
  extraRequires?: string[];
}

export interface ProgressSummary {
  creditsTotal: number;
  creditsAprobados: number;
  aprobadas: number;
  total: number;
}

export interface GraphNode {
  id: string;
  code: string;
  name: string;
  year: number | null;
  cuatrimestre: number | null;
  duration?: 'C' | 'A' | 'TF' | null;
  credits: number;
  kind: SubjectKind;
  optional: boolean;
  intermediate?: boolean;
  status: SubjectStatus;
  position: { x: number; y: number };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphStats {
  total: number;
  aprobadas: number;
  disponibles: number;
  pendientes: number;
  enCurso: number;
  regulares: number;
  creditsTotal: number;
  creditsAprobados: number;
}

export interface IntermediateProgress {
  title?: string | null;
  total: number;
  aprobadas: number;
  credits: number;
  creditsAprob: number;
}

export interface GraphData {
  title: string;
  color?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  availableNow: string[];
  criticalPath: string[];
  hasCycle: boolean;
  topologicalOrder: string[];
  stats: GraphStats;
  intermediate?: IntermediateProgress;
}

export type CorrelativasMatchConfidence = 'exact' | 'compact' | 'fuzzy' | null;

export interface CorrelativasRow {
  num: number;
  parsedCode: string;
  name: string;
  matched: boolean;
  dbCode: string | null;
  dbName: string | null;
  confidence: CorrelativasMatchConfidence;
  requires: string[];
}

export interface CorrelativasAiSuggestion {
  code: string;
  requires: string[];
  confidence: 'exact' | 'compact';
  evidence?: string | null;
}

export interface CorrelativasAiReview {
  code: string | null;
  subject: string;
  subjectConfidence: 'exact' | 'compact' | 'fuzzy' | 'prefix' | null;
  requires: { code: string; name: string; confidence: 'exact' | 'compact' | 'fuzzy' | 'prefix' | null }[];
  evidence?: string | null;
}

export interface ParseCorrelativasResponse {
  sourceKind: string;
  total: number;
  careerSubjects: number;
  matchedCount: number;
  partial: boolean;
  subjects: CorrelativasRow[];
  unresolved: CorrelativasRow[];
  aiSuggested?: CorrelativasAiSuggestion[];
  aiReview?: CorrelativasAiReview[];
  aiUnresolved?: string[];
  aiFallback?: boolean;
  aiProvider?: string | null;
  aiCoverage?: { extraidos: number; total: number } | null;
}

export interface SugerenciaMensaje {
  regla: string;
  texto: string;
}

export interface Sugerencias {
  materiasA: { C1: string[]; C2: string[]; C3: string[]; C5?: string[] };
  materiasB: { regla: string; count: number }[];
  disponibles: { code: string; name: string; critica: boolean }[];
  finalesPendientes: { code: string; name: string }[];
  comunesDisponibles: { code: string; name: string }[];
  ritmo: { ultimos12Meses: number; regularizadas: number; sugeridas: number };
  mensajes: SugerenciaMensaje[];
}