import { useState } from 'react';
import scenarios, { sections } from './data/scenarios';
import TopicGrid from './components/TopicGrid';
import SceneView from './components/SceneView';
import './styles/TopicGrid.css';
import './styles/SceneView.css';
import './styles/Shadow.css';
import './styles/Practice.css';

export default function App() {
  const [selection, setSelection] = useState(null); // { topicId, mode }

  const scenario = selection && scenarios.find((s) => s.id === selection.topicId);

  if (!scenario) {
    return <TopicGrid sections={sections} onSelect={(topicId, mode) => setSelection({ topicId, mode })} />;
  }

  return (
    <SceneView
      scenario={scenario}
      initialMode={selection.mode}
      onBack={() => setSelection(null)}
    />
  );
}
