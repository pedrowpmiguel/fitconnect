import React from 'react';
import './FormErrorDisplay.scss';

const FormErrorDisplay = ({ error, fieldErrors = {} }) => {
  // Se não há erro geral, retorna null
  if (!error) {
    return null;
  }

  return (
    <div className="form-error-container">
      <div className="error-message">
        <span>{error}</span>
      </div>
    </div>
  );
};

export default FormErrorDisplay;
