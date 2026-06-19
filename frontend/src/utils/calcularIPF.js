// Fórmulas oficiales IPF — espejo de backend/src/utils/calcularIPF.js (mantener sincronizado).
// Constantes verificadas contra OpenPowerlifting.
//   isFemale: bool  ·  equipped: bool  ·  total y bodyWeight en kg.
// El ranking de premiación lo calcula el backend; estas son para paridad/display.

const GL_COEF = {
  M: {
    raw: { A: 1199.72839, B: 1025.18162, C: 0.00921 },
    eq: { A: 1236.25115, B: 1449.21864, C: 0.01644 },
  },
  F: {
    raw: { A: 610.32796, B: 1045.59282, C: 0.03048 },
    eq: { A: 758.63878, B: 949.31382, C: 0.02435 },
  },
};

const IPF_COEF = {
  M: {
    raw: { m1: 310.67, m2: 857.785, d1: 53.216, d2: 147.0835 },
    eq: { m1: 387.265, m2: 1121.28, d1: 80.6324, d2: 222.4896 },
  },
  F: {
    raw: { m1: 125.1435, m2: 228.03, d1: 34.5246, d2: 86.8301 },
    eq: { m1: 176.58, m2: 373.315, d1: 48.4534, d2: 110.0103 },
  },
};

// GL = total * 100 / (A - B * e^(-C * bw))
export function Calculate_IPF_GL(bodyWeight, weightLifted, isFemale, equipped = false) {
  if (!(weightLifted > 0) || !(bodyWeight > 0)) return 0;
  const c = GL_COEF[isFemale ? "F" : "M"][equipped ? "eq" : "raw"];
  const denom = c.A - c.B * Math.exp(-c.C * bodyWeight);
  if (!(denom > 0)) return 0;
  return (weightLifted * 100) / denom;
}

// IPF = 500 + 100 * (total - media) / desvio
export function Calculate_IPF_Points(bodyWeight, weightLifted, isFemale, equipped = false) {
  if (!(weightLifted > 0) || !(bodyWeight > 0)) return 0;
  const c = IPF_COEF[isFemale ? "F" : "M"][equipped ? "eq" : "raw"];
  const lnbw = Math.log(bodyWeight);
  const media = c.m1 * lnbw - c.m2;
  const desvio = c.d1 * lnbw - c.d2;
  if (!(desvio > 0)) return 0;
  return 500 + (100 * (weightLifted - media)) / desvio;
}
