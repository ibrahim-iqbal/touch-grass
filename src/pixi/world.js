// A living scene — painted backdrop + 3 animated characters (comparison mode)
// + ambient fireflies + sun/moon + drifting clouds. Tap character to select.
import { Application, Assets, Sprite, AnimatedSprite, Texture, Rectangle, Container, Graphics } from "pixi.js";

const CHAR_SCALE = 2.5;
const GROUND_FRAC = 0.78;
const WALK_SPEED = 70;
const WANDER_MIN = 4;
const WANDER_MAX = 9;
const THEME_FADE_SPEED = 1.2;

const CHARACTERS = {
  "mask-dude":  { idle: "/assets/sprites/idle.png",              run: "/assets/sprites/run.png" },
  "ninja-frog": { idle: "/assets/sprites/ninja-frog/idle.png",   run: "/assets/sprites/ninja-frog/run.png" },
  "pink-man":   { idle: "/assets/sprites/pink-man/idle.png",     run: "/assets/sprites/pink-man/run.png" },
};
const CHAR_KEYS = Object.keys(CHARACTERS);

async function sliceStrip(url, frameCount, size = 32) {
  const tex = await Assets.load(url);
  tex.source.scaleMode = "nearest";
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(new Texture({ source: tex.source, frame: new Rectangle(i * size, 0, size, size) }));
  }
  return frames;
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export class PixiWorld {
  constructor() {
    this.app = null;
    this.chars = {};        // { "mask-dude": { sprite, idle, run }, ... }
    this.activeChar = null; // the one that wanders
    this.fireflies = [];
    this.clouds = [];
    this.theme = "dark";
    this.tier = 0;
    this.target = null;
    this.facing = 1;
    this.wanderTimer = 0;
    this.time = 0;
    this.day = null;
    this.night = null;
    this.fireflyLayer = null;
    this.cloudLayer = null;
    this.sunMoon = null;
    this._nightAlpha = 0;
    this._nightTarget = 0;
    this._character = "mask-dude";
    this._showAll = true;
    this._onCharacterPick = null;
  }

  async init(mountEl, { theme = "dark", tier = 0, character = "mask-dude" } = {}) {
    this._character = character;
    this.theme = theme;
    this.tier = tier;
    this._nightTarget = theme === "dark" ? 1 : 0;
    this._nightAlpha = this._nightTarget;

    const app = new Application();
    await app.init({
      resizeTo: mountEl,
      backgroundAlpha: 1,
      backgroundColor: 0x2f6daa,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    this.app = app;
    mountEl.appendChild(app.canvas);

    const [dayTex, nightTex] = await Promise.all([
      Assets.load("/assets/backdrop-day.jpg"),
      Assets.load("/assets/backdrop-night.jpg"),
    ]);
    this.day = new Sprite(dayTex);
    this.night = new Sprite(nightTex);
    app.stage.addChild(this.day, this.night);

    // --- clouds (above backdrop, below sun/moon)
    this.cloudLayer = new Container();
    app.stage.addChild(this.cloudLayer);
    this._spawnClouds();

    // --- sun/moon orb
    this.sunMoon = new Graphics();
    app.stage.addChild(this.sunMoon);

    // --- all 3 characters
    const charContainer = new Container();
    app.stage.addChild(charContainer);

    for (const key of CHAR_KEYS) {
      const paths = CHARACTERS[key];
      const [idle, run] = await Promise.all([
        sliceStrip(paths.idle, 11),
        sliceStrip(paths.run, 12),
      ]);
      const sprite = new AnimatedSprite(idle);
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(CHAR_SCALE);
      sprite.animationSpeed = 0.18;
      sprite.play();
      // tap to select — enlarge hitArea for easier taps
      sprite.eventMode = "static";
      sprite.cursor = "pointer";
      sprite.hitArea = { contains: (px, py) => px >= -24 && px <= 56 && py >= -80 && py <= 8 };
      sprite.on("pointertap", (e) => {
        e.stopPropagation();
        this._pickCharacter(key);
      });
      charContainer.addChild(sprite);
      this.chars[key] = { sprite, idle, run };
    }
    this.activeChar = this.chars[this._character]?.sprite || this.chars["mask-dude"].sprite;

    // --- firefly layer (in front)
    this.fireflyLayer = new Container();
    app.stage.addChild(this.fireflyLayer);

    this.layout();
    this.spawnFireflies();
    this._drawSunMoon();

    // snap theme
    const night = this._nightTarget === 1;
    this.day.alpha = night ? 0 : 1;
    this.night.alpha = night ? 1 : 0;
    this.fireflyLayer.alpha = night ? 1 : 0.25;
    this.cloudLayer.alpha = night ? 0.3 : 0.7;
    if (this.app) this.app.renderer.background.color = night ? 0x0f163a : 0x2f6daa;

    // tap to walk (only active char)
    app.canvas.style.pointerEvents = "auto";
    app.stage.eventMode = "static";
    app.stage.hitArea = app.screen;
    app.stage.on("pointertap", (e) => {
      if (!this._showAll) {
        const vw = this.app.screen.width;
        const x = Math.max(vw * 0.06, Math.min(vw * 0.94, e.global.x));
        this.target = { x };
      }
    });

    this._onResize = () => this.layout();
    window.addEventListener("resize", this._onResize);
    app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
  }

  _pickCharacter(key) {
    if (!this.chars[key]) return;
    if (key === this._character && !this._showAll) return;
    this._character = key;
    this._showAll = false;
    this.activeChar = this.chars[key].sprite;
    // hide others
    for (const k of CHAR_KEYS) {
      this.chars[k].sprite.visible = (k === key);
    }
    this.layout();
    if (this._onCharacterPick) this._onCharacterPick(key);
  }

  // called from React when character button is tapped
  setOnCharacterPick(fn) { this._onCharacterPick = fn; }

  showAllCharacters() {
    this._showAll = true;
    for (const k of CHAR_KEYS) {
      this.chars[k].sprite.visible = true;
    }
    this.target = null;
    this.layout();
  }

  _spawnClouds() {
    this.cloudLayer.removeChildren();
    this.clouds = [];
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    // 4-6 small pixel-style clouds
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const w = 30 + Math.random() * 40;
      const h = 10 + Math.random() * 8;
      // blocky pixel cloud shape — rounded rect with small radius
      g.roundRect(-w / 2, -h / 2, w, h, 4).fill({ color: 0xffffff, alpha: 0.6 });
      // add a bump on top
      const bumpW = w * 0.5;
      const bumpH = h * 0.6;
      g.roundRect(-bumpW / 2, -h / 2 - bumpH * 0.7, bumpW, bumpH, 3).fill({ color: 0xffffff, alpha: 0.6 });
      g.x = Math.random() * vw;
      g.y = vh * (0.06 + Math.random() * 0.18);
      this.cloudLayer.addChild(g);
      this.clouds.push({
        g,
        speed: 4 + Math.random() * 8,
        baseY: g.y,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  layout() {
    if (!this.app) return;
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    this.groundY = vh * GROUND_FRAC;

    for (const bg of [this.day, this.night]) {
      if (!bg) continue;
      const s = Math.max(vw / bg.texture.width, vh / bg.texture.height);
      bg.scale.set(s);
      bg.x = (vw - bg.texture.width * s) / 2;
      bg.y = vh - bg.height;
    }

    if (this._showAll) {
      // position all 3 side by side
      const spacing = vw / 4;
      CHAR_KEYS.forEach((key, i) => {
        const sprite = this.chars[key].sprite;
        sprite.x = spacing * (i + 1);
        sprite.y = this.groundY;
        sprite.visible = true;
      });
    } else {
      // single active char
      if (this.activeChar && this.activeChar.x === 0) {
        this.activeChar.x = vw * 0.45;
      }
      if (this.activeChar) {
        this.activeChar.y = this.groundY;
      }
    }
  }

  _drawSunMoon() {
    if (!this.sunMoon || !this.app) return;
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    const na = this._nightAlpha;
    const radius = Math.min(36, vw * 0.08); // scales down on narrow screens

    // position: centered horizontally, below top controls
    const sunX = vw * 0.5;
    const moonX = vw * 0.5;
    const x = sunX + (moonX - sunX) * na;
    const baseY = vh * 0.22; // lower — below HUD controls
    const y = baseY;

    this.sunMoon.clear();

    // sun glow (fades out at night)
    const sunAlpha = 1 - na;
    if (sunAlpha > 0.01) {
      // outer glow
      this.sunMoon
        .circle(x, y, radius + 20)
        .fill({ color: 0xffd34d, alpha: sunAlpha * 0.08 });
      this.sunMoon
        .circle(x, y, radius + 10)
        .fill({ color: 0xffd34d, alpha: sunAlpha * 0.15 });
      // sun body
      this.sunMoon
        .circle(x, y, radius)
        .fill({ color: 0xffd34d, alpha: sunAlpha });
      // rays — 12 bold lines radiating out
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + this.time * 0.15;
        const inner = radius + 8;
        const outer = radius + 28;
        const rx1 = x + Math.cos(angle) * inner;
        const ry1 = y + Math.sin(angle) * inner;
        const rx2 = x + Math.cos(angle) * outer;
        const ry2 = y + Math.sin(angle) * outer;
        this.sunMoon
          .moveTo(rx1, ry1)
          .lineTo(rx2, ry2)
          .stroke({ color: 0xffd34d, alpha: sunAlpha * 0.7, width: 4 });
      }
    }

    // moon (fades in at night)
    if (na > 0.01) {
      this.sunMoon
        .circle(x, y, radius + 12)
        .fill({ color: 0xd8d8e8, alpha: na * 0.06 });
      this.sunMoon
        .circle(x, y, radius + 6)
        .fill({ color: 0xd8d8e8, alpha: na * 0.1 });
      this.sunMoon
        .circle(x, y, radius)
        .fill({ color: 0xd8d8e8, alpha: na });
      // craters
      this.sunMoon
        .circle(x - 10, y - 8, 7)
        .fill({ color: 0x000000, alpha: na * 0.12 });
      this.sunMoon
        .circle(x + 12, y + 9, 6)
        .fill({ color: 0x000000, alpha: na * 0.1 });
      this.sunMoon
        .circle(x + 3, y + 15, 4)
        .fill({ color: 0x000000, alpha: na * 0.08 });
      this.sunMoon
        .circle(x - 14, y + 6, 3)
        .fill({ color: 0x000000, alpha: na * 0.07 });
    }
  }

  spawnFireflies() {
    this.fireflyLayer.removeChildren();
    this.fireflies = [];
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    const count = 18 + this.tier * 10;
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const radius = 1 + Math.random() * 1.5;
      const hue = 0.12 + Math.random() * 0.06;
      const color = this._hslToHex(hue, 0.7, 0.75);
      g.circle(0, 0, radius).fill(color);
      g.x = Math.random() * vw;
      g.y = vh * (0.3 + Math.random() * 0.6);
      g.alpha = 0.15 + Math.random() * 0.5;
      this.fireflyLayer.addChild(g);
      this.fireflies.push({
        g,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 2,
      });
    }
  }

  async setCharacter(name) {
    if (!CHARACTERS[name] || !this.chars[name]) return; // guard: init not done yet
    if (this._showAll) return; // in show-all mode, ignore React state pushes
    if (name === this._character) return;
    this._pickCharacter(name);
  }

  setTheme(theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this._nightTarget = theme === "dark" ? 1 : 0;
  }

  setTier(tier) {
    if (tier === this.tier) return;
    this.tier = tier;
    this.spawnFireflies();
  }

  walkOff() {
    if (this._showAll) return;
    const vw = this.app?.screen.width || 800;
    this.target = { x: vw + 60 };
  }

  tick(dt) {
    if (!this.app) return;
    const vw = this.app.screen.width;
    const vh = this.app.screen.height;
    this.time += dt;

    // --- smooth theme crossfade ---
    const fadeStep = dt / THEME_FADE_SPEED;
    if (this._nightAlpha < this._nightTarget) {
      this._nightAlpha = Math.min(this._nightTarget, this._nightAlpha + fadeStep);
    } else if (this._nightAlpha > this._nightTarget) {
      this._nightAlpha = Math.max(this._nightTarget, this._nightAlpha - fadeStep);
    }
    const na = this._nightAlpha;
    this.day.alpha = 1 - na;
    this.night.alpha = na;
    this.fireflyLayer.alpha = 0.25 + na * 0.75;
    this.cloudLayer.alpha = 0.15 + (1 - na) * 0.55; // clouds more visible in day
    if (this.app) {
      this.app.renderer.background.color = lerpColor(0x2f6daa, 0x0f163a, na);
    }

    // --- clouds drift ---
    for (const c of this.clouds) {
      c.g.x += c.speed * dt;
      c.wobble += dt * 0.3;
      c.g.y = c.baseY + Math.sin(c.wobble) * 2;
      if (c.g.x > vw + 60) c.g.x = -60;
    }

    // --- sun/moon ---
    this._drawSunMoon();

    // --- character walk (only when single character mode) ---
    if (!this._showAll && this.activeChar) {
      const char = this.activeChar;
      const charData = this.chars[this._character];
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
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.wanderTimer = WANDER_MIN + Math.random() * (WANDER_MAX - WANDER_MIN);
          const margin = vw * 0.1;
          this.target = { x: margin + Math.random() * (vw - margin * 2) };
        }
      }
      char.x = Math.max(20, Math.min(vw - 20, char.x));
      char.scale.x = CHAR_SCALE * this.facing;

      if (moving && charData && char.textures !== charData.run) {
        char.textures = charData.run;
        char.animationSpeed = 0.3;
        char.play();
      } else if (!moving && charData && char.textures !== charData.idle) {
        char.textures = charData.idle;
        char.animationSpeed = 0.18;
        char.play();
      }
    }

    // --- all chars idle bounce in comparison mode ---
    if (this._showAll) {
      for (const key of CHAR_KEYS) {
        const sprite = this.chars[key].sprite;
        // gentle bob
        sprite.y = this.groundY + Math.sin(this.time * 1.5 + CHAR_KEYS.indexOf(key)) * 2;
      }
    }

    // --- fireflies ---
    for (const f of this.fireflies) {
      f.g.x += f.vx * dt;
      f.g.y += f.vy * dt;
      f.phase += dt * f.speed;
      f.g.alpha = 0.1 + 0.5 * (0.5 + 0.5 * Math.sin(f.phase));
      if (f.g.x < -10) f.g.x = vw + 10;
      if (f.g.x > vw + 10) f.g.x = -10;
      if (f.g.y < vh * 0.25) f.vy = Math.abs(f.vy);
      if (f.g.y > vh * 0.9) f.vy = -Math.abs(f.vy);
    }
  }

  _hslToHex(h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return (r << 16) | (g << 8) | b;
  }

  destroy() {
    window.removeEventListener("resize", this._onResize);
    this.app?.destroy(true, { children: true, texture: false });
    this.app = null;
  }
}
