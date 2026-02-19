import { useState, useEffect } from 'react';

// Simple EventBus or custom event listener to update UI from game
// In a real app, we'd use a more robust state management or Context linked to game events.
// For now, we listen to custom window events.

export const App = () => {
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);

  useEffect(() => {
    const handleScore = (e: any) => setScore(e.detail);
    const handleHealth = (e: any) => setHealth(e.detail);

    window.addEventListener('abyce-score', handleScore);
    window.addEventListener('abyce-health', handleHealth);

    return () => {
      window.removeEventListener('abyce-score', handleScore);
      window.removeEventListener('abyce-health', handleHealth);
    };
  }, []);

  return (
    <div style={{ padding: '20px', color: 'white', fontFamily: 'Arial, sans-serif', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h2>DNA: {score}</h2>
        </div>
        <div>
          <h2>Health: {health}%</h2>
        </div>
      </div>

      {/* Debug Controls */}
      <div style={{ position: 'absolute', bottom: '20px', left: '20px' }}>
        <button onClick={() => window.dispatchEvent(new CustomEvent('abyce-ad-req', { detail: 'rewarded' }))}>
          Watch Ad (Reward)
        </button>
      </div>
    </div>
  );
};
