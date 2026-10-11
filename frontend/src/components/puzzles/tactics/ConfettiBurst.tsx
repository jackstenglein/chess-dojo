'use client';

import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    spin: number;
    life: number;
}

const COLORS = ['#ffd54f', '#ff8a65', '#4fc3f7', '#aed581', '#ba68c8', '#ffffff'];

/**
 * Lightweight canvas confetti burst. No dependencies.
 * Mount it when a puzzle/session ends with checkmate; it plays
 * once (~2.5s) then unmounts itself via onDone.
 */
export function ConfettiBurst({ onDone }: { onDone?: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const doneRef = useRef(onDone);
    doneRef.current = onDone;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const particles: Particle[] = Array.from({ length: 160 }, () => ({
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 240,
            y: window.innerHeight * 0.35,
            vx: (Math.random() - 0.5) * 11,
            vy: Math.random() * -9 - 3,
            size: Math.random() * 7 + 4,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rotation: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.3,
            life: 1,
        }));

        let raf = 0;
        const start = performance.now();
        const tick = (now: number) => {
            const elapsed = now - start;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.vy += 0.28;
                p.vx *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.spin;
                p.life = Math.max(0, 1 - elapsed / 2500);
                ctx.save();
                ctx.globalAlpha = p.life;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            }
            if (elapsed < 2600) {
                raf = requestAnimationFrame(tick);
            } else {
                doneRef.current?.();
            }
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 2000,
            }}
        />
    );
}
