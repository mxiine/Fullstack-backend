import express from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { listarLancamentosEResumo } from '../models/lancamento.model.js';

const router = express.Router();

function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}

function mesAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ultimoDia = new Date(ano, hoje.getMonth() + 1, 0).getDate();
  return {
    inicio: `${ano}-${mes}-01`,
    fim: `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`,
  };
}

// GET /api/lancamentos?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&pagina=1&porPagina=10
// Nesta primeira etapa, a rota atende a listagem e os totais do Dashboard.
router.get('/', autenticar, async (req, res) => {
  const padrao = mesAtual();
  const inicio = req.query.inicio || padrao.inicio;
  const fim = req.query.fim || padrao.fim;

  if (!dataValida(inicio) || !dataValida(fim) || inicio > fim) {
    return res.status(400).json({
      erro: 'Período inválido.',
      campos: {
        inicio: 'Informe uma data válida no formato AAAA-MM-DD.',
        fim: 'Informe uma data final válida e igual ou posterior à inicial.',
      },
    });
  }

  const pagina = Number.parseInt(req.query.pagina ?? '1', 10);
  const porPagina = Number.parseInt(req.query.porPagina ?? '10', 10);

  if (!Number.isInteger(pagina) || pagina < 1 ||
      !Number.isInteger(porPagina) || porPagina < 1 || porPagina > 100) {
    return res.status(400).json({ erro: 'Parâmetros de paginação inválidos.' });
  }

  try {
    const resultado = await listarLancamentosEResumo({
      usuarioId: req.usuarioId,
      inicio,
      fim,
      pagina,
      porPagina,
    });

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error('Erro ao listar lançamentos:', erro);
    return res.status(500).json({ erro: 'Erro ao consultar lançamentos.' });
  }
});

export default router;
