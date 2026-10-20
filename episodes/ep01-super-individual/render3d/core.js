import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export const W = 1080, H = 1920;
export const glCanvas = document.createElement('canvas'); glCanvas.width = W; glCanvas.height = H;
export const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

export function makeComposer(scene, camera, { bloom = .85, radius = .55, threshold = .55 } = {}) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bp = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), bloom, radius, threshold);
  composer.addPass(bp);
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uExposure: { value: 1 }, uVig: { value: 1 }, uCA: { value: 1 }, uFade: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime,uExposure,uVig,uCA,uFade; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
      float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233))+uTime*7.13)*43758.5453); }
      void main(){
        vec2 c=vUv-.5; float r=length(c*vec2(.5625,1.));
        vec2 off=c*0.0035*uCA*(.3+r*2.);
        vec3 col=vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
        col*=uExposure;
        col=aces(col);
        // warm shadows, slightly cool lift — ink & gold grade
        col=mix(col, col*vec3(1.04,.98,.9), .6);
        col+=vec3(.012,.010,.009);
        col=pow(col,vec3(1./2.2));
        float vig=smoothstep(.95,.25,r*1.25); col*=mix(1.,vig,.75*uVig);
        float g=h(vUv*vec2(1080.,1920.))-.5; col+=g*.045;
        col*=1.-uFade;
        gl_FragColor=vec4(col,1.);
      }` });
  composer.addPass(grade);
  return { composer, bloomPass: bp, grade };
}

// ---------- point-cloud material with fake DOF, rim light ----------
export function pointsMaterial(extraUniforms = {}, vertexBody, fragmentBody = '') {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({ uPx: { value: 1 }, uFocus: { value: 7 }, uAperture: { value: .02 }, uTime: { value: 0 } }, extraUniforms),
    vertexShader: `
      uniform float uPx,uFocus,uAperture,uTime;
      varying vec3 vCol; varying float vA;
      vec3 hash3(float n){ return fract(sin(vec3(n,n+1.7,n+3.1))*vec3(43758.5453,22578.145,19642.349)); }
      ${vertexBody.decl || ''}
      void main(){
        vec3 P; vec3 COL; float A; float S;
        ${vertexBody.main}
        vec4 mv=modelViewMatrix*vec4(P,1.);
        gl_Position=projectionMatrix*mv;
        float z=-mv.z;
        float base=S*uPx/z;
        float coc=uAperture*abs(z-uFocus)/z*uPx*0.06;
        float sz=max(base,coc); sz=clamp(sz,1.2,48.);
        gl_PointSize=sz;
        vA=A*min(1.,(base*base+1.)/(sz*sz+1.)*1.0); vCol=COL;
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vA;
      void main(){ vec2 c=gl_PointCoord-.5; float d=length(c); float a=smoothstep(.5,.15,d); ${fragmentBody}
        gl_FragColor=vec4(vCol*vA*a,1.); }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
}
export function pxScale(camera) { return H / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)); }

// ---------- environment for metal ----------
export function makeEnv() {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.BackSide })));
  const panel = (w, h, col, x, y, z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  panel(9, 5, new THREE.Color(3.2, 2.5, 1.6), -6, 7, 6);      // warm key softbox
  panel(1.2, 14, new THREE.Color(4.0, 3.0, 1.6), 9, 1, -2);   // warm strip
  panel(8, 1.0, new THREE.Color(.6, .75, 1.1), 0, -6, -8);    // cool rim
  panel(14, .5, new THREE.Color(2.2, 1.8, 1.2), 0, 9, -5);    // top line
  panel(12, 5, new THREE.Color(1.3, 1.0, .7), 3, 4, 12);      // broad fill behind camera
  panel(.6, 12, new THREE.Color(3.5, 2.8, 1.8), -5, 0, 10);  // vertical strip for a moving streak
  const env = pm.fromScene(s, 0.035).texture; pm.dispose(); return env;
}

