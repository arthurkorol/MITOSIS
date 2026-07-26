/**
 * GLSL-переопределения шейдерных чанков PlayCanvas 2.21.
 *
 * Точка деформации: чанк `transformVS` (см. node_modules/.../common/vert/transform.js) —
 * его evalWorldPosition владеет localPos до умножения на модельную матрицу.
 * Атрибуты в GLSL неизменяемы, поэтому смещение делаем в копии этого чанка.
 * Для сферы нормаль в объектном пространстве = normalize(position) — атрибут нормали не нужен.
 */

export const CHUNKS_VERSION = '2.21';

const VALUE_NOISE = /* glsl */ `
float mvHash(vec3 p) {
  p = fract(p * 0.3183 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float mvNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(mvHash(i), mvHash(i + vec3(1, 0, 0)), u.x),
        mix(mvHash(i + vec3(0, 1, 0)), mvHash(i + vec3(1, 1, 0)), u.x), u.y),
    mix(mix(mvHash(i + vec3(0, 0, 1)), mvHash(i + vec3(1, 0, 1)), u.x),
        mix(mvHash(i + vec3(0, 1, 1)), mvHash(i + vec3(1, 1, 1)), u.x), u.y),
    u.z);
}
`;

/** Обёртка: копия штатного transformVS с инъекцией смещения localPos. */
function transformChunk(declarations: string, displace: string): string {
  return /* glsl */ `
#ifdef PIXELSNAP
uniform vec4 uScreenSize;
#endif
#ifdef SCREENSPACE
uniform float projectionFlipY;
#endif
${declarations}
vec4 evalWorldPosition(vec3 vertexPosition, mat4 modelMatrix) {
  vec3 localPos = getLocalPosition(vertexPosition);
  ${displace}
  vec4 posW = modelMatrix * vec4(localPos, 1.0);
  #ifdef SCREENSPACE
    posW.zw = vec2(0.0, 1.0);
  #endif
  return posW;
}
vec4 getPosition() {
  dModelMatrix = getModelMatrix();
  vec4 posW = evalWorldPosition(vertex_position.xyz, dModelMatrix);
  dPositionW = posW.xyz;
  vec4 screenPos;
  #ifdef SCREENSPACE
    screenPos = posW;
    screenPos.y *= projectionFlipY;
  #else
    screenPos = matrix_viewProjection * posW;
  #endif
  return screenPos;
}
vec3 getWorldPosition() {
  return dPositionW;
}
`;
}

/**
 * Тело существа: мягкая «живость» поверхности — две октавы value noise
 * с разными скоростями. Амплитуда намеренно небольшая: тело в Spore гладкое
 * и глянцевое, а не бурлящее. uPulse — всплеск при поедании.
 */
export const MEMBRANE_TRANSFORM_VS = transformChunk(
  /* glsl */ `
uniform float uTime;
uniform float uPulse;
${VALUE_NOISE}
float membraneDisp(vec3 p) {
  float d = 0.030 * mvNoise(p * 1.6 + vec3(0.0, uTime * 0.3, 0.0))
          + 0.014 * mvNoise(p * 3.2 + vec3(uTime * 0.55));
  return d * (1.0 + 1.6 * uPulse);
}
`,
  /* glsl */ `
  localPos += normalize(localPos) * membraneDisp(localPos);
`,
);

/**
 * Жгутики: бегущая волна по ленте. В vertex_position.w упакованы
 * номер ленты (целая часть) и параметр длины s (дробная): w = ribbon + s·0.98.
 */
export const FLAGELLA_TRANSFORM_VS = transformChunk(
  /* glsl */ `
uniform float uTime;
uniform float uSpeed;
`,
  /* glsl */ `
  float packedW = vertex_position.w;
  float fs = fract(packedW) / 0.98;
  float fPhase = floor(packedW) * 2.094;
  float omega = mix(3.8, 13.8, uSpeed);
  float amp = 0.35 * fs * mix(0.5, 1.0, uSpeed);
  localPos.x += amp * sin(fs * 15.7 - uTime * omega + fPhase);
  localPos.y += 0.10 * fs * sin(fs * 9.4 - uTime * omega * 0.8 + fPhase);
`,
);
