import React, { useEffect, useRef } from 'react';
import '../../styles/petals.css';

interface Petal {
  x: number;
  y: number;
  depth: 'bg' | 'mid' | 'fg';
  size: number;
  speedY: number;
  driftX: number;
  swaySpeed: number;
  swayOffset: number;
  angle: number;
  angularSpeed: number;
  flip: number;
  flipSpeed: number;
  opacity: number;
  colorType: 'rose' | 'jasmine' | 'marigold';
  isBurst?: boolean;
}

interface GlobalPetalLayerProps {
  isActive: boolean;
}

export const GlobalPetalLayer: React.FC<GlobalPetalLayerProps> = ({ isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const petalsRef = useRef<Petal[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const opacityRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const isMobile = width < 768;
    // Exactly 30% reduction from original baseline (42 -> 29 desktop, 26 -> 18 mobile)
    const targetCount = isMobile ? 18 : 29;

    const createPetal = (startY?: number, isBurst = false): Petal => {
      const rand = Math.random();
      const depth: 'bg' | 'mid' | 'fg' = rand < 0.35 ? 'bg' : rand < 0.8 ? 'mid' : 'fg';

      let size = 16;
      let speedY = 1.3;
      let opacity = 0.75;

      if (depth === 'bg') {
        size = 10 + Math.random() * 5;
        speedY = 0.6 + Math.random() * 0.45;
        opacity = 0.35 + Math.random() * 0.2;
      } else if (depth === 'mid') {
        size = 16 + Math.random() * 6;
        speedY = 1.1 + Math.random() * 0.6;
        opacity = 0.65 + Math.random() * 0.2;
      } else {
        size = 23 + Math.random() * 8;
        speedY = 1.8 + Math.random() * 0.8;
        opacity = 0.85 + Math.random() * 0.15;
      }

      // Refined floral balance: soft blush rose (60%), delicate white jasmine (25%), golden marigold (15%)
      const colorRand = Math.random();
      const colorType: 'rose' | 'jasmine' | 'marigold' =
        colorRand < 0.6 ? 'rose' : colorRand < 0.85 ? 'jasmine' : 'marigold';

      return {
        x: Math.random() * width,
        y: startY !== undefined ? startY : Math.random() * height,
        depth,
        size,
        speedY,
        driftX: (Math.random() - 0.5) * 0.8,
        swaySpeed: 0.012 + Math.random() * 0.016,
        swayOffset: Math.random() * Math.PI * 2,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.025,
        flip: Math.random() * Math.PI,
        flipSpeed: 0.02 + Math.random() * 0.03,
        opacity,
        colorType,
        isBurst,
      };
    };

    // Initialize ambient petals across full viewport
    petalsRef.current = [];
    for (let i = 0; i < targetCount; i++) {
      petalsRef.current.push(createPetal());
    }

    // Additive flourish listener (proportionately reduced by 30%: 30 -> 21 desktop, 18 -> 13 mobile)
    const handleBurst = () => {
      const burstCount = isMobile ? 13 : 21;
      for (let i = 0; i < burstCount; i++) {
        petalsRef.current.push(createPetal(-20 - Math.random() * 80, true));
      }
    };

    window.addEventListener('wedding:petal-burst', handleBurst);

    // Render loop
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.666, 2.0); // Normalised delta
      lastTime = now;

      // Smooth layer fade-in
      if (opacityRef.current < 1) {
        opacityRef.current = Math.min(1, opacityRef.current + 0.025 * dt);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = opacityRef.current;

      const petals = petalsRef.current;

      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i];

        // Physics update
        p.swayOffset += p.swaySpeed * dt;
        p.flip += p.flipSpeed * dt;
        p.angle += p.angularSpeed * dt;

        const lateralSway = Math.sin(p.swayOffset) * (p.depth === 'bg' ? 0.7 : p.depth === 'mid' ? 1.2 : 1.8);
        p.x += (p.driftX + lateralSway) * dt;
        p.y += p.speedY * dt;

        // Wrap around horizontally
        if (p.x < -40) p.x = width + 40;
        if (p.x > width + 40) p.x = -40;

        // Out of bottom boundary check
        if (p.y > height + 40) {
          if (p.isBurst) {
            // Remove burst petals once they leave screen
            petals.splice(i, 1);
            continue;
          } else {
            // Respawn ambient petals gently at top
            petals[i] = createPetal(-30);
            continue;
          }
        }

        // Render individual petal
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        // Realistic 3D flutter perspective
        const flutterScale = Math.cos(p.flip);
        ctx.scale(1, Math.max(0.15, Math.abs(flutterScale)));

        ctx.globalAlpha = opacityRef.current * p.opacity;

        // Draw organic curved petal geometry
        ctx.beginPath();
        const s = p.size;
        ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.7, -s * 0.55, s * 0.85, s * 0.45, 0, s);
        ctx.bezierCurveTo(-s * 0.85, s * 0.45, -s * 0.7, -s * 0.55, 0, -s);

        if (p.colorType === 'rose') {
          const grad = ctx.createRadialGradient(-s * 0.2, -s * 0.3, 0, 0, 0, s * 1.2);
          grad.addColorStop(0, '#ffe4e6'); // Rose 100
          grad.addColorStop(0.4, '#fda4af'); // Rose 300
          grad.addColorStop(1, '#f43f5e'); // Rose 500
          ctx.fillStyle = grad;
        } else if (p.colorType === 'jasmine') {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.7, '#fef9c3'); // Soft cream
          grad.addColorStop(1, '#fef08a'); // Jasmine yellow
          ctx.fillStyle = grad;
        } else {
          // Marigold / Festive Gold
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
          grad.addColorStop(0, '#fef08a');
          grad.addColorStop(0.6, '#fde047');
          grad.addColorStop(1, '#f59e0b');
          ctx.fillStyle = grad;
        }

        ctx.fill();

        // Subtle petal spine / vein highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.75);
        ctx.lineTo(0, s * 0.7);
        ctx.stroke();

        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('wedding:petal-burst', handleBurst);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="global-petal-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="global-petal-canvas" />
    </div>
  );
};
