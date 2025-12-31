import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Criar diretório de uploads se não existir
const uploadsDir = path.join(__dirname, '..', 'uploads', 'general');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração de armazenamento para uploads gerais
const generalUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${name}_${timestamp}_${random}${ext}`;
    cb(null, filename);
  }
});

// Filtro para aceitar apenas imagens
const imageFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas imagens (JPEG, PNG, GIF, WEBP) são permitidas.'), false);
  }
};

// Configuração do multer para uploads gerais
const uploadGeneral = multer({
  storage: generalUploadStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 10 // Máximo 10 arquivos
  }
});

// Middleware para tratamento de erros do multer
const handleUploadError = (error, req, res, next) => {
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
        message: 'Máximo 10 arquivos permitidos'
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

// Rota para upload de múltiplas imagens
router.post('/', uploadGeneral.array('files', 10), handleUploadError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }

    // Criar URLs para cada arquivo enviado
    const urls = req.files.map(file => `/uploads/general/${file.filename}`);
    const files = req.files.map(file => ({
      filename: file.filename,
      url: `/uploads/general/${file.filename}`,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    res.json({
      success: true,
      message: 'Arquivos enviados com sucesso',
      data: {
        urls,
        files
      }
    });

  } catch (error) {
    console.error('Erro ao fazer upload de arquivos:', error);
    
    // Se houve erro e arquivos foram enviados, deletá-los
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join(uploadsDir, file.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error('Erro ao deletar arquivo:', err);
          }
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao fazer upload de arquivos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
