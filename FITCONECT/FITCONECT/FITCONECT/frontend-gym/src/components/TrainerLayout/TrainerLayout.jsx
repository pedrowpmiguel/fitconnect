import React from 'react';
import TrainerSidebar from '../TrainerSidebar/TrainerSidebar';
import './TrainerLayout.scss';

export default function TrainerLayout({ children }) {
  return (
    <div className="trainer-layout">
      <TrainerSidebar />
      <main className="trainer-main-content">
        {children}
      </main>
    </div>
    
  );
}