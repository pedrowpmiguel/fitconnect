import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import styles from "./styles.module.scss";

function QrcodeCreate({ user = { username: "", password: "" } }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (user.username && user.password) {
      // Gerar QR Code no formato: username&&password
      const qrData = `${user.username}&&${user.password}`;
      const encodedData = encodeURI(qrData);
      setValue(encodedData);
      console.log('QR Code gerado para:', user.username);
    }
  }, [user]);

  if (!user.username || !user.password) {
    return (
      <div className={styles.qrCodeCreate}>
        <p>QR Code não disponível</p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Faça logout e login novamente para gerar o QR Code
        </p>
      </div>
    );
  }

  return (
    <div className={styles.qrCodeCreate}>
      <QRCode
        size={256}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        value={value}
        viewBox={`0 0 256 256`}
        level="H"
      />
    </div>
  );
}

export default QrcodeCreate;