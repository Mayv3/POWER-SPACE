function calcDOTS(sexo, peso_corporal, total) {
  const coef =
    sexo === "Masculino"
      ? { a: -216.0475144, b: 16.2606339, c: -0.002388645, d: -0.00113732, e: 7.01863e-06, f: -1.291e-08 }
      : { a: 594.31747775582, b: -27.23842536447, c: 0.82112226871, d: -0.00930733913, e: 0.00004731582, f: -0.00000009054 };

  const denom = coef.a +
    coef.b * peso_corporal +
    coef.c * Math.pow(peso_corporal, 2) +
    coef.d * Math.pow(peso_corporal, 3) +
    coef.e * Math.pow(peso_corporal, 4) +
    coef.f * Math.pow(peso_corporal, 5);

  return (total * 500) / denom;
}
export default calcDOTS;