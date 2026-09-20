export interface User {
  _id: string;
  nickName: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  nickName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
}

export type CareerStatus = 'draft' | 'published';

export interface Career {
  _id: string;
  name: string;
  institute?: string;
  color?: string;
  durationYears?: number;
  creditsFinal?: number;
  creditsIntermediate?: number;
  intermediateTitle?: string | null;
  status: CareerStatus;
  subjectCount?: number;
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

export interface ParseCorrelativasResponse {
  total: number;
  careerSubjects: number;
  matchedCount: number;
  partial: boolean;
  subjects: CorrelativasRow[];
  unresolved: CorrelativasRow[];
}