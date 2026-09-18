import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './src/config/database.js';
// import { startAgenda } from './src/services/agendaJobs.js';
import routes from './src/routes/index.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import cornRoutes from './src/routes/corn.route.js';
import { globalLimiter, triggerLimiter } from './src/middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiters behind reverse proxies (e.g. Render / Cloudflare / Nginx)
app.set('trust proxy', 1);

// --- UPDATED MIDDLEWARE SECTION ---

// Production environment sanity check
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('danzo_super_secret_jwt_key')) {
    console.warn('⚠️ [SECURITY WARNING]: JWT_SECRET is unset or using the default fallback in production. Please define a unique JWT_SECRET in your environment variables.');
  }
  if (!process.env.CASHFLOW_ACCESS_PASSWORD || process.env.CASHFLOW_ACCESS_PASSWORD === 'danzo-cfo-2026') {
    console.warn('⚠️ [SECURITY WARNING]: CASHFLOW_ACCESS_PASSWORD is unset or using the default fallback in production. Please set CASHFLOW_ACCESS_PASSWORD in your environment variables.');
  }
}

// 1. Helmet Configuration with Strict Security Headers & CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://apis.google.com",
        "https://accounts.google.com"
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://*.googleusercontent.com",
        "https://*.google.com",
        "https://images.unsplash.com"
      ],
      connectSrc: [
        "'self'",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://www.googleapis.com",
        "https://script.google.com",
        "https://script.googleusercontent.com",
        "https://denzo.onrender.com",
        "http://localhost:*"
      ],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  // Allows Google Login popup communication
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false
}));

// 2. CORS Configuration
const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL, 'https://denzo.onrender.com', 'http://localhost:5173', 'http://localhost:5174']
  : ['https://denzo.onrender.com', 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- ROUTES & STATIC FILES ---

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Protected API routes with rate limiting
app.use('/api', globalLimiter, routes);
app.use('/cron', triggerLimiter, cornRoutes);

// Serve static files from the client build folder
// Note: Adjusted path assuming your folder structure is /server/app.js and /client/dist
app.use(express.static(path.join(__dirname, '../client/dist')));

// Handle React Router - Ensure non-API requests serve the frontend
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    next();
  }
});

app.use(errorHandler);

const startServer = async () => {
  try {
    console.log('🚀 Starting server initialization...');
    await connectDB();
    console.log('✅ MongoDB connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
    });

    // await startAgenda();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;