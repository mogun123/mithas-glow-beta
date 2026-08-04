export interface MakeupPresence {
  score: number;
  level: 'no_makeup' | 'light_makeup' | 'heavy_makeup';
  confidence: number;
}

export class MakeupCheckerEngine {
  private readonly RESOLUTION = 128;

  public evaluateMakeup(source: HTMLCanvasElement | HTMLVideoElement, landmarks: any[], mode: string) {
    const buffer = this.createBuffer(source);
    const ctx = buffer.getContext('2d')!;
    const img = ctx.getImageData(0, 0, this.RESOLUTION, this.RESOLUTION);

    const regions = this.extractFaceRegions(landmarks);

    const lighting = this.validateLighting(img, regions);
    if (lighting !== 'optimal') {
      return this.failReport(lighting);
    }

    // 🔥 NEW: Makeup detection first
    const makeupPresence = this.detectMakeup(img, regions);

    // Optional UX control (you can toggle this)
    if (makeupPresence.level === 'no_makeup') {
      return {
        makeupPresence,
        foundationMatch: { score: 0, advice: 'No makeup detected', isAshey: false },
        shineDetection: { score: 0, advice: 'No makeup detected', specularRatio: 0 },
        cakeyDetection: { score: 0, advice: 'No makeup detected', gradientMagnitude: 0 },
        vibeCheck: { score: 0, advice: 'No makeup detected', threshold: 0 },
        blendQuality: { score: 0, advice: 'No makeup detected', normalizedStd: 0 },
        lightingStatus: 'optimal',
        overallScore: 0
      };
    }

    const foundation = this.foundationMatch(img, regions);
    const shine = this.shineDetection(img, regions);
    const cakey = this.cakeyDetection(img, regions);
    const vibe = this.vibeCheck(img, regions, mode);
    const blend = this.blendQuality(img, regions);

    const overall = Math.round(
      (foundation.score + shine.score + cakey.score + vibe.score + blend.score) / 5
    );

    return {
      makeupPresence,
      foundationMatch: foundation,
      shineDetection: shine,
      cakeyDetection: cakey,
      vibeCheck: vibe,
      blendQuality: blend,
      lightingStatus: 'optimal',
      overallScore: overall
    };
  }

  // ================= MAKEUP DETECTION =================

  private detectMakeup(img: ImageData, r: any): MakeupPresence {
    const cheekSamples = [
      ...this.sample(img, r.leftCheek),
      ...this.sample(img, r.rightCheek)
    ];

    const lipSamples = this.sample(img, r.lips);

    // 1️⃣ Uniformity (low std = makeup)
    const std = this.stdDev(cheekSamples.map(s => s.L));

    // 2️⃣ Lip contrast
    const cheekAvg = this.avg(cheekSamples);
    const lipAvg = this.avg(lipSamples);
    const lipContrast = Math.abs(lipAvg.a - cheekAvg.a);

    // 3️⃣ Texture smoothness (reuse gradient idea)
    const texture = this.textureScore(img, r.leftCheek);

    // Normalize
    const uniformityScore = Math.max(0, 100 - std * 3);
    const contrastScore = Math.min(100, lipContrast * 4);
    const textureScore = Math.max(0, 100 - texture * 2);

    const score =
      uniformityScore * 0.4 +
      contrastScore * 0.3 +
      textureScore * 0.3;

    let level: MakeupPresence['level'] = 'no_makeup';
    if (score > 70) level = 'heavy_makeup';
    else if (score > 40) level = 'light_makeup';

    const confidence = Math.min(100, score);

    return {
      score: Math.round(score),
      level,
      confidence: Math.round(confidence)
    };
  }

  private textureScore(img: ImageData, region: any) {
    const data = this.region(img, region);
    let grad = 0, count = 0;

    for (let i = 1; i < data.length / 4 - 1; i++) {
      const diff = Math.abs(this.luma(data, i + 1) - this.luma(data, i));
      grad += diff;
      count++;
    }

    return grad / count;
  }

  private stdDev(arr: number[]) {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
  }

  // ================= EXISTING ENGINE =================

  private createBuffer(source: HTMLCanvasElement | HTMLVideoElement) {
    const c = document.createElement('canvas');
    c.width = this.RESOLUTION;
    c.height = this.RESOLUTION;
    c.getContext('2d')!.drawImage(source, 0, 0, this.RESOLUTION, this.RESOLUTION);
    return c;
  }

  private extractFaceRegions(landmarks: any[]) {
    const s = this.RESOLUTION;
    const p = (i: number) => ({ x: landmarks[i].x * s, y: landmarks[i].y * s });

    const forehead = p(10);
    const leftCheek = p(50);
    const rightCheek = p(280);
    const chin = p(152);
    const leftJaw = p(172);
    const rightJaw = p(397);
    const lips = p(13);

    return {
      forehead: { x: forehead.x - 20, y: forehead.y - 10, width: 40, height: 20 },
      leftCheek: { x: leftCheek.x - 15, y: leftCheek.y - 15, width: 30, height: 30 },
      rightCheek: { x: rightCheek.x - 15, y: rightCheek.y - 15, width: 30, height: 30 },
      chin: { x: chin.x - 15, y: chin.y - 10, width: 30, height: 20 },
      tzone: { x: forehead.x - 10, y: forehead.y, width: 20, height: Math.abs(chin.y - forehead.y) },
      jawline: { x: leftJaw.x, y: leftJaw.y - 10, width: Math.abs(rightJaw.x - leftJaw.x), height: 20 },
      underEye: { x: leftCheek.x, y: leftCheek.y - 20, width: 40, height: 15 },
      lips: { x: lips.x - 15, y: lips.y - 10, width: 30, height: 20 }
    };
  }

