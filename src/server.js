import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import lancamentosRoutes from './routes/lancamentos.routes.js';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ api: 'online', banco: 'conectado' });
  } catch (erro) {
    console.error('Erro ao verificar MySQL:', erro);
    return res.status(500).json({ api: 'online', banco: 'erro na conexão' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/lancamentos', lancamentosRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
