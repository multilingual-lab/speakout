import { useState, useRef, useCallback } from 'react';
import scenarios, { sections } from './data/scenarios';
import TopicGrid from './components/TopicGrid';
import SceneView from './components/SceneView';
import Settings from './components/Settings';
import './styles/TopicGrid.css';
import './styles/SceneView.css';
import './styles/Shadow.css';
import './styles/Practice.css';
import './styles/Settings.css';
import './styles/Monologue.css';

export default function App() {
  const [selection, setSelection] = useState(null); // { topicId, mode }
  const [showSettings, setShowSettings] = useState(false);
  const scrollYRef = useRef(0);

  const handleSelect = useCallback((topicId, mode) => {
    scrollYRef.current = window.scrollY;
    setSelection({ topicId, mode });
  }, []);

  const handleBack = useCallback(() => {
    setSelection(null);
    requestAnimationFrame(() => window.scrollTo(0, scrollYRef.current));
  }, []);

  const scenario = selection && scenarios.find((s) => s.id === selection.topicId);

  return (
    <>
      <button className="settings-gear" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {!scenario ? (
        <TopicGrid sections={sections} onSelect={handleSelect} />
      ) : (
        <SceneView
          scenario={scenario}
          initialMode={selection.mode}
          onBack={handleBack}
        />
      )}
    </>
  );
}
