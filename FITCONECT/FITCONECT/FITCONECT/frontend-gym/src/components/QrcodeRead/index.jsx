import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import styles from "./styles.module.scss";

function QrcodeRead({ setDataLogin }) {
  const [data, setData] = useState({ name: "Aguardando leitura..." });
  const [scanned, setScanned] = useState(false);

  const handleScan = (results) => {
    if (results && results.length > 0 && !scanned) {
      const result = results[0];
      console.log('QR Code raw:', result.rawValue);
      
      try {
        // Tentar decodificar
        const decodedValue = decodeURI(result.rawValue);
        console.log(' Valor decodificado:', decodedValue);
        
        let qrData;
        
        // Tentar formato JSON primeiro
        try {
          const jsonData = JSON.parse(decodedValue);
          console.log('Formato JSON detectado:', jsonData);
          
          // Formato: {userId, username, timestamp}
          if (jsonData.userId && jsonData.username) {
            qrData = {
              username: jsonData.username,   
              userId: jsonData.userId,
              timestamp: jsonData.timestamp,
              isQrcode: true
            };
            console.log(' Dados formatados (JSON):', qrData);
          }
        } catch (jsonError) {
          // Não é JSON, tentar formato username&&password
          console.log(' Não é JSON, tentando formato username&&password');
          
          const parts = decodedValue.split("&&");
          console.log(' Partes separadas:', parts);
          
          if (parts.length >= 2) {
            qrData = {
              username: parts[0].trim(),     
              password: parts[1].trim(),
              isQrcode: true
            };
            console.log('📦 Dados formatados (username&&password):', qrData);
          }
        }
        
        if (qrData) {
          console.log('✅ Enviando dados para Login:', qrData);
          setData({ name: qrData.username });
          setDataLogin(qrData); 
          setScanned(true);
        } else {
          console.error('QR Code em formato não reconhecido');
          setData({ name: "QR Code em formato inválido" });
        }
        
      } catch (error) {
        console.error(' Erro ao processar QR Code:', error);
        setData({ name: "Erro ao ler QR Code" });
      }
    }
  };

  const handleError = (error) => {
    console.error('Scanner error:', error);
  };

  if (scanned) {
    return (
      <div className={styles.qrCodeReader}>
        <div className={styles.success}>
          <p>QR Code lido com sucesso!</p>
          <p>Utilizador: {data.name}</p>
          <p>A fazer login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.qrCodeReader}>
      <div className={styles.instructions}>
        <p>Aponte a câmera para o QR Code</p>
      </div>
      <Scanner
        onScan={handleScan}
        onError={handleError}
        constraints={{
          facingMode: "environment",
        }}
        scanDelay={300}
        styles={{
          container: {
            width: '100%',
            maxWidth: '400px'
          }
        }}
      />
      <p className={styles.status}>{data.name || "Aguardando..."}</p>
    </div>
  );
}

export default QrcodeRead;