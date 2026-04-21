import { useState, useRef, useCallback } from 'react';
import scenarios, { sections } from './data/scenarios';
import TopicGrid from './components/TopicGrid';
import SceneView from './components/SceneView';
import Settings from './components/Settings';
import AuthModal from './components/AuthModal';
import { getSupportedLanguages, LANGUAGES } from './config/languages';
import { useProgress } from './hooks/useProgress';
import { useAuth } from './hooks/useAuth';
import './styles/TopicGrid.css';
import './styles/SceneView.css';
import './styles/Shadow.css';
import './styles/Practice.css';
import './styles/Settings.css';
import './styles/Monologue.css';
import './styles/Auth.css';

const LANGUAGE_STORAGE_KEY = 'speakout_language';

export default function App() {
  const supportedLanguages = getSupportedLanguages();
  const [selection, setSelection] = useState(null); // { topicId, mode }
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [language, setLanguage] = useState(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'ko';
    return supportedLanguages.includes(stored) ? stored : 'ko';
  });
  const scrollYRef = useRef(0);
  const { user, signInWithGoogle, signInWithEmail, signOut, available: authAvailable } = useAuth();
  const { data: progressData, totalCompletions } = useProgress(user?.id);

  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
  }, []);

  const handleSelect = useCallback((topicId, mode) => {
    scrollYRef.current = window.scrollY;
    setSelection({ topicId, mode });
  }, []);

  const handleBack = useCallback(() => {
    setSelection(null);
    requestAnimationFrame(() => window.scrollTo(0, scrollYRef.current));
  }, []);

  const availableLanguageIds = [...new Set(sections.map((section) => section.languageId || 'ko'))]
    .filter((languageId) => supportedLanguages.includes(languageId));
  const languageToggleOptions = availableLanguageIds
    .map((languageId) => LANGUAGES[languageId])
    .filter(Boolean);

  const activeSections = sections.filter((section) => (section.languageId || 'ko') === language);
  const activeScenarios = scenarios.filter((s) => activeSections.some((section) => section.scenarios.includes(s)));
  const scenario = selection && activeScenarios.find((s) => s.id === selection.topicId);

  return (
    <>
      {showSettings && (
        <Settings
          language={language}
          onLanguageChange={handleLanguageChange}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSignInWithGoogle={() => { setShowAuth(false); signInWithGoogle(); }}
          onSignInWithEmail={signInWithEmail}
        />
      )}
      {!scenario ? (
        <TopicGrid
          sections={activeSections}
          language={language}
          languageOptions={languageToggleOptions}
          onLanguageChange={handleLanguageChange}
          onSelect={handleSelect}
          onOpenSettings={() => setShowSettings(true)}
          progressData={progressData}
          totalCompletions={totalCompletions}
          user={user}
          authAvailable={authAvailable}
          onOpenAuth={() => setShowAuth(true)}
          onSignOut={signOut}
        />
      ) : (
        <SceneView
          scenario={scenario}
          initialMode={selection.mode}
          language={language}
          onBack={handleBack}
        />
      )}
    </>
  );
}
