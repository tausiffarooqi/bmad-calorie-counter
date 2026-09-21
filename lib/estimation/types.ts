// EstimationProvider port (AD-2). The single interface every calorie
// estimation adapter implements. `estimate()`'s insufficient-detail branch
// is always a return value — never a thrown exception; only a genuine call
// failure (network, API error) throws (Boundaries & Constraints).
//
// Text-only input shape for now — Story 2.2 broadens `EstimationInput` to
// include a photo variant; no photo shape is invented speculatively here.
export type EstimationInput = {
  mode: "text";
  description: string;
};

export type EstimationResult =
  | { ok: true; description: string; calories: number }
  | { ok: false; reason: "insufficient_detail" };

export interface EstimationProvider {
  estimate(input: EstimationInput): Promise<EstimationResult>;
}
