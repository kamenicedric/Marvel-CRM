
import React, { useState, useEffect } from 'react';
import { Space, TeamMember } from './types.ts';
import Auth from './components/Auth.tsx';
import MasterDashboard from './components/MasterDashboard.tsx';

const App: React.FC = () => {
  const [currentSpace, setCurrentSpace] = useState<Space | null>(null);
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Restore session if needed
  useEffect(() => {
    const savedSpaceId = localStorage.getItem('marvel_current_space');
    const authStatus = localStorage.getItem('marvel_auth');
    const savedMember = localStorage.getItem('marvel_current_member');

    // SÉCURITÉ : Déconnexion forcée au rafraîchissement pour Manager/Admin
    // Si l'espace sauvegardé est critique, on ne restaure pas la session et on nettoie le storage
    if (savedSpaceId && ['nar6', 'manager'].includes(savedSpaceId)) {
      localStorage.removeItem('marvel_current_space');
      localStorage.removeItem('marvel_auth');
      localStorage.removeItem('marvel_current_member');
      return;
    }

    if (authStatus === 'true' && savedSpaceId) {
      import('./constants.tsx').then(({ SPACES }) => {
        const space = SPACES.find((s: Space) => s.id === savedSpaceId);
        if (space) {
          setCurrentSpace(space);
          if (savedMember) setCurrentMember(JSON.parse(savedMember));
          setIsAuthenticated(true);
        }
      });
    }
  }, []);

  const handleAuthenticated = (space: Space, member?: TeamMember) => {
    setCurrentSpace(space);
    if (member) {
      setCurrentMember(member);
      localStorage.setItem('marvel_current_member', JSON.stringify(member));
    }
    setIsAuthenticated(true);
    localStorage.setItem('marvel_current_space', space.id);
    localStorage.setItem('marvel_auth', 'true');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentSpace(null);
    setCurrentMember(null);
    localStorage.removeItem('marvel_current_space');
    localStorage.removeItem('marvel_auth');
    localStorage.removeItem('marvel_current_member');
  };

  const handleSwitchSpace = (space: Space) => {
    setCurrentSpace(space);
    localStorage.setItem('marvel_current_space', space.id);
  };

  return (
    <div className="min-h-screen font-sans antialiased text-slate-900 bg-[#F8FAFC]">
      {!isAuthenticated || !currentSpace ? (
        <Auth onAuthenticated={handleAuthenticated} />
      ) : (
        <MasterDashboard
          space={currentSpace}
          member={currentMember}
          onLogout={handleLogout}
          onSwitchSpace={handleSwitchSpace}
        />
      )}
    </div>
  );
};

export default App;
