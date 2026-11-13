import { pool } from '../config/database.js';

export async function listarLancamentosEResumo({ usuarioId, inicio, fim, pagina, porPagina }) {
  const offset = (pagina - 1) * porPagina;

  const [totaisRows] = await pool.execute(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE 0 END), 0) AS entradas,
       COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor ELSE 0 END), 0) AS saidas
     FROM lancamentos
     WHERE usuario_id = ? AND data BETWEEN ? AND ?`,
    [usuarioId, inicio, fim]
  );

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM lancamentos
     WHERE usuario_id = ? AND data BETWEEN ? AND ?`,
    [usuarioId, inicio, fim]
  );

  const [rows] = await pool.execute(
    `SELECT
       l.id,
       l.tipo,
       l.descricao,
       l.valor,
       DATE_FORMAT(l.data, '%Y-%m-%d') AS data,
       l.categoria_id AS categoriaId,
       c.nome AS categoria,
       l.fonte_destino_id AS fonteDestinoId,
       fd.nome AS fonteDestino,
       l.parcela_atual AS parcelaAtual,
       l.total_parcelas AS totalParcelas,
       l.grupo_parcelamento AS grupoParcelamento
     FROM lancamentos l
     INNER JOIN categorias c
       ON c.id = l.categoria_id AND c.usuario_id = l.usuario_id
     INNER JOIN fontes_destinos fd
       ON fd.id = l.fonte_destino_id AND fd.usuario_id = l.usuario_id
     WHERE l.usuario_id = ? AND l.data BETWEEN ? AND ?
     ORDER BY l.data DESC, l.id DESC
     LIMIT ? OFFSET ?`,
    [usuarioId, inicio, fim, porPagina, offset]
  );

  const entradas = Number(totaisRows[0]?.entradas || 0);
  const saidas = Number(totaisRows[0]?.saidas || 0);
  const total = Number(countRows[0]?.total || 0);

  return {
    periodo: { inicio, fim },
    totais: {
      entradas,
      saidas,
      saldo: entradas - saidas,
    },
    lancamentos: rows.map((row) => ({ ...row, valor: Number(row.valor) })),
    paginacao: {
      pagina,
      porPagina,
      total,
      totalPaginas: Math.ceil(total / porPagina),
    },
  };
}