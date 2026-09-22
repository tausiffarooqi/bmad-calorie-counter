// EstimationProvider port (AD-2). The single interface every calorie
// estimation adapter implements. `estimate()`'s insufficient-detail branch
// is always a return value — never a thrown exception; only a genuine call
// failure (network, API error) throws (Boundaries & Constraints).
//
// Photo variant (Story 2.2): `base64` is the already-compressed JPEG
// payload (client-side compression owns the size/format guarantees — see
// lib/compress-image.ts) and is only ever passed through to the Gemini call;
// it is never written to disk, the DB, or Supabase Storage (AD-4).
export type EstimationInput =
  | { mode: "text"; description: string }
  | { mode: "photo"; base64: string; mimeType: string };

export type EstimationResult =
  | { ok: true; description: string; calories: number }
  | { ok: false; reason: "insufficient_detail" };

export interface EstimationProvider {
  estimate(input: EstimationInput): Promise<EstimationResult>;
}
