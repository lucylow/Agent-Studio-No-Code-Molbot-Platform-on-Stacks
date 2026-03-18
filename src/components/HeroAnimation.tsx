import { useEffect, useRef } from "react";

const HeroAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 540;
    const H = 320;
    canvas.width = W;
    canvas.height = H;

    let time = 0;
    let paymentProgress = 0;
    let paymentDirection = 1;
    const graphPoints: number[] = [];

    const drawBot = (x: number, y: number, color: string, label: string, bobPhase: number) => {
      const bob = Math.sin(time * 2 + bobPhase) * 4;
      const cy = y + bob;

      // Glow
      const grd = ctx.createRadialGradient(x, cy, 0, x, cy, 50);
      grd.addColorStop(0, color + "15");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.fillRect(x - 50, cy - 50, 100, 100);

      // Body
      ctx.beginPath();
      ctx.roundRect(x - 28, cy - 28, 56, 56, 12);
      ctx.fillStyle = color + "18";
      ctx.fill();
      ctx.strokeStyle = color + "80";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x - 9, cy - 4, 4, 0, Math.PI * 2);
      ctx.arc(x + 9, cy - 4, 4, 0, Math.PI * 2);
      ctx.fill();

      // Smile
      ctx.beginPath();
      ctx.arc(x, cy + 6, 8, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.strokeStyle = color + "60";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Antenna
      ctx.beginPath();
      ctx.moveTo(x, cy - 28);
      ctx.lineTo(x, cy - 44);
      ctx.strokeStyle = color + "60";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, cy - 46, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5 + Math.sin(time * 4) * 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      ctx.font = "11px 'JetBrains Mono', monospace";
      ctx.fillStyle = color + "90";
      ctx.textAlign = "center";
      ctx.fillText(label, x, cy + 46);
    };

    const drawPaymentParticle = (bot1x: number, bot2x: number, y: number) => {
      const fromX = paymentDirection > 0 ? bot1x + 30 : bot2x - 30;
      const toX = paymentDirection > 0 ? bot2x - 30 : bot1x + 30;
      const px = fromX + (toX - fromX) * paymentProgress;
      const py = y - Math.sin(paymentProgress * Math.PI) * 45;

      // Trail
      for (let i = 0; i < 5; i++) {
        const trailP = Math.max(0, paymentProgress - i * 0.04);
        const tx = fromX + (toX - fromX) * trailP;
        const ty = y - Math.sin(trailP * Math.PI) * 45;
        ctx.beginPath();
        ctx.arc(tx, ty, 2 - i * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,240,255,${0.3 - i * 0.06})`;
        ctx.fill();
      }

      // Main particle
      const grad = ctx.createRadialGradient(px, py, 0, px, py, 14);
      grad.addColorStop(0, "rgba(0,240,255,0.9)");
      grad.addColorStop(0.4, "rgba(122,47,252,0.4)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();

      // Amount label
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(0,240,255,0.85)";
      ctx.textAlign = "center";
      ctx.fillText("0.001 sBTC", px, py - 18);
    };

    const drawStreamGraph = () => {
      const graphY = 210;
      const graphH = 80;
      const graphX = 50;
      const graphW = W - 100;

      // Axes
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(graphX, graphY);
      ctx.lineTo(graphX, graphY + graphH);
      ctx.lineTo(graphX + graphW, graphY + graphH);
      ctx.stroke();

      // Grid lines
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(graphX, graphY + (graphH / 4) * i);
        ctx.lineTo(graphX + graphW, graphY + (graphH / 4) * i);
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        ctx.stroke();
      }

      // Data
      if (graphPoints.length > 100) graphPoints.shift();
      graphPoints.push(
        graphY + graphH * 0.3 + Math.sin(time * 1.8) * 15 + Math.random() * 10
      );

      if (graphPoints.length > 1) {
        // Fill
        ctx.beginPath();
        ctx.moveTo(graphX, graphPoints[0]);
        graphPoints.forEach((p, i) => {
          ctx.lineTo(graphX + (graphW / 100) * i, p);
        });
        ctx.lineTo(graphX + (graphW / 100) * (graphPoints.length - 1), graphY + graphH);
        ctx.lineTo(graphX, graphY + graphH);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, graphY, 0, graphY + graphH);
        fillGrad.addColorStop(0, "rgba(0,240,255,0.12)");
        fillGrad.addColorStop(1, "transparent");
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(graphX, graphPoints[0]);
        graphPoints.forEach((p, i) => {
          ctx.lineTo(graphX + (graphW / 100) * i, p);
        });
        ctx.strokeStyle = "rgba(0,240,255,0.6)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dot at end
        const lastX = graphX + (graphW / 100) * (graphPoints.length - 1);
        const lastY = graphPoints[graphPoints.length - 1];
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#00F0FF";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lastX, lastY, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,240,255,0.2)";
        ctx.fill();
      }

      // Labels
      ctx.font = "9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(122,47,252,0.6)";
      ctx.fillText("USDCx Stream ▸", graphX, graphY + graphH + 14);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(0,240,255,0.5)";
      ctx.fillText("x402 payments", graphX + graphW, graphY + graphH + 14);
    };

    const animate = () => {
      ctx.clearRect(0, 0, W, H);
      time += 0.016;

      const bot1x = 130;
      const bot2x = W - 130;
      const botY = 90;

      // Connection line
      ctx.beginPath();
      ctx.setLineDash([4, 6]);
      ctx.moveTo(bot1x + 30, botY);
      ctx.lineTo(bot2x - 30, botY);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      drawBot(bot1x, botY, "#00F0FF", "Agent A", 0);
      drawBot(bot2x, botY, "#7A2FFC", "Agent B", 1.5);

      // Payment animation
      paymentProgress += 0.006;
      if (paymentProgress >= 1) {
        paymentProgress = 0;
        paymentDirection *= -1;
      }
      drawPaymentParticle(bot1x, bot2x, botY);

      drawStreamGraph();

      requestAnimationFrame(animate);
    };

    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden glow-cyan-border bg-space-deep/60 backdrop-blur-sm">
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
        style={{ aspectRatio: "540/320" }}
      />
    </div>
  );
};

export default HeroAnimation;
