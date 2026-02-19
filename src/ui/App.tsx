// src/ui/App.tsx
import React, { useEffect, useRef, useState } from 'react';

export const uiEvents = new EventTarget();

export const App = () => {
  const fpsRef = useRef<HTMLSpanElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFps = (e: any) => {
        if (fpsRef.current) {
            fpsRef.current.innerText = Math.round(e.detail).toString();
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleScore = (e: any) => {
        setScore(e.detail);
        if (scoreRef.current) {
            scoreRef.current.innerText = Math.round(e.detail).toString();
        }
    };

    const handleGameOver = () => {
        setGameOver(true);
    };

    uiEvents.addEventListener('fps-update', handleFps);
    uiEvents.addEventListener('score-update', handleScore);
    uiEvents.addEventListener('game-over', handleGameOver);

    return () => {
        uiEvents.removeEventListener('fps-update', handleFps);
        uiEvents.removeEventListener('score-update', handleScore);
        uiEvents.removeEventListener('game-over', handleGameOver);
    };
  }, []);

  const handleRespawn = () => {
      // Hard reload for phase 5 simple loop
      window.location.reload();
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
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

      {gameOver && (
        <div style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto'
        }}>
            <h1 style={{ color: 'red', fontSize: '48px' }}>YOU DIED</h1>
            <button
                onClick={handleRespawn}
                style={{
                    padding: '20px 40px',
                    fontSize: '24px',
                    backgroundColor: 'cyan',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                }}>
                MUTATE & RESPAWN
            </button>
        </div>
      )}
    </div>
  );
};
