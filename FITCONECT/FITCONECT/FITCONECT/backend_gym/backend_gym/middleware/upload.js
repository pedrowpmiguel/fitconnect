import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Criar diretórios de uploads se não existirem
const uploadsDir = path.join(__dirname, '..', 'uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
const workoutProofsDir = path.join(uploadsDir, 'workout-proofs');

[profilesDir, workoutProofsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuração de armazenamento para imagens de prova de treino
const workoutProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, workoutProofsDir);
  },
  filename: (req, file, cb) => {
    // Nome único: clientId_workoutLogId_timestamp.extensão
    const clientId = req.user?._id || 'unknown';
    const workoutLogId = req.body?.workoutLogId || req.params?.workoutLogId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `proof_${clientId}_${workoutLogId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// Filtro de tipos de arquivo permitidos
const imageFileFilter = (req, file, cb) => {
  // Permitir apenas imagens
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas imagens (JPEG, PNG, GIF, WEBP) são permitidas.'), false);
  }
};

// Configuração do multer para imagens de prova de treino
export const uploadWorkoutProof = multer({
  storage: workoutProofStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1 // Apenas 1 arquivo
  }
});

// Middleware para tratamento de erros do multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Arquivo muito grande. Tamanho máximo: 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Apenas um arquivo é permitido'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Erro no upload: ${error.message}`
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Erro ao fazer upload do arquivo'
    });
  }
  
  next();
};

