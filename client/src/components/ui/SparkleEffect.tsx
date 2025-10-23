import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SparkleEffectProps {
  children: React.ReactNode;
  intensity?: 'low' | 'medium' | 'high';
  color?: 'gold' | 'orange' | 'blue' | 'white';
  trigger?: 'hover' | 'scroll' | 'always';
  className?: string;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export function SparkleEffect({ 
  children, 
  intensity = 'medium', 
  color = 'gold', 
  trigger = 'hover',
  className = '' 
}: SparkleEffectProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [isActive, setIsActive] = useState(trigger === 'always');

  // Debug effect to check if component is rendering
  useEffect(() => {
    console.log('SparkleEffect mounted with trigger:', trigger, 'intensity:', intensity, 'color:', color);
  }, [trigger, intensity, color]);
  const [isInView, setIsInView] = useState(false);

  const sparkleCount = {
    low: 3,
    medium: 5,
    high: 8
  }[intensity];

  const colorClasses = {
    gold: 'text-yellow-400',
    orange: 'text-memopyk-orange',
    blue: 'text-memopyk-sky-blue',
    white: 'text-white'
  }[color];

  useEffect(() => {
    if (trigger === 'scroll' && isInView) {
      setIsActive(true);
      const timer = setTimeout(() => setIsActive(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInView, trigger]);

  useEffect(() => {
    if (!isActive) return;

    const generateSparkles = () => {
      const newSparkles: Sparkle[] = Array.from({ length: sparkleCount }, (_, i) => ({
        id: Math.random(),
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 8 + 4,
        delay: Math.random() * 2,
        duration: Math.random() * 2 + 1
      }));
      setSparkles(newSparkles);
    };

    generateSparkles();
    const interval = setInterval(generateSparkles, 3000);
    return () => clearInterval(interval);
  }, [isActive, sparkleCount]);

  useEffect(() => {
    if (trigger !== 'scroll') return;

    const currentElement = document.querySelector('[data-sparkle-trigger]');
    if (!currentElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(currentElement);
    return () => observer.disconnect();
  }, [trigger]);

  const handleMouseEnter = () => {
    if (trigger === 'hover') setIsActive(true);
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') setIsActive(false);
  };

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-sparkle-trigger={trigger === 'scroll' ? 'true' : undefined}
    >
      {children}
      
      {/* Sparkle Overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className={`absolute ${colorClasses} animate-sparkle pointer-events-none`}
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              fontSize: `${sparkle.size}px`,
              animationDelay: `${sparkle.delay}s`,
              animationDuration: `${sparkle.duration}s`,
              zIndex: 10
            }}
          >
            <Sparkles className="drop-shadow-lg filter brightness-150" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Predefined sparkle components for common use cases
export function SparkleText({ 
  children, 
  className = '',
  ...props 
}: Omit<SparkleEffectProps, 'children'> & { children: React.ReactNode; className?: string }) {
  return (
    <SparkleEffect {...props} className={className}>
      <span className="relative z-10">{children}</span>
    </SparkleEffect>
  );
}

export function SparkleCard({ 
  children, 
  className = '',
  ...props 
}: Omit<SparkleEffectProps, 'children'> & { children: React.ReactNode; className?: string }) {
  return (
    <SparkleEffect {...props} className={`rounded-lg ${className}`}>
      <div className="relative z-10">{children}</div>
    </SparkleEffect>
  );
}