// ---------- 庖丁's knife ----------
export function makeKnife(env) {
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  sh.moveTo(0, .16); sh.lineTo(1.25, .15); sh.quadraticCurveTo(1.55, .12, 1.68, -.02);
  sh.quadraticCurveTo(1.35, -.16, .9, -.18); sh.lineTo(0, -.18); sh.lineTo(0, .16);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: .012, bevelEnabled: true, bevelThickness: .012, bevelSize: .01, bevelSegments: 3, curveSegments: 24 });
  geo.translate(0, 0, -.006);
  { const pos = geo.attributes.position, uv = geo.attributes.uv; geo.computeVertexNormals(); const nr = geo.attributes.normal; for (let i = 0; i < pos.count; i++) { const cap = Math.abs(nr.getZ(i)) > .5; uv.setXY(i, pos.getX(i) / 1.7, cap ? (pos.getY(i) + .2) / .4 : .12); } uv.needsUpdate = true; }
  const tc = document.createElement('canvas'); tc.width = 1024; tc.height = 256; const tx = tc.getContext('2d');
  const lg = tx.createLinearGradient(0, 0, 0, 256); // canvas y=0 is uv v=1 (spine)
  lg.addColorStop(0, '#3a3836'); lg.addColorStop(.08, '#55524d'); lg.addColorStop(.55, '#8a857c'); lg.addColorStop(.8, '#b9b3a7'); lg.addColorStop(.86, '#efe9dd'); lg.addColorStop(.9, '#fffaf0'); lg.addColorStop(1, '#d9d2c4');
  tx.fillStyle = lg; tx.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 1400; i++) { const y = Math.random() * 256; tx.globalAlpha = .05 + Math.random() * .08; tx.fillStyle = Math.random() < .5 ? '#000' : '#fff'; tx.fillRect(Math.random() * 1024, y, 60 + Math.random() * 400, 1); }
  tx.globalAlpha = .5; tx.strokeStyle = '#2a2724'; tx.lineWidth = 2; tx.beginPath(); tx.moveTo(0, 210); tx.bezierCurveTo(500, 214, 800, 200, 990, 150); tx.stroke(); // grind line
  const btex = new THREE.CanvasTexture(tc); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 4;
  const blade = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: btex, color: 0xffffff, metalness: .85, roughness: .3, envMap: env, envMapIntensity: 2.0 }));
  g.add(blade);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.05, .058, .62, 24), new THREE.MeshStandardMaterial({ color: 0x1a110b, metalness: .1, roughness: .55, envMap: env, envMapIntensity: .6 }));
  handle.rotation.z = Math.PI / 2; handle.position.set(-.33, -.01, 0); g.add(handle);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.066, .066, .05, 24), new THREE.MeshStandardMaterial({ color: 0xc9a14a, metalness: 1, roughness: .3, envMap: env, envMapIntensity: 1.4 }));
  ring.rotation.z = Math.PI / 2; ring.position.set(-.02, -.01, 0); g.add(ring);
  g.userData.blade = blade;
  return g;
}

// soft radial sprite texture
export function radialTex(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, col]) => gr.addColorStop(o, col));
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); return t;
}
export function starTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const gr = x.createRadialGradient(256, 256, 0, 256, 256, 120); gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(.15, 'rgba(255,225,160,.5)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
  x.globalCompositeOperation = 'lighter';
  for (const [w, h, a] of [[512, 6, .9], [6, 300, .6]]) { const g2 = x.createLinearGradient(256 - w / 2, 0, 256 + w / 2, 0);
    const lg = w > h ? x.createLinearGradient(0, 0, 512, 0) : x.createLinearGradient(0, 256 - h / 2, 0, 256 + h / 2);
    lg.addColorStop(0, 'rgba(255,230,180,0)'); lg.addColorStop(.5, `rgba(255,245,220,${a})`); lg.addColorStop(1, 'rgba(255,230,180,0)');
    x.fillStyle = lg; x.fillRect(256 - w / 2, 256 - h / 2, w, h); }
  return new THREE.CanvasTexture(c);
}

// keyframe interpolation helper: keys = [[t, value(Array)], ...]
export function track(keys, t, ez = x => x * x * (3 - 2 * x)) {
  if (t <= keys[0][0]) return keys[0][1].slice();
  for (let i = 0; i < keys.length - 1; i++) { const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) { const k = ez((t - t0) / (t1 - t0)); return a.map((v, j) => v + (b[j] - v) * k); } }
  return keys[keys.length - 1][1].slice();
}
