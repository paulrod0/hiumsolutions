// ─── GLSL SIMPLEX NOISE ───────────────────────────────────────────────────────
const NOISE_GLSL = `
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m = max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0*fract(p*C.www)-1.0;
    vec3 h = abs(x)-0.5;
    vec3 ox = floor(x+0.5);
    vec3 a0 = x-ox;
    m *= 1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x  = a0.x*x0.x  + h.x*x0.y;
    g.yz = a0.yz*x12.xz + h.yz*x12.yw;
    return 130.0*dot(m,g);
  }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0,1.0/3.0);
    const vec4 D = vec4(0.0,0.5,1.0,2.0);
    vec3 i  = floor(v+dot(v,C.yyy));
    vec3 x0 = v-i+dot(i,C.xxx);
    vec3 g = step(x0.yzx,x0.xyz);
    vec3 l = 1.0-g;
    vec3 i1 = min(g.xyz,l.zxy);
    vec3 i2 = max(g.xyz,l.zxy);
    vec3 x1 = x0-i1+C.xxx;
    vec3 x2 = x0-i2+2.0*C.xxx;
    vec3 x3 = x0-1.0+3.0*C.xxx;
    i = mod(i,289.0);
    vec4 p = permute(permute(permute(
      i.z+vec4(0.0,i1.z,i2.z,1.0))
      +i.y+vec4(0.0,i1.y,i2.y,1.0))
      +i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_*D.wyz-D.xzx;
    vec4 j = p-49.0*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j-7.0*x_);
    vec4 x = x_*ns.x+ns.yyyy;
    vec4 y = y_*ns.x+ns.yyyy;
    vec4 h = 1.0-abs(x)-abs(y);
    vec4 b0 = vec4(x.xy,y.xy);
    vec4 b1 = vec4(x.zw,y.zw);
    vec4 s0 = floor(b0)*2.0+1.0;
    vec4 s1 = floor(b1)*2.0+1.0;
    vec4 sh = -step(h,vec4(0.0));
    vec4 a0 = b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = 1.79284291400159-0.85373472095314*vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m2 = max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m2 = m2*m2;
    return 42.0*dot(m2*m2,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`;
