import express from 'express';
import cors from 'cors';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.routes.js';

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

app.use(express.json());

app.use('/api/auth', authRoutes);

// Rota para verificar o funcionamento da API e do MySQL
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');

        res.status(200).json({
            api: 'online',
            banco: 'conectado'
        });

    } catch (error) {
        console.error('Erro na conexão com MySQL:', error);

        res.status(500).json({
            api: 'online',
            banco: 'erro na conexão'
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
