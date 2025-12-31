import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: "8240579@estg.ipp.pt",  
    pass: "tmqdlvhdfcxcfnqn"      
  }
});

    // 🔥 VERIFICA SMTP NO ARRANQUE
    transporter.verify()
      .then(() => console.log('✅ SMTP PRONTO'))
      .catch(err => {
        console.error('❌ ERRO SMTP:', err.message);
      });

    return transporter;
  }

  console.warn('⚠️ SMTP não configurado. Emails serão apenas logados no console.');

  return {
    sendMail: async (options) => {
      console.log('📧 Email simulado:');
      console.log(options);
      return { messageId: 'fake-message-id' };
    }
  };
};

const transporter = createTransporter();


// Função para enviar email de reset de senha
export const sendPasswordResetEmail = async (email, resetToken, firstName) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@fitconect.com',
      to: email,
      subject: 'Reset de Senha - FITCONECT',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>FITCONECT</h1>
            </div>
            <div class="content">
              <h2>Olá ${firstName || 'Utilizador'}!</h2>
              <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
              <p>Clique no botão abaixo para redefinir sua senha:</p>
              <a href="${resetUrl}" class="button">Redefinir Senha</a>
              <p>Ou copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; color: #4CAF50;">${resetUrl}</p>
              <p><strong>Este link expira em 10 minutos.</strong></p>
              <p>Se você não solicitou esta redefinição, ignore este email.</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} FITCONECT. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá ${firstName || 'Utilizador'}!
        
        Recebemos uma solicitação para redefinir a senha da sua conta.
        
        Clique no link abaixo para redefinir sua senha:
        ${resetUrl}
        
        Este link expira em 10 minutos.
        
        Se você não solicitou esta redefinição, ignore este email.
        
        Este é um email automático, por favor não responda.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de reset de senha enviado:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Erro ao enviar email de reset de senha:', error);
    throw error;
  }
};

export default {
  sendPasswordResetEmail
};

