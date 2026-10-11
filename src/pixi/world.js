// The interactive, living world — a Pixi v8 scene layered over the painted
// backdrop. Framework-agnostic; React mounts/destroys it via PixiWorld.jsx.
//
// What lives here: the painted day/night backdrop as Pixi sprites (so the whole
// world shares one camera), a walking character (tap-to-walk + auto-wander,
// idle/run animation, facing flip), a drifting firefly field that thickens at
// night and with streak, and a camera that pans to follow the character across
// a world wider than the viewport (that's the "explore").
import { Application, Assets, Sprite, AnimatedSprite, Texture, Rectangle, Container, Graphics } from "pixi.js";

const CHAR_SCALE = 2.2; // 32px sprite -> ~70px tall, reads at scene size
const WALK_SPEED = 90; // px/sec
const GROUND_FRAC = 0.82; // character feet sit at this fraction of viewport height
const WORLD_FACTOR = 1.7; // world is this much wider than the viewport (room to roam)

async function sliceStrip(url, frameCount, size = 32) {
  const tex = await Assets.load(url);
  tex.source.scaleMode = "nearest"; // crisp pixels
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(new Texture({ source: tex.source, frame: new Rectangle(i * size, 0, size, size) }));
  }
  return frames;
}

export class PixiWorld {
  constructor() {
    this.app = null;
    this.world = null; // panning container (the camera moves this)
    this.char = null;
    this.fireflies = [];
    this.fireflyLayer = null;
    this.theme = "dark";
    this.tier = 0;
    this.target = null; // {x} the character walks toward, or null
    this.facing = 1;
    this.wanderTimer = 0;
    this._raf = null;
  }

  async init(mountEl, { theme = "dark", tier = 0 } = {}) {
    this.theme = theme;
    this.tier = tier;

    const app = new Application();
    await app.init({
      resizeTo: mountEl,
      backgroundAlpha: 0,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    this.app = app;
    mountEl.appendChild(app.canvas);

    const world = new Container();
    app.stage.addChild(world);
    this.world = world;

    // --- backdrops (day + night), sized to cover the world, crossfaded by theme
    const [dayTex, nightTex] = await Promise.all([
      Assets.load("/assets/backdrop-day.jpg"),
      Assets.load("/assets/backdrop-night.jpg"),
    ]);
    this.day = new Sprite(dayTex);
    this.night = new Sprite(nightTex);
    world.addChild(this.day, this.night);

    // --- firefly field
    this.fireflyLayer = new Container();
    world.addChild(this.fireflyLayer);

    // --- character
    const [idle, run] = await Promise.all([
      sliceStrip("/assets/sprites/idle.png", 11),
      sliceStrip("/assets/sprites/run.png", 12),
    ]);
    this.idleFrames = idle;
    this.runFrames = run;
    const char = new AnimatedSprite(idle);
    char.anchor.set(0.5, 1); // feet
    char.scale.set(CHAR_SCALE);
    char.animationSpeed = 0.18;
    char.play();
    world.addChild(char);
    this.char = char;

    this.layout();
    this.spawnFireflies();
    this.applyTheme();

    // tap/click the scene -> walk there
    app.canvas.style.pointerEvents = "auto";
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.on("pointertap", (e) => {
      this.target = { x: e.global.x - this.world.x };
    });

    this._onResize = () => this.layout();
    window.addEventListener("resize", this._onResize);

    app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
  }

  layout() {
    if (!this.app) return;
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    this.worldW = vw * WORLD_FACTOR;
    this.groundY = vh * GROUND_FRAC;

    for (const bg of [this.day, this.night]) {
      // cover the world box
      const s = Math.max(this.worldW / bg.texture.width, vh / bg.texture.height);
      bg.scale.set(s);
      bg.x = 0;
      bg.y = vh - bg.height; // anchor bottom (grass stays at the bottom)
    }

    if (this.char && this.char.x === 0) {
      this.char.x = this.worldW * 0.3;
    }
    this.char.y = this.groundY;
  }

  spawnFireflies() {
    this.fireflyLayer.removeChildren();
    this.fireflies = [];
    const vh = this.app.screen.height;
    // more life as the streak grows; a baseline so the night never feels dead
    const count = 14 + this.tier * 8;
    for (let i = 0; i < count; i++) {
      const g = new Graphics().circle(0, 0, 1.6).fill(0xfff2a8);
      g.x = Math.random() * this.worldW;
      g.y = vh * (0.4 + Math.random() * 0.5);
      g.alpha = 0.2 + Math.random() * 0.6;
      this.fireflyLayer.addChild(g);
      this.fireflies.push({ g, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 8, phase: Math.random() * Math.PI * 2 });
    }
  }

  applyTheme() {
    const night = this.theme === "dark";
    this.day.alpha = night ? 0 : 1;
    this.night.alpha = night ? 1 : 0;
    this.fireflyLayer.visible = night;
  }

  setTheme(theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    if (this.day) this.applyTheme(); // ignore until init has built the sprites
  }

  setTier(tier) {
    if (tier === this.tier) return;
    this.tier = tier;
    this.spawnFireflies();
  }

  // send the character walking off toward the right edge ("gone to do the dare")
  walkOff() {
    this.target = { x: this.worldW + 60 };
  }

  tick(dt) {
    if (!this.app || !this.char) return;
    const vw = this.app.screen.width;

    // --- character walk ---
    const char = this.char;
    let moving = false;
    if (this.target) {
      const dx = this.target.x - char.x;
      if (Math.abs(dx) > 4) {
        const dir = Math.sign(dx);
        char.x += dir * WALK_SPEED * dt;
        this.facing = dir;
        moving = true;
      } else {
        this.target = null;
      }
    } else {
      // idle auto-wander: occasionally pick a nearby spot
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 4 + Math.random() * 5;
        const roam = this.worldW * 0.5;
        this.target = { x: Math.max(40, Math.min(this.worldW - 40, char.x + (Math.random() - 0.5) * roam)) };
      }
    }
    char.x = Math.max(20, Math.min(this.worldW - 20, char.x));
    char.scale.x = CHAR_SCALE * this.facing;

    // swap idle/run animation
    const wantRun = moving;
    if (wantRun && char.textures !== this.runFrames) {
      char.textures = this.runFrames;
      char.animationSpeed = 0.3;
      char.play();
    } else if (!wantRun && char.textures !== this.idleFrames) {
      char.textures = this.idleFrames;
      char.animationSpeed = 0.18;
      char.play();
    }

    // --- camera: pan world so the character stays roughly centered, clamped ---
    const targetX = Math.max(vw - this.worldW, Math.min(0, vw / 2 - char.x));
    this.world.x += (targetX - this.world.x) * Math.min(1, dt * 3);

    // --- fireflies drift + twinkle ---
    const vh = this.app.screen.height;
    for (const f of this.fireflies) {
      f.g.x += f.vx * dt;
      f.g.y += f.vy * dt;
      f.phase += dt * 2;
      f.g.alpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(f.phase));
      if (f.g.x < 0) f.g.x = this.worldW;
      if (f.g.x > this.worldW) f.g.x = 0;
      if (f.g.y < vh * 0.35) f.vy = Math.abs(f.vy);
      if (f.g.y > vh * 0.95) f.vy = -Math.abs(f.vy);
    }
  }

  destroy() {
    window.removeEventListener("resize", this._onResize);
    this.app?.destroy(true, { children: true, texture: false });
    this.app = null;
  }
}
