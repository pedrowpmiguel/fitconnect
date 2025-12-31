// ============================================================================
// FICHEIRO: src/components/ThemeToggler.jsx
// Componente de alternância de tema com design moderno
// ============================================================================

import React, { useContext } from 'react';
import ThemeContext from '../context/ThemeContext';

const ThemeToggler = () => {
  const [theme, setTheme] = useContext(ThemeContext);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="theme-toggler">
      <button 
        onClick={toggleTheme} 
        className="theme-btn"
        title={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
        aria-label={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  );
};

export default ThemeToggler;