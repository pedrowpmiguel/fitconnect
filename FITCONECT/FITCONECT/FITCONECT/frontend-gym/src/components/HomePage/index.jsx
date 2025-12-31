import React, { useState } from 'react';
import Login from '../../Auth/Login';
import QrcodeRead from '../QrcodeRead';
import styles from './styles.module.scss'; // Mudou de .css para .scss

const HomePage = () => {
  const [showQRCode, setShowQRCode] = useState(false);
  const [dataQrCode, setDataQrCode] = useState({});

  return (
    <div className={styles.container}>
      <div className={styles.loginSection}>
        {/* Componente de Login */}
        <Login data={dataQrCode} />
        
        {/* Seção do QR Code */}
        <div className={styles.qrSection}>
          <div className={styles.divider}>
            <span>ou</span>
          </div>
          
          <button 
            onClick={() => setShowQRCode(!showQRCode)}
            className={styles.qrButton}
            type="button"
          >
            {showQRCode ? ' Fechar Scanner' : ' Login com QR Code'}
          </button>
          
          {showQRCode && (
            <div className={styles.qrContainer}>
              <QrcodeRead setDataLogin={setDataQrCode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;