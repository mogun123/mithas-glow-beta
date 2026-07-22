export interface MakeupRendererConfig {
  blendMode: GlobalCompositeOperation;
  opacity: number;
  smoothing: boolean;
  antiAliasing: boolean;
}

export class MakeupRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width = video.videoWidth;
    this.height = canvas.height = video.videoHeight;
  }

  // Clear canvas and draw video frame
  clearAndDrawFrame(video: HTMLVideoElement): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(video, 0, 0, this.width, this.height);
  }

  // Set rendering configuration
  setConfig(config: MakeupRendererConfig): void {
    this.ctx.globalCompositeOperation = config.blendMode;
    this.ctx.globalAlpha = config.opacity;
    
    if (config.smoothing) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }

  // Reset rendering state
  resetState(): void {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1.0;
  }

  // Draw smooth gradient for foundation
  drawFoundation(landmarks: any[], color: string): void {
    // Create gradient for natural blending
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width / 2
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.7, color);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.drawFullFace(landmarks);
  }

  // Draw lipstick with natural lip shape
  drawLipstick(landmarks: any[], color: string): void {
    this.ctx.fillStyle = color;
    this.drawLips(landmarks);
    
    // Add subtle highlight for glossy effect
    const gradient = this.ctx.createLinearGradient(0, this.height * 0.6, 0, this.height * 0.8);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'transparent');
    this.ctx.fillStyle = gradient;
    this.drawLips(landmarks);
  }

  // Draw eyeliner with precise lines
  drawEyeliner(landmarks: any[], color: string, thickness: number = 2): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Draw upper eyeliner
    this.drawSmoothCurve(landmarks, 'leftEyeliner');
    this.drawSmoothCurve(landmarks, 'rightEyeliner');
  }

  // Draw eyeshadow with gradient
  drawEyeshadow(landmarks: any[], color: string): void {
    // Create gradient for natural eyeshadow
    const gradient = this.ctx.createRadialGradient(
      this.width * 0.3, this.height * 0.4, 10,
      this.width * 0.3, this.height * 0.4, 60
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.drawEyeshadowRegion(landmarks);
  }

  // Draw blush with circular gradient
  drawBlush(landmarks: any[], color: string): void {
    const gradient = this.ctx.createRadialGradient(
      landmarks[50].x * this.width, landmarks[50].y * this.height, 0,
      landmarks[50].x * this.width, landmarks[50].y * this.height, 40
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    
    // Left cheek
    this.ctx.beginPath();
    this.ctx.arc(landmarks[50].x * this.width, landmarks[50].y * this.height, 30, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Right cheek
    this.ctx.beginPath();
    this.ctx.arc(landmarks[280].x * this.width, landmarks[280].y * this.height, 30, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  // Draw bronzer for contouring
  drawBronzer(landmarks: any[], color: string): void {
    const gradient = this.ctx.createLinearGradient(
      this.width * 0.2, this.height * 0.3,
      this.width * 0.4, this.height * 0.6
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.drawBronzerRegion(landmarks);
  }

  // Draw beard for men
  drawBeard(landmarks: any[], color: string): void {
    this.ctx.fillStyle = color;
    this.drawBeardRegion(landmarks);
  }

  // Draw smooth curve through landmarks
  private drawSmoothCurve(landmarks: any[], curveType: string): void {
    const points = this.getCurvePoints(landmarks, curveType);
    if (points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    if (points.length === 2) {
      this.ctx.lineTo(points[1].x, points[1].y);
    } else {
      // Draw smooth curve using quadratic bezier curves
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        this.ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      // Last point
      this.ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }
    
    this.ctx.stroke();
  }

  // Get points for specific curve types
  private getCurvePoints(landmarks: any[], curveType: string): Array<{x: number, y: number}> {
    const landmarkIndices: Record<string, number[]> = {
      leftEyeliner: [33, 7, 163, 144, 145, 153, 154, 155, 133],
      rightEyeliner: [362, 398, 384, 385, 386, 387, 388, 466, 263]
    };

    const indices = landmarkIndices[curveType] || [];
    return indices.map(index => ({
      x: landmarks[index]?.x * this.width || 0,
      y: landmarks[index]?.y * this.height || 0
    }));
  }

  // Draw full face region
  private drawFullFace(landmarks: any[]): void {
    const facePoints = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 340, 346, 347, 348, 349, 350, 451, 452, 453, 464, 435, 410, 287, 273, 335, 406, 313, 18, 83, 182, 106, 43, 57, 186, 92, 165, 167, 164, 393, 391, 322, 410];
    
    this.ctx.beginPath();
    facePoints.forEach((pointIndex, i) => {
      const point = landmarks[pointIndex];
      if (point) {
        const x = point.x * this.width;
        const y = point.y * this.height;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });
    this.ctx.closePath();
    this.ctx.fill();
  }

  // Draw lips region
  private drawLips(landmarks: any[]): void {
    const lipPoints = [61, 84, 17, 314, 405, 291, 375, 321, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
    
    this.ctx.beginPath();
    lipPoints.forEach((pointIndex, i) => {
      const point = landmarks[pointIndex];
      if (point) {
        const x = point.x * this.width;
        const y = point.y * this.height;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });
    this.ctx.closePath();
    this.ctx.fill();
  }

  // Draw eyeshadow region
  private drawEyeshadowRegion(landmarks: any[]): void {
    // Left eyelid
    const leftEyelidPoints = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
    
    this.ctx.beginPath();
    leftEyelidPoints.forEach((pointIndex, i) => {
      const point = landmarks[pointIndex];
      if (point) {
        const x = point.x * this.width;
        const y = point.y * this.height;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });
    this.ctx.closePath();
    this.ctx.fill();
    
    // Right eyelid
    const rightEyelidPoints = [362, 398, 384, 385, 386, 387, 388, 466, 263, 374, 380, 381, 382, 373, 374, 398];
    
    this.ctx.beginPath();
    rightEyelidPoints.forEach((pointIndex, i) => {
      const point = landmarks[pointIndex];
      if (point) {
        const x = point.x * this.width;
        const y = point.y * this.height;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });
    this.ctx.closePath();
    this.ctx.fill();
  }

  // Draw bronzer region
  private drawBronzerRegion(landmarks: any[]): void {
    // Left cheekbone
    this.ctx.beginPath();
    this.ctx.arc(landmarks[234].x * this.width, landmarks[234].y * this.height, 25, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Right cheekbone
    this.ctx.beginPath();
    this.ctx.arc(landmarks[454].x * this.width, landmarks[454].y * this.height, 25, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Jawline contour
    this.ctx.beginPath();
    const jawPoints = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 451, 452, 350, 349, 348, 347, 346, 340];
    jawPoints.forEach((pointIndex, i) => {
      const point = landmarks[pointIndex];
      if (point) {
        const x = point.x * this.width;
        const y = point.y * this.height;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });
    this.ctx.closePath();
    this.ctx.fill();
  }

  // Draw beard region
  private drawBeardRegion(landmarks: any[]): void {
    const beardPoints = [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 451, 452, 350, 349, 348, 347, 346, 340];
    
    this.ctx.beginPath();
    beardPoints.forEach((pointIndex, i) => {
      const point = landmarks[pointIndex];
      if (point) {
        const x = point.x * this.width;
        const y = point.y * this.height;
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });
    this.ctx.closePath();
    this.ctx.fill();
  }
}
