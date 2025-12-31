import express from "express";
import User from "../models/User.js";
import Client from "../models/Client.js";
import Trainer from "../models/Trainer.js";
import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";
import crypto from "crypto";
import { validationResult } from "express-validator";
import { authenticateToken } from "../middleware/auth.js";
import { validateForgotPassword, validateResetPassword } from "../middleware/validation.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();


// gerar token
const generateToken = (userId) => {
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Definido' : 'NÃO DEFINIDO');
  console.log('JWT_EXPIRE:', process.env.JWT_EXPIRE || '7d');

  const secret = process.env.JWT_SECRET || 'my_super_secret_jwt_key_2024_gym_management_system_xyz123';
  console.log('Usando secret:', secret ? 'SIM' : 'NÃO');

  return jwt.sign(
    { userId },
    secret,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// registro de client
router.post("/register/client", async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      username, email, password, firstName, lastName,
      phone, dateOfBirth, gender,
      membershipType, goals
    } = req.body;

    // verificar se user existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email já registado' : 'Username já existe'
      });
    }

    // criar client
    const client = await Client.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      role: 'client',
      membershipType: membershipType || 'basic',
      membershipStartDate: new Date(),
      goals: goals || []
    });

    // gerar QR Code
    let qrCodeUrl = null;
    try {
      const qrData = JSON.stringify({
        userId: client._id,
        username: client.username,
        timestamp: Date.now()
      });

      qrCodeUrl = await QRCode.toDataURL(qrData);
      client.qrCode = qrCodeUrl;
      await client.save();
      console.log('QR Code gerado com sucesso');
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError);
    }

    // gerar token
    let token;
    try {
      token = generateToken(client._id);
      console.log('Token gerado com sucesso');
    } catch (tokenError) {
      console.error('Erro ao gerar token:', tokenError);
      throw new Error('Erro ao gerar token de autenticação');
    }

    // atualizar ultimo login
    try {
      client.lastLogin = new Date();
      await client.save();
      console.log('Último login atualizado');
    } catch (loginError) {
      console.error('Erro ao atualizar último login:', loginError);
    }

    res.status(201).json({
      success: true,
      message: 'Cliente registado com sucesso',
      data: {
        token,
        user: client.getPublicProfile(),
        qrCode: qrCodeUrl
      }
    });

  } catch (error) {
    console.error('Erro no registo:', error);
    console.error('Stack trace:', error.stack);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} já existe`
      });
    }

    // Erros de validação do Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(field => {
        validationErrors[field] = error.errors[field].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
});


// registro de trainer
router.post("/register/trainer", async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      username, email, password, firstName, lastName,
      phone, dateOfBirth, gender,
      specialization, experience, certification, bio, hourlyRate
    } = req.body;

    // verificar se user existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email já registado' : 'Username já existe'
      });
    }

    // criar trainer
    const trainer = await Trainer.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      role: 'trainer',
      specialization: specialization || [],
      experience: experience || 0,
      certification: certification || [],
      bio: bio || '',
      hourlyRate: hourlyRate || 0,
      isApproved: false
    });

    // gerar QR Code
    let qrCodeUrl = null;
    try {
      const qrData = JSON.stringify({
        userId: trainer._id,
        username: trainer.username,
        timestamp: Date.now()
      });

      qrCodeUrl = await QRCode.toDataURL(qrData);
      trainer.qrCode = qrCodeUrl;
      await trainer.save();
      console.log('QR Code gerado com sucesso');
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError);
    }

    // gerar token
    let token;
    try {
      token = generateToken(trainer._id);
      console.log('Token gerado com sucesso');
    } catch (tokenError) {
      console.error('Erro ao gerar token:', tokenError);
      throw new Error('Erro ao gerar token de autenticação');
    }

    // atualizar ultimo login
    try {
      trainer.lastLogin = new Date();
      await trainer.save();
      console.log('Último login atualizado');
    } catch (loginError) {
      console.error('Erro ao atualizar último login:', loginError);
    }

    res.status(201).json({
      success: true,
      message: 'Personal Trainer registado com sucesso. Aguarde aprovação do administrador.',
      data: {
        token,
        user: trainer.getPublicProfile(),
        qrCode: qrCodeUrl
      }
    });

  } catch (error) {
    console.error('Erro no registo:', error);
    console.error('Stack trace:', error.stack);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} já existe`
      });
    }

    // Erros de validação do Mongoose
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(field => {
        validationErrors[field] = error.errors[field].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
});

