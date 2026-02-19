// src/ui/App.tsx
import React, { useEffect, useRef, useState } from 'react';

// Simple Event Emitter for decoupled updates
export const uiEvents = new EventTarget();

export const App = () => {
  const fpsRef = useRef<HTMLSpanElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_score, setScore] = useState(0);

  useEffect(() => {
    // FPS Update - Direct DOM manipulation for high frequency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFps = (e: any) => {
        if (fpsRef.current) {
            fpsRef.current.innerText = Math.round(e.detail).toString();
        }
    };

    // Score Update - React State is fine for lower frequency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleScore = (e: any) => {
        setScore(e.detail);
        // Or direct ref if needed
        if (scoreRef.current) {
            scoreRef.current.innerText = Math.round(e.detail).toString();
        }
    };

    uiEvents.addEventListener('fps-update', handleFps);
    uiEvents.addEventListener('score-update', handleScore);

    return () => {
        uiEvents.removeEventListener('fps-update', handleFps);
        uiEvents.removeEventListener('score-update', handleScore);
    };
  }, []);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none', // Let touches pass through to Canvas
      fontFamily: 'monospace',
      color: 'white',
      padding: '10px'
    }}>
      <div style={{ position: 'absolute', top: 10, left: 10, fontSize: '16px' }}>
        FPS: <span ref={fpsRef}>60</span>
      </div>
      <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '24px', fontWeight: 'bold' }}>
        MASS: <span ref={scoreRef}>0</span>
      </div>
    </div>
  );
};