// ─── SIMPLE VALUE NOISE (para movimiento del anillo) ─────────────────────────
class ValueNoise {
    constructor() {
        this.MAX = 256;
        this.MASK = this.MAX - 1;
        this.r = Array.from({ length: this.MAX }, () => Math.random());
    }
    getVal(t) {
        const ts = t;
        const i = Math.floor(ts);
        const f = ts - i;
        const u = f * f * (3 - 2 * f);
        const a = i & this.MASK;
        const b = (a + 1) & this.MASK;
        return this.r[a] * (1 - u) + this.r[b] * u;
    }
}
// ─── POISSON DISK SAMPLING (simplificado) ────────────────────────────────────
function poissonDisk(width, height, minDist, tries = 20) {
    const cellSize = minDist / Math.SQRT2;
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const grid = new Array(cols * rows).fill(null);
    const active = [];
    const points = [];
    function addPoint(x, y) {
        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);
        grid[row * cols + col] = [x, y];
        active.push([x, y]);
        points.push([x, y]);
    }
    function isValid(x, y) {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        const col = Math.floor(x / cellSize);
        const row = Math.floor(y / cellSize);
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const nr = row + dr, nc = col + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                const p = grid[nr * cols + nc];
                if (p && (p[0] - x) ** 2 + (p[1] - y) ** 2 < minDist * minDist) return false;
            }
        }
        return true;
    }
    addPoint(width / 2, height / 2);
    while (active.length) {
        const idx = Math.floor(Math.random() * active.length);
        const [ax, ay] = active[idx];
        let found = false;
        for (let i = 0; i < tries; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = minDist + Math.random() * minDist;
            const nx = ax + Math.cos(angle) * r;
            const ny = ay + Math.sin(angle) * r;
            if (isValid(nx, ny)) { addPoint(nx, ny); found = true; break; }
        }
        if (!found) active.splice(idx, 1);
    }
    return points;
}
// ─── PARTICLE SYSTEM ─────────────────────────────────────────────────────────
class ParticleScene {
    constructor({ container, theme = 'light', density = 200, particlesScale = 0.75,
        ringWidth = 0.15, ringWidth2 = 0.05, ringDisplacement = 0.15,
        interactive = true }) {
        this.options = { container, theme, density, particlesScale, ringWidth, ringWidth2, ringDisplacement, interactive };
        this.theme = theme;
        this.pixelRatio = window.devicePixelRatio;
        this.particlesScale = particlesScale;
        this.density = density;
        this.ringWidth = ringWidth;
        this.ringWidth2 = ringWidth2;
        this.ringDisplacement = ringDisplacement;
        this.interactive = interactive;
        this.isPaused = false;
        this.isIntersecting = false;
        this.mouseIsOver = false;
        this.intersectionPoint = new THREE.Vector3();
        this.mouse = new THREE.Vector2();
        // Colors - purple theme for Hium
        this.colorControls = theme === 'dark'
            ? { color1: '#7189ff', color2: '#3074f9', color3: '#000000' }
            : { color1: '#7c3aed', color2: '#a78bfa', color3: '#000000' };
        // Setup renderer
        this.canvas = document.createElement('canvas');
        container.appendChild(this.canvas);
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas, antialias: true, alpha: true,
            powerPreference: 'high-performance', preserveDrawingBuffer: true,
            stencil: false, precision: 'highp'
        });
        this.gl = this.renderer.getContext();
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(theme === 'dark' ? 0x000000 : 0xffffff);
        this.initCamera();
        this.initRaycast();
        this.initParticles();
        this.initEvents();
        this.clock = new THREE.Clock();
        this.noise = new ValueNoise();
        this.time = 0;
        this.lastTime = 0;
        this.skipFrame = false;
        this.ringPos = new THREE.Vector2(0, 0);
        this.cursorPos = new THREE.Vector2(0, 0);
    }
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            40, this.canvas.width / this.canvas.height, 0.1, 1000
        );
        this.camera.position.z = 3.1;
    }
    initRaycast() {
        this.raycaster = new THREE.Raycaster();
        this.raycastPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(12.5, 12.5),
            new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false, side: THREE.DoubleSide })
        );
        this.scene.add(this.raycastPlane);
    }
    initParticles() {
        this.particles = new ParticleSystem(this);
    }
    initEvents() {
        window.addEventListener('resize', () => this.onWindowResize());
        if (this.interactive) {
            window.addEventListener('mousemove', (e) => {
                this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
                this.mouseIsOver = true;
            });
        }
    }
    onWindowResize() {
        const w = this.options.container.offsetWidth;
        const h = this.options.container.offsetHeight;
        this.canvas.width = w; this.canvas.height = h;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.particles.resize();
    }
    stop() { this.isPaused = true; this.clock.stop(); }
    resume() { this.isPaused = false; this.clock.start(); }
    render() {
        if (this.isPaused) return;
        const elapsed = this.clock.getElapsedTime();
        const dt = elapsed - this.lastTime;
        this.lastTime = elapsed;
        this.time += dt;
        // Update ring position via mouse or auto-drift
        const t = (this.noise.getVal(this.time * 0.66 + 94.234) - 0.5) * 2;
        const u = (this.noise.getVal(this.time * 0.75 + 21.028) - 0.5) * 2;
        if (this.mouseIsOver) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const hits = this.raycaster.intersectObject(this.raycastPlane);
            if (hits.length > 0) {
                this.intersectionPoint.copy(hits[0].point);
                this.isIntersecting = true;
            }
        }
        if (this.isIntersecting) {
            this.cursorPos.set(this.intersectionPoint.x * 0.175 + t * 0.1, this.intersectionPoint.y * 0.175 + u * 0.1);
        } else {
            this.cursorPos.set(t * 0.2, u * 0.1);
        }
        this.ringPos.x += (this.cursorPos.x - this.ringPos.x) * (this.isIntersecting ? 0.02 : 0.01);
        this.ringPos.y += (this.cursorPos.y - this.ringPos.y) * (this.isIntersecting ? 0.02 : 0.01);
        this.particles.update(dt);
        this.renderer.setRenderTarget(null);
        this.renderer.autoClear = false;
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.particles.postRender();
    }
    kill() {
        this.stop();
        window.removeEventListener('resize', this.onWindowResize);
        this.renderer.dispose();
        this.canvas.parentElement?.removeChild(this.canvas);
    }
}
// ─── GPGPU PARTICLE SYSTEM ───────────────────────────────────────────────────
class ParticleSystem {
    constructor(sceneObj) {
        this.scene = sceneObj;
        this.renderer = sceneObj.renderer;
        this.camera = sceneObj.camera;
        this.lastTime = 0;
        this.everRendered = false;
        this.particleScale = sceneObj.canvas.width / sceneObj.pixelRatio / 2000 * sceneObj.particlesScale;
        this.createPoints();
        this.init();
    }
    createPoints() {
        const density = this.scene.density;
        const minDist = this.lerp(density, 0, 300, 10, 2);
        const pts = poissonDisk(500, 500, minDist);
        this.pointsData = [];
        for (const p of pts) { this.pointsData.push(p[0] - 250, p[1] - 250); }
        this.count = this.pointsData.length / 2;
    }
    lerp(x, x0, x1, y0, y1) { return (x - x0) * (y1 - y0) / (x1 - x0) + y0; }
    createDataTexture() {
        const data = new Float32Array(this.length * 4);
        for (let i = 0; i < this.count; i++) {
            data[i * 4 + 0] = this.pointsData[i * 2 + 0] / 250;
            data[i * 4 + 1] = this.pointsData[i * 2 + 1] / 250;
            data[i * 4 + 2] = 0; data[i * 4 + 3] = 0;
        }
        const tex = new THREE.DataTexture(data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType);
        tex.needsUpdate = true;
        return tex;
    }
    createRenderTarget(tex) {
        return new THREE.WebGLRenderTarget(this.size, this.size, {
            wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
            minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
            texture: tex, format: THREE.RGBAFormat, type: THREE.FloatType,
            depthBuffer: false, stencilBuffer: false
        });
    }
    init() {
        this.size = 256;
        this.length = this.size * this.size;
        this.posTex = this.createDataTexture();
        this.rt1 = this.createRenderTarget(this.posTex);
        this.rt2 = this.createRenderTarget(this.posTex);
        // Simulation scene (GPGPU pass)
        this.simScene = new THREE.Scene();
        this.simCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.simMaterial = new THREE.RawShaderMaterial({
            uniforms: {
                uPosition: { value: this.posTex },
                uPosRefs: { value: this.posTex },
                uRingPos: { value: new THREE.Vector2(0, 0) },
                uRingRadius: { value: 0.2 },
                uDeltaTime: { value: 0 },
                uTime: { value: 0 },
                uRingWidth: { value: 0.05 },
                uRingWidth2: { value: 0.015 },
                uRingDisplacement: { value: this.scene.ringDisplacement },
            },
            vertexShader: `
        void main() { gl_Position = vec4(position, 1.0); }
      `,
            fragmentShader: `
        precision highp float;
        uniform sampler2D uPosition;
        uniform sampler2D uPosRefs;
        uniform vec2 uRingPos;
        uniform float uTime;
        uniform float uDeltaTime;
        uniform float uRingRadius;
        uniform float uRingWidth;
        uniform float uRingWidth2;
        uniform float uRingDisplacement;
        ${NOISE_GLSL}
        void main() {
          vec2 simTexCoords = gl_FragCoord.xy / vec2(${this.size}.0, ${this.size}.0);
          vec4 pFrame = texture2D(uPosition, simTexCoords);
          float scale = pFrame.z;
          float velocity = pFrame.w;
          vec2 refPos = texture2D(uPosRefs, simTexCoords).xy;
          float time = uTime * .5;
          vec2 pos = pFrame.xy;
          pos *= .8;
          float dist = distance(refPos.xy, uRingPos);
          float noise0 = snoise(vec3(refPos.xy * .2 + vec2(18.4924, 72.9744), time * 0.5));
          float dist1 = distance(refPos.xy + (noise0 * .005), uRingPos);
          float t  = smoothstep(uRingRadius-(uRingWidth*2.), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius+uRingWidth, dist1);
          float t2 = smoothstep(uRingRadius-(uRingWidth2*2.), uRingRadius, dist) - smoothstep(uRingRadius, uRingRadius+uRingWidth2, dist1);
          float t3 = smoothstep(uRingRadius+uRingWidth2, uRingRadius, dist);
          t = pow(t, 2.); t2 = pow(t2, 3.);
          t += t2 * 3.;
          t += t3 * .4;
          t += snoise(vec3(refPos.xy * 30. + vec2(11.4924, 12.9744), time * 0.5)) * t3 * .5;
          float nS = snoise(vec3(refPos.xy * 2. + vec2(18.4924, 72.9744), time * 0.5));
          t += pow((nS + 1.5) * .5, 2.) * .6;
          float noise1 = snoise(vec3(refPos.xy * 4. + vec2(88.494, 32.4397), time * 0.35));
          float noise2 = snoise(vec3(refPos.xy * 4. + vec2(50.904, 120.947), time * 0.35));
          float noise3 = snoise(vec3(refPos.xy * 20. + vec2(18.4924, 72.9744), time * .5));
          float noise4 = snoise(vec3(refPos.xy * 20. + vec2(50.904, 120.947), time * .5));
          vec2 disp = vec2(noise1, noise2) * .03;
          disp += vec2(noise3, noise4) * .005;
          disp.x += sin((refPos.x * 20.) + (time * 4.)) * .02 * clamp(dist, 0., 1.);
          disp.y += cos((refPos.y * 20.) + (time * 3.)) * .02 * clamp(dist, 0., 1.);
          pos -= (uRingPos - (refPos + disp)) * pow(t2, .75) * uRingDisplacement;
          float scaleDiff = t - scale;
          scaleDiff *= .2;
          scale += scaleDiff;
          vec2 finalPos = refPos + disp + (pos * .25);
          velocity *= .5;
          velocity += scale * .25;
          gl_FragColor = vec4(finalPos, scale, velocity);
        }
      `
        });
        this.simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.simMaterial));
        // Render geometry
        const geo = new THREE.BufferGeometry();
        const uv = new Float32Array(this.count * 2);
        const pos = new Float32Array(this.count * 3);
        const seeds = new Float32Array(this.count * 4);
        for (let i = 0; i < this.count; i++) {
            uv[i * 2] = (i % this.size) / this.size;
            uv[i * 2 + 1] = Math.floor(i / this.size) / this.size;
        }
        for (let i = 0; i < this.count; i++) {
            seeds[i * 4] = Math.random(); seeds[i * 4 + 1] = Math.random();
            seeds[i * 4 + 2] = Math.random(); seeds[i * 4 + 3] = Math.random();
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setAttribute('seeds', new THREE.BufferAttribute(seeds, 4));
        const colorScheme = this.scene.theme === 'dark' ? 0 : 1;
        this.renderMaterial = new THREE.RawShaderMaterial({
            uniforms: {
                uPosition: { value: this.posTex },
                uTime: { value: 0 },
                uColor1: { value: new THREE.Color(this.scene.colorControls.color1) },
                uColor2: { value: new THREE.Color(this.scene.colorControls.color2) },
                uColor3: { value: new THREE.Color(this.scene.colorControls.color3) },
                uAlpha: { value: 1 },
                uRingPos: { value: new THREE.Vector2(0, 0) },
                uRez: { value: new THREE.Vector2(this.scene.canvas.width, this.scene.canvas.height) },
                uParticleScale: { value: this.particleScale },
                uPixelRatio: { value: this.scene.pixelRatio },
                uColorScheme: { value: colorScheme },
            },
            vertexShader: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        attribute vec4 seeds;
        uniform sampler2D uPosition;
        uniform float uTime;
        uniform float uParticleScale;
        uniform float uPixelRatio;
        uniform int uColorScheme;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec4 vSeeds;
        varying float vVelocity;
        varying vec2 vLocalPos;
        varying vec2 vScreenPos;
        varying float vScale;
        void main() {
          vec4 pos = texture2D(uPosition, uv);
          vSeeds = seeds;
          vVelocity = pos.w;
          vScale = pos.z;
          vLocalPos = pos.xy;
          vec4 viewSpace = modelViewMatrix * vec4(pos.xy, 0.0, 1.0);
          gl_Position = projectionMatrix * viewSpace;
          vScreenPos = gl_Position.xy;
          gl_PointSize = ((vScale * 7.0) * (uPixelRatio * 0.5) * uParticleScale);
        }
      `,
            fragmentShader: `
        precision highp float;
        varying vec4 vSeeds;
        varying vec2 vScreenPos;
        varying vec2 vLocalPos;
        varying float vScale;
        varying float vVelocity;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec2 uRingPos;
        uniform vec2 uRez;
        uniform float uAlpha;
        uniform float uTime;
        uniform int uColorScheme;
        ${NOISE_GLSL}
        #define PI 3.1415926535897932384626433832795
        float sdRoundBox(in vec2 p, in vec2 b, in vec4 r) {
          r.xy = (p.x > 0.0) ? r.xy : r.zw;
          r.x  = (p.y > 0.0) ? r.x  : r.y;
          vec2 q = abs(p) - b + r.x;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
        }
        vec2 rotate(vec2 v, float a) {
          return mat2(cos(a), sin(a), -sin(a), cos(a)) * v;
        }
        void main() {
          float noiseAngle = snoise(vec3(vLocalPos * 10. + vec2(18.4924, 72.9744), uTime * .85));
          float noiseColor = snoise(vec3(vLocalPos * 2.  + vec2(74.664, 91.556),  uTime * .5));
          noiseColor = (noiseColor + 1.) * .5;
          float angle = atan(vLocalPos.y - uRingPos.y, vLocalPos.x - uRingPos.x);
          vec2 uv = gl_PointCoord.xy - vec2(0.5);
          uv.y *= -1.;
          uv = rotate(uv, -angle + (noiseAngle * .5));
          float h = 0.8;
          float progress = smoothstep(0., .75, pow(noiseColor, 2.));
          vec3 col = mix(mix(uColor1, uColor2, progress/h), mix(uColor2, uColor3, (progress-h)/(1.0-h)), step(h, progress));
          float rounded = sdRoundBox(uv, vec2(0.5, 0.2), vec4(0.25));
          rounded = smoothstep(.1, 0., rounded);
          float a = uAlpha * rounded * smoothstep(0.1, 0.2, vScale);
          if (a < 0.01) discard;
          vec3 color = clamp(col, 0., 1.);
          color = mix(color, color * clamp(vVelocity, 0., 1.), float(uColorScheme));
          gl_FragColor = vec4(color, clamp(a, 0., 1.));
        }
      `,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        this.mesh = new THREE.Points(geo, this.renderMaterial);
        this.mesh.position.set(0, 0, 0);
        this.mesh.scale.set(5, 5, 5);
        this.scene.scene.add(this.mesh);
    }
    resize() {
        this.renderMaterial.uniforms.uRez.value = new THREE.Vector2(
            this.scene.canvas.width, this.scene.canvas.height
        );
        this.renderMaterial.uniforms.uPixelRatio.value = this.scene.pixelRatio;
        this.renderMaterial.needsUpdate = true;
    }
    update(dt) {
        const elapsed = this.scene.clock.getElapsedTime();
        const ringRadius = 0.175 + Math.sin(this.scene.time) * 0.03 + Math.cos(this.scene.time * 3) * 0.02;
        this.simMaterial.uniforms.uPosition.value = this.everRendered ? this.rt1.texture : this.posTex;
        this.simMaterial.uniforms.uTime.value = elapsed;
        this.simMaterial.uniforms.uDeltaTime.value = dt;
        this.simMaterial.uniforms.uRingRadius.value = ringRadius;
        this.simMaterial.uniforms.uRingPos.value = this.scene.ringPos;
        this.simMaterial.uniforms.uRingWidth.value = this.scene.ringWidth;
        this.simMaterial.uniforms.uRingWidth2.value = this.scene.ringWidth2;
        this.simMaterial.uniforms.uRingDisplacement.value = this.scene.ringDisplacement;
        this.renderer.setRenderTarget(this.rt2);
        this.renderer.render(this.simScene, this.simCamera);
        this.renderer.setRenderTarget(null);
        this.renderMaterial.uniforms.uPosition.value = this.everRendered ? this.rt2.texture : this.posTex;
        this.renderMaterial.uniforms.uTime.value = elapsed;
        this.renderMaterial.uniforms.uRingPos.value = this.scene.ringPos;
        this.particleScale = this.scene.canvas.width / this.scene.pixelRatio / 2000 * this.scene.particlesScale;
        this.renderMaterial.uniforms.uParticleScale.value = this.particleScale;
    }
    postRender() {
        const tmp = this.rt1; this.rt1 = this.rt2; this.rt2 = tmp;
        this.everRendered = true;
    }
    kill() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.rt1.dispose(); this.rt2.dispose(); this.posTex.dispose();
        this.simMaterial.dispose(); this.renderMaterial.dispose();
    }
}
// ─── INICIALIZACIÓN ──────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    if (!window.THREE) return;
    const container = document.getElementById('particle-container');
    if (!container) return;

    const particleScene = new ParticleScene({
        container,
        theme: 'light',
        density: 200,
        particlesScale: 0.75,
        ringWidth: 0.15,
        ringWidth2: 0.05,
        ringDisplacement: 0.15,
        interactive: true,
    });

    // IntersectionObserver para pausar cuando no es visible (performance)
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting ? particleScene.resume() : particleScene.stop());
    });
    observer.observe(container);

    // Loop de animación
    function animate() {
        requestAnimationFrame(animate);
        particleScene.render();
    }
    animate();

    // Expose for compatibility
    window.hiumParticles = particleScene;
});
