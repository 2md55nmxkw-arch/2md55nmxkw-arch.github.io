import { resizeCanvas } from "./dom";

export type Star = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  length: number;
  opacity: number;
};

let active = false;

export function moveStar(star: Star, seconds: number): void {
  star.x += star.velocityX * seconds;
  star.y += star.velocityY * seconds;
}

export function showShootingStars(): void {
  if (active) return;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;
  active = true;
  canvas.id = "rain";
  document.body.appendChild(canvas);
  let stars: Star[] = [];
  let lastTime = performance.now();
  let spawnBudget = 0;
  let frame = 0;
  const end = lastTime + 7000;
  const resize = () => resizeCanvas(canvas, context);

  function draw(now: number): void {
    if (!context) return;
    const seconds = Math.min(0.064, (now - lastTime) / 1000);
    lastTime = now;
    context.clearRect(0, 0, innerWidth, innerHeight);
    if (now < end) {
      // Preserve the original density: 120 spawn attempts per second.
      spawnBudget += seconds * 120;
      while (spawnBudget >= 1) {
        spawnBudget--;
        if (Math.random() >= 0.22) continue;
        stars.push({
          x: Math.random() * innerWidth * 1.4,
          y: -50,
          velocityX: -(240 + Math.random() * 240),
          velocityY: 420 + Math.random() * 420,
          length: 90 + Math.random() * 130,
          opacity: 0.6 + Math.random() * 0.4,
        });
      }
    }
    for (const star of stars) {
      moveStar(star, seconds);
      const speed = Math.hypot(star.velocityX, star.velocityY);
      const tailX = star.x - star.velocityX / speed * star.length;
      const tailY = star.y - star.velocityY / speed * star.length;
      const gradient = context.createLinearGradient(star.x, star.y, tailX, tailY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
      gradient.addColorStop(0.3, `rgba(185, 164, 255, ${star.opacity * 0.5})`);
      gradient.addColorStop(1, "rgba(185, 164, 255, 0)");
      context.strokeStyle = gradient;
      context.lineWidth = 2;
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(star.x, star.y);
      context.lineTo(tailX, tailY);
      context.stroke();
      context.fillStyle = "#fff";
      context.beginPath();
      context.arc(star.x, star.y, 2.2, 0, Math.PI * 2);
      context.fill();
    }
    stars = stars.filter((star) => star.y < innerHeight + 250 && star.x > -350);
    if (now < end || stars.length) frame = requestAnimationFrame(draw);
    else {
      active = false;
      removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
      canvas.remove();
    }
  }

  function visibility(): void {
    cancelAnimationFrame(frame);
    if (!document.hidden) {
      lastTime = performance.now();
      frame = requestAnimationFrame(draw);
    }
  }

  resize();
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", visibility);
  frame = requestAnimationFrame(draw);
}