// registro de admin
router.post("/register/admin", authenticateToken, async (req, res) => {
  try {

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem registar novos admins.'
      });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      username, email, password, firstName, lastName,
      phone, dateOfBirth, gender,
      permissions, isSuperAdmin, department
    } = req.body;

    // verificar se user existe
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email já registado' : 'Username já existe'
      });
    }

    // criar admin
    const admin = await Admin.create({
      username,
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      role: 'admin',
      isSuperAdmin: isSuperAdmin || false,
      department: department || 'operations'
    });

    // gerar QR Code
    let qrCodeUrl = null;
    try {
      const qrData = JSON.stringify({
        userId: admin._id,
        username: admin.username,
        timestamp: Date.now()
      });

      qrCodeUrl = await QRCode.toDataURL(qrData);
      admin.qrCode = qrCodeUrl;
      await admin.save();
      console.log('QR Code gerado com sucesso');
    } catch (qrError) {
      console.error('Erro ao gerar QR Code:', qrError);
    }

    // gerar token
    let token;
    try {
      token = generateToken(admin._id);
      console.log('Token gerado com sucesso');
    } catch (tokenError) {
      console.error('Erro ao gerar token:', tokenError);
      throw new Error('Erro ao gerar token de autenticação');
    }

    // atualizar ultimo login
    try {
      admin.lastLogin = new Date();
      await admin.save();
      console.log('Último login atualizado');
    } catch (loginError) {
      console.error('Erro ao atualizar último login:', loginError);
    }

    res.status(201).json({
      success: true,
      message: 'Administrador registado com sucesso',
      data: {
        token,
        user: admin.getPublicProfile(),
        qrCode: qrCodeUrl
      }
    });

  } catch (error) {
    console.error('Erro no registo:', error);
    console.error('Stack trace:', error.stack);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} já existe`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        stack: error.stack
      } : undefined
    });
  }
});

// login de user 
router.post("/login", async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dados de entrada inválidos',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // encontrar user 
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // verificar se conta esta bloqueada
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Conta temporariamente bloqueada devido a muitas tentativas de login'
      });
    }

    // verificar se conta esta ativa
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Conta desativada'
      });
    }

    // verificar password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    // reset tentativas de login
    await user.resetLoginAttempts();

    // gerar token
    const token = generateToken(user._id);

    // atualizar ultimo login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// LOGIN COM QR CODE
router.post("/login/qr", async (req, res) => {
  try {
    console.log('🔥 Dados recebidos no /login/qr:', req.body);

    const { qrCode, username: name, password, isQrcode } = req.body;

    let qrData = qrCode || req.body;

    // Tentar parsear se qrCode for uma string JSON
    if (typeof qrCode === 'string') {
      try {
        qrData = JSON.parse(qrCode);
      } catch (e) {
        // Se não for JSON, usar como está
        qrData = qrCode;
      }
    }

    const { userId, username, timestamp } = qrData || {};

    let user = null;
    let needsPasswordCheck = false;

    // Formato padrão: QR code com userId, username e timestamp
    if (userId && username && timestamp) {
      console.log('🔄 Detectado formato padrão (JSON com ID)');

      user = await User.findById(userId);
      if (!user) {
        console.log('❌ Utilizador não encontrado:', userId);
        return res.status(401).json({
          success: false,
          message: 'QR Code inválido - utilizador não encontrado'
        });
      }

      // Verificar se o username do QR code corresponde ao do usuário
      if (user.username !== username) {
        console.log('❌ Username do QR code não corresponde:', username, 'vs', user.username);
        return res.status(401).json({
          success: false,
          message: 'QR Code inválido - dados não correspondem'
        });
      }

      // Verificar se o QR code não é de uma data absurda (ex: futuro)
      if (timestamp > Date.now()) {
        console.log('⚠️ QR Code com timestamp futuro (suspeito)');
        return res.status(401).json({
          success: false,
          message: 'QR Code inválido'
        });
      }
      console.log('✅ Utilizador encontrado (por ID):', user.username);
      // Não precisa verificar senha quando o QR code tem userId válido

    } else if (name && password && isQrcode) {
      console.log('🔄 Detectado formato alternativo (username e password)');

      user = await User.findOne({
        $or: [{ username: name }, { email: name }]
      });

      if (!user) {
        console.log('❌ Utilizador não encontrado:', name);
        return res.status(401).json({
          success: false,
          message: 'QR Code inválido - utilizador não encontrado'
        });
      }

      needsPasswordCheck = true;
      console.log('✅ Utilizador encontrado (por username):', user.username);

    } else {
      console.log('❌ Dados incompletos ou formato inválido:', req.body);
      return res.status(400).json({
        success: false,
        message: 'Dados do QR Code são obrigatórios. Formato esperado: {userId, username, timestamp} ou {username, password, isQrcode: true}'
      });
    }

    if (!user) {
      console.log('❌ Utilizador não encontrado');
      return res.status(401).json({
        success: false,
        message: 'QR Code inválido - utilizador não encontrado'
      });
    }

    console.log('✅ Utilizador encontrado:', user.username);

    // Verificar se conta está bloqueada
    if (user.isLocked) {
      console.log('❌ Conta bloqueada:', user.username);
      return res.status(423).json({
        success: false,
        message: 'Conta temporariamente bloqueada devido a muitas tentativas de login'
      });
    }

    // Verificar se conta está ativa
    if (!user.isActive) {
      console.log('❌ Conta desativada:', user.username);
      return res.status(401).json({
        success: false,
        message: 'Conta desativada'
      });
    }

    // Verificar senha apenas se necessário (formato alternativo)
    if (needsPasswordCheck) {
      const isPasswordValid = await user.matchPassword(password);
      console.log('🔑 Password válida?', isPasswordValid);

      if (!isPasswordValid) {
        console.log('❌ Password inválida');
        await user.incLoginAttempts();
        return res.status(401).json({
          success: false,
          message: 'QR Code inválido ou expirado'
        });
      }

      // Reset tentativas de login em caso de sucesso
      await user.resetLoginAttempts();
    }

    // Gerar token
    const token = generateToken(user._id);
    console.log('🎫 Token gerado');

    // Atualizar último login
    user.lastLogin = new Date();
    await user.save();

    console.log('✅ Login QR bem-sucedido:', user.username);

    res.json({
      success: true,
      message: 'Login por QR Code realizado com sucesso',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('💥 Erro no login QR:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
// logout
router.post("/logout", async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// refresh token
router.post("/refresh", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Token renovado com sucesso',
      data: {
        token,
        user: user.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mudar password (autenticado)
// ROTA PROTEGIDA - REQUER token de autenticação JWT
// O utilizador precisa de fornecer a password atual para validação
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user._id;

    // Validações básicas
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password atual é obrigatória'
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Nova password é obrigatória'
      });
    }

    if (!confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Confirmação de password é obrigatória'
      });
    }

    // Verificar se as passwords coincidem
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'As passwords não coincidem'
      });
    }

    // Verificar força da password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.{6,})/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'A nova password deve ter pelo menos 6 caracteres, incluindo uma letra minúscula, uma maiúscula e um número'
      });
    }

    // Verificar se a nova password é igual à atual
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'A nova password não pode ser igual à password atual'
      });
    }

    // Buscar o utilizador
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilizador não encontrado'
      });
    }

    // Comparar a password atual
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Password atual incorreta'
      });
    }

    // Atualizar a password
    user.password = newPassword;
    await user.save();

    // Enviar resposta de sucesso
    res.json({
      success: true,
      message: 'Password alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar password:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// ROTAS PÚBLICAS (NÃO REQUEREM AUTENTICAÇÃO)
// ============================================

// Solicitar reset de senha (forgot password)
// ROTA PÚBLICA - NÃO requer token de autenticação
// Frontend: NÃO deve enviar header Authorization
router.post("/forgot-password", validateForgotPassword, async (req, res) => {
  try {
    // Log para debug - confirmar que não há token sendo exigido
    console.log('📧 Solicitação de reset de senha recebida (rota pública)');
    
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
    // Log para debug - confirmar que não há token sendo exigido
    console.log('🔑 Solicitação de reset de senha recebida (rota pública)');
    
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