// src/lib/textile.js
// Standard textile industry conversions.
// GSM (grams per square meter) from GLM (grams per linear meter) and width:
//   GSM = GLM / (Width_inches × 0.0254)
// OZ (ounces per square yard) from GSM:
//   OZ = GSM × 0.02952

export function calcGSM(glm, widthInches) {
  const g = Number(glm) || 0;
  const w = Number(widthInches) || 0;
  if (w <= 0) return 0;
  return g / (w * 0.0254);
}

export function calcOZ(gsm) {
  return (Number(gsm) || 0) * 0.02952;
}

export function calcGsmAndOz(glm, widthInches) {
  const gsm = calcGSM(glm, widthInches);
  const oz = calcOZ(gsm);
  return { gsm: Math.round(gsm * 100) / 100, oz: Math.round(oz * 100) / 100 };
}
