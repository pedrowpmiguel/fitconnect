import React from 'react';
import ClientSidebar from '../../Clients/ClientSidebar/ClientSidebar';
import './ClientLayout.scss';

export default function ClientLayout({ children }) {
  return (
    <div className="client-layout">
      <ClientSidebar />
      <main className="client-main-content">
        {children}
      </main>
    </div>
  );
}

