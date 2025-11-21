import express from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import logger from '@/utils/logger';
import { CORS_ALLOWED_ORIGINS, SERVER_PORT } from '@/config/constants';
import { connectDatabase } from '@/config/database';
import routes from '@/routes';
import socketService from '@/socket/socket';

const app = express();
const httpServer = createServer(app);

app.use(cookieParser());

// Middleware to parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration (restrict to specific domains for production)
const corsOptions = {
  origin: CORS_ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// API routes
app.use('/api', routes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Redirect all routes to frontend (SPA support)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start server
async function initializeServer() {
    try {
        // Connect to database
        await connectDatabase();
        logger.info('Database connected successfully');
        
        // Initialize Socket.io
        socketService.initialize(httpServer);
        logger.info('Socket.io initialized');
        
        // Start server
        httpServer.listen(SERVER_PORT, () => {
          logger.info(`Server is running at http://localhost:${SERVER_PORT}`);
        });
    } catch (error) {
        logger.error('Failed to initialize server:', error);
        process.exit(1);
    }
}

// Start the server
initializeServer();