  private validateLighting(img: ImageData, r: any) {
    const pts = [
      this.center(r.forehead),
      this.center(r.leftCheek),
      this.center(r.rightCheek),
      this.center(r.chin)
    ];

    let vals: number[] = [];

    for (const p of pts) {
      const lab = this.lab(img, p.x, p.y);
      if (lab) vals.push(lab.L);
    }

    if (vals.length < 3) return 'too_dark';

    const avg = vals.reduce((a, b) => a + b) / vals.length;
    if (avg < 25) return 'too_dark';
    if (avg > 95) return 'too_bright';

    return 'optimal';
  }

  private foundationMatch(img: ImageData, r: any) {
    const cheek = [...this.sample(img, r.leftCheek), ...this.sample(img, r.rightCheek)];
    const jaw = this.sample(img, r.jawline);

    const c = this.avg(cheek);
    const j = this.avg(jaw);

    const dE = Math.sqrt((c.L - j.L) ** 2 + (c.a - j.a) ** 2 + (c.b - j.b) ** 2);
    const score = Math.max(0, 100 - dE * 10);

    return { score: Math.round(score), advice: score > 70 ? 'Good match' : 'Mismatch', isAshey: false };
  }

  private shineDetection(img: ImageData, r: any) {
    const s = this.sample(img, r.tzone);

    let maxL = 0, avgL = 0;
    for (const v of s) {
      maxL = Math.max(maxL, v.L);
      avgL += v.L;
    }
    avgL /= s.length;

    const spec = maxL / avgL;
    const score = Math.max(0, 100 - spec * 100);

    return { score: Math.round(score), advice: score < 50 ? 'Oily' : 'Balanced', specularRatio: spec };
  }

  private cakeyDetection(img: ImageData, r: any) {
    const data = this.region(img, r.underEye);

    let grad = 0;
    for (let i = 1; i < data.length / 4 - 1; i++) {
      grad += Math.abs(this.luma(data, i + 1) - this.luma(data, i));
    }

    const score = Math.max(0, 100 - grad / 50);

    return { score: Math.round(score), advice: score < 60 ? 'Cakey' : 'Smooth', gradientMagnitude: grad };
  }

  private vibeCheck(img: ImageData, r: any, mode: string) {
    const lips = this.avg(this.sample(img, r.lips));
    const face = this.avg([...this.sample(img, r.leftCheek), ...this.sample(img, r.rightCheek)]);

    const ratio = lips.a / (face.L + 1);
    const score = Math.max(0, 100 - Math.abs(1 - ratio) * 50);

    return { score: Math.round(score), advice: 'Balanced', threshold: face.L };
  }

  private blendQuality(img: ImageData, r: any) {
    const data = this.region(img, r.leftCheek);

    let grads: number[] = [];
    for (let i = 1; i < data.length / 4 - 1; i++) {
      grads.push(Math.abs(this.luma(data, i + 1) - this.luma(data, i)));
    }

    const mean = grads.reduce((a, b) => a + b, 0) / grads.length;
    const score = Math.max(0, 100 - mean * 5);

    return { score: Math.round(score), advice: 'Blend check', normalizedStd: mean };
  }

  private sample(img: ImageData, r: any) {
    const arr = [];
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;

    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const lab = this.lab(img, cx + i * 3, cy + j * 3);
        if (lab) arr.push(lab);
      }
    }

    return arr;
  }

  private avg(s: any[]) {
    const sum = s.reduce((a, b) => ({
      L: a.L + b.L,
      a: a.a + b.a,
      b: a.b + b.b
    }), { L: 0, a: 0, b: 0 });

    return {
      L: sum.L / s.length,
      a: sum.a / s.length,
      b: sum.b / s.length
    };
  }

  private region(img: ImageData, r: any) {
    const d = [];
    for (let y = r.y; y < r.y + r.height; y++) {
      for (let x = r.x; x < r.x + r.width; x++) {
        const i = (y * img.width + x) * 4;
        d.push(img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]);
      }
    }
    return new Uint8ClampedArray(d);
  }

  private luma(data: Uint8ClampedArray, i: number) {
    return data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
  }

  private center(r: any) {
    return { x: Math.floor(r.x + r.width / 2), y: Math.floor(r.y + r.height / 2) };
  }

  private lab(img: ImageData, x: number, y: number) {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;

    const i = (Math.floor(y) * img.width + Math.floor(x)) * 4;

    const r = img.data[i] / 255;
    const g = img.data[i + 1] / 255;
    const b = img.data[i + 2] / 255;

    return {
      L: (r + g + b) * 100,
      a: (r - g) * 128,
      b: (g - b) * 128
    };
  }

  private failReport(status: 'too_dark' | 'too_bright') {
    return {
      makeupPresence: { score: 0, level: 'no_makeup', confidence: 0 },
      foundationMatch: { score: 0, advice: 'Fix lighting', isAshey: false },
      shineDetection: { score: 0, advice: 'Fix lighting', specularRatio: 0 },
      cakeyDetection: { score: 0, advice: 'Fix lighting', gradientMagnitude: 0 },
      vibeCheck: { score: 0, advice: 'Fix lighting', threshold: 0 },
      blendQuality: { score: 0, advice: 'Fix lighting', normalizedStd: 0 },
      lightingStatus: status,
      overallScore: 0
    };
  }
}

export const makeupCheckerEngine = new MakeupCheckerEngine();
