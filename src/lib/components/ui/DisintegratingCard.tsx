"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
}

interface DisintegratingCardProps {
  children: React.ReactNode;
  isVisible: boolean;
  onAnimationComplete?: () => void;
}

export function DisintegratingCard({ children, onAnimationComplete }: DisintegratingCardProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const startDisintegration = () => {
    const particleCount = 60; // More particles for better effect
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
        newParticles.push({
            id: i,
            x: (Math.random() - 0.5) * 100, 
            y: (Math.random() - 0.5) * 100,
            size: Math.random() * 3 + 1,
            color: Math.random() > 0.5 ? "#818cf8" : "#c084fc",
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15 - 10, 
        });
    }
    setParticles(newParticles);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 0.95,
        transition: { duration: 0.5 }
      }}
      onAnimationStart={(definition) => {
        // definition is the defined animation target
        if ((definition as any).opacity === 0) {
          startDisintegration();
        }
      }}
      onAnimationComplete={() => {
        // If we were animating to opacity 0, we finished the exit
        onAnimationComplete?.();
      }}
      className="relative h-full"
    >
      {children}

      {/* Particle Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-50">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ 
              x: p.x + p.vx * 30, 
              y: p.y + p.vy * 30, 
              opacity: 0,
              scale: 0,
              rotate: Math.random() * 720
            }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              position: "absolute",
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: "50%",
              boxShadow: `0 0 10px ${p.color}`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
