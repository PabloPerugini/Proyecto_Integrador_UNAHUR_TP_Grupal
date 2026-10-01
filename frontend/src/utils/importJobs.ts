// Helpers de jobs de importación (Fase 5 §11.5): el generador de id estaba
// copiado byte a byte en UploadPlan y MyProgress.
export function makeJobId(fileName: string): string {
  return `${fileName}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
