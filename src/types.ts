export interface SimulationSettings {
  toySides: number;
  toyRadius: number;
  toyHeight: number;
  toyEdgeThickness: number;
  rampHeight: number;
  rampAngleDeg: number;
  mew: number;
  isUnevenTerrain: boolean;
  waveHeight: number;
  isPaused: boolean;
  isCameraLocked: boolean;
  soundEnabled: boolean;
  isAutoRolling: boolean;
}

export interface PhysicsStats {
  flips: number;
  speed: number;
  state: "อยู่นิ่ง (Resting)" | "กลิ้งตีลังกา (Flipping)" | "ไถลสไลด์ (Sliding)" | "กำลังคลานขยับ (Crawling)" | "⏸️ หยุดเวลา (Paused)";
  slantAngle: number;
  onRamp: boolean;
}
