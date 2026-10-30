export interface ConfirmPayloadInput {
  fileHash: string;
  fileName: string;
  careerId: string;
  name: string;
  subjects: readonly unknown[];
  creditsFinal?: number;
  creditsIntermediate?: number;
  intermediateTitle?: string | null;
  official?: boolean;
}

// Body de POST /plan-imports/confirm. Solo un ADMIN puede publicar el plan
// como oficial; el backend vuelve a validar el rol.
export function buildConfirmPayload(input: ConfirmPayloadInput) {
  return {
    fileHash: input.fileHash,
    fileName: input.fileName,
    careerId: input.careerId,
    name: input.name,
    subjects: input.subjects,
    creditsFinal: input.creditsFinal ?? 0,
    creditsIntermediate: input.creditsIntermediate ?? 0,
    intermediateTitle: input.intermediateTitle ?? null,
    official: input.official === true,
  };
}
