import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { verifyToken } from '../middleware/auth.js';
import { requireCashFlowAuth } from '../middleware/cashflowAuth.js';
import {
  unlockCashFlow,
  checkCashFlowStatus,
  getOverview,
  getBankAccounts,
  getDailyPosition,
  getTransactions,
  createManualTransaction,
  uploadStatement,
  getDailyReport,
  getHierarchyReport,
  updateAccountBalance,
  exportHierarchyExcel,
  deleteTransaction,
  updateTransaction,
  resetCashFlowData
} from '../controllers/cashflow.controller.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temp uploads directory exists
const tempUploadDir = path.join(__dirname, '../../uploads/temp_stmts');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

// Multer configured with strict file filters and size limits
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `stmt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.xlsx', '.xls', '.csv', '.pdf'];
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only Excel (.xlsx, .xls), CSV (.csv), and PDF (.pdf) files are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 30 }, // 10MB limit per file, up to 30 files per batch
  fileFilter
});

const router = express.Router();

// Base middleware for all Cash Flow endpoints: User must be authenticated
router.use(verifyToken);

// Public CashFlow gate endpoints (Protected by Danzo User Auth)
router.post('/unlock', unlockCashFlow);

// Admin-only & CashFlow-unlocked Protected Endpoints
router.use(requireCashFlowAuth);

router.get('/status', checkCashFlowStatus);
router.get('/overview', getOverview);
router.get('/accounts', getBankAccounts);
router.get('/daily-position', getDailyPosition);
router.get('/transactions', getTransactions);
router.post('/transactions', createManualTransaction);
router.post('/transactions/manual', createManualTransaction);
router.put('/transactions/:id', updateTransaction);
router.delete('/transactions/:id', deleteTransaction);
router.post('/reset-data', resetCashFlowData);
router.post('/upload', upload.any(), uploadStatement);
router.post('/upload-statement', upload.any(), uploadStatement);
router.post('/upload-bulk', upload.any(), uploadStatement);
router.get('/reports/daily', getDailyReport);
router.get('/report/daily', getDailyReport);
router.get('/hierarchy', getHierarchyReport);
router.put('/account-balance', updateAccountBalance);
router.get('/export/excel', exportHierarchyExcel);

export default router;
