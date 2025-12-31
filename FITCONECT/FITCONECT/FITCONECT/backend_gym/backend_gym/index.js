// Configurar variáveis de ambiente PRIMEIRO
import dotenv from "dotenv";
dotenv.config();

// Verificar se as variáveis de ambiente foram carregadas
console.log('JWT_SECRET carregado:', process.env.JWT_SECRET ? 'SIM' : 'NÃO');
console.log('NODE_ENV:', process.env.NODE_ENV);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import swaggerUi from "swagger-ui-express";

// Importar rotas
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import publicUserRoutes from "./routes/publicUsers.js";
import workoutRoutes from "./routes/workouts.js";
import clientWorkoutRoutes from "./routes/clientWorkouts.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messages.js";
import trainerRequestsRoutes from "./routes/trainerRequests.js";
import uploadRoutes from "./routes/uploads.js";

// Importar middleware
import { authenticateToken } from "./middleware/auth.js";
import { createServer } from 'http';
import { Server } from 'socket.io';

// Conectar à base de dados (aguardar a conexão antes de iniciar o servidor)
await connectDB();

const app = express();

const httpServer = createServer(app);

// Configurar Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware de segurança
app.use(helmet());

// Configurar CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://fitconnect-xi.vercel.app",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Socket.IO - Gestão de Conexões
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Quando um usuário se autentica, associá-lo ao seu userId
  socket.on('authenticate', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`✅ User ${userId} autenticado no socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

// Disponibilizar io globalmente para as rotas
app.set('io', io);



// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos (imagens de prova de treino e perfis)
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar configuração do Swagger
const swaggerDoc = JSON.parse(fs.readFileSync(path.join(__dirname, './doc/api.json'), 'utf8'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware de logging (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor funcionando corretamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota do Swagger - Documentação da API
app.use('/api/docs', swaggerUi.serve);
app.get('/api/docs', swaggerUi.setup(swaggerDoc, {
  swaggerOptions: {
    url: '/api/docs/swagger.json'
  }
}));

// Endpoint para servir o arquivo swagger.json
app.get('/api/docs/swagger.json', (req, res) => {
  res.json(swaggerDoc);
});

// Rotas da API
app.use("/api/auth", authRoutes);

// Rotas de users com autenticação condicional
// Rotas públicas: /forgot-password, /reset-password (NÃO requerem autenticação)
// Todas as outras rotas requerem autenticação

// IMPORTANTE: Registrar rotas públicas ANTES das rotas protegidas
// O Express processa middlewares em ordem, então rotas públicas serão processadas primeiro
// Se o router público não encontrar a rota, ele chama next() e passa para o próximo router

// Registrar router público primeiro (sem autenticação)
app.use("/api/users", publicUserRoutes);

// Registrar router protegido depois (com autenticação)
// IMPORTANTE: Este router só será processado se o router público não encontrar a rota
app.use("/api/users", authenticateToken, userRoutes);
app.use("/api/uploads", authenticateToken, uploadRoutes);
app.use("/api/workouts", authenticateToken, workoutRoutes);
app.use("/api/client/workouts", authenticateToken, clientWorkoutRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes);
app.use("/api/messages", authenticateToken, messageRoutes);
app.use("/api/trainer-requests", authenticateToken, trainerRequestsRoutes);

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro global:', error);
  
  // Erro de validação do Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Erro de validação',
      errors
    });
  }
  
  // Erro de duplicação do Mongoose
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} já existe`
    });
  }
  
  // Erro de cast do Mongoose
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID inválido'
    });
  }
  
  // Erro padrão
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Configurar porta
const PORT = process.env.PORT || 3000;


// Iniciar servidor usando httpServer
httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Socket.IO ativo`);
});


// Tratamento de sinais para encerramento graceful
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido. Encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido. Encerrando servidor...');
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
  process.exit(1);
});
