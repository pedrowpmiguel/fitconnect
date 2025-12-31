import express from "express";
import User from "../models/User.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { validateForgotPassword, validateResetPassword } from "../middleware/validation.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();

// Função auxiliar para gerar token JWT
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'my_super_secret_jwt_key_2024_gym_management_system_xyz123';
  return jwt.sign(
    { userId },
    secret,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};


router.post("/forgot-password", (req, res, next) => {
  console.log('🔍 [VALIDATION] Middleware de validação chamado para /forgot-password');
  console.log('🔍 [VALIDATION] Path:', req.path);
  console.log('🔍 [VALIDATION] Method:', req.method);
  console.log('🔍 [VALIDATION] Body recebido:', req.body);
  next();
}, validateForgotPassword, async (req, res) => {
  try {
    console.log('📧 [PUBLIC ROUTE] Handler de forgot-password executado!');
    console.log('📧 [PUBLIC ROUTE] Solicitação de reset de senha recebida em /api/users/forgot-password');
    console.log('📧 [PUBLIC ROUTE] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📧 [PUBLIC ROUTE] Body:', JSON.stringify(req.body, null, 2));
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    // Buscar usuário por email
    const user = await User.findOne({ email });

    // Por segurança, sempre retornar sucesso mesmo se o email não existir
    // Isso previne enumeração de emails
    if (!user) {
      return res.json({
        success: true,
        message: 'Se o email existir, você receberá um link para redefinir sua senha'
      });
    }

    // Verificar se a conta está ativa
    if (!user.isActive) {
      return res.json({
        success: true,
        message: 'Se o email existir, você receberá um link para redefinir sua senha'
      });
    }

    // Gerar token de reset
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Enviar email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.firstName);
      
      res.json({
        success: true,
        message: 'Email de reset de senha enviado com sucesso'
      });
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      
      // Se falhar o envio, limpar o token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email. Tente novamente mais tarde.'
      });
    }

  } catch (error) {
    console.error('Erro ao solicitar reset de senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Resetar senha com token de reset
// ROTA PÚBLICA - NÃO requer token de autenticação JWT
// Frontend: NÃO deve enviar header Authorization
// Usa token de reset de senha (enviado por email) no body da requisição
router.post("/reset-password", validateResetPassword, async (req, res) => {
  try {
    console.log('🔑 Solicitação de reset de senha recebida em /api/users/reset-password (rota pública)');
    
    const { token, password } = req.body;

    // Hash do token recebido para comparar com o do banco
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Buscar usuário com o token válido e não expirado
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }

    // Verificar se a conta está ativa
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Conta desativada'
      });
    }

    // Atualizar senha
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Gerar token de autenticação
    const authToken = generateToken(user._id);

    res.json({
      success: true,
      message: 'Senha redefinida com sucesso',
      data: {
        token: authToken,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

