import { pool } from '../config/database.js';

// Retorna os dados necessários ao login, incluindo o hash apenas para comparação.
export async function buscarPorEmail(email) {
  const [rows] = await pool.execute(
    `SELECT id, nome, email, cpf, senha_hash, criado_em
     FROM usuarios
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

export async function buscarPorCpf(cpf) {
  const [rows] = await pool.execute(
    'SELECT id FROM usuarios WHERE cpf = ? LIMIT 1',
    [cpf]
  );

  return rows[0] || null;
}

// Nunca retorna senha_hash.
export async function buscarUsuarioPublicoPorId(id) {
  const [rows] = await pool.execute(
    `SELECT id, nome, email, criado_em
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

// Cadastra o usuário e seus dados padrão atomicamente.
export async function criarUsuarioComDadosPadrao({ nome, email, cpf, senhaHash }) {
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    const [resultado] = await conexao.execute(
      `INSERT INTO usuarios (nome, email, cpf, senha_hash)
       VALUES (?, ?, ?, ?)`,
      [nome, email, cpf, senhaHash]
    );

    const usuarioId = resultado.insertId;

    const categorias = [
      ['Salário', 'entrada'],
      ['Alimentação', 'saida'],
      ['Moradia', 'saida'],
      ['Saúde', 'saida'],
      ['Mobilidade', 'saida'],
      ['Lazer', 'saida'],
      ['Educação', 'saida'],
      ['Outros', 'saida'],
    ];

    for (const [nomeCategoria, tipo] of categorias) {
      await conexao.execute(
        `INSERT INTO categorias (usuario_id, nome, tipo)
         VALUES (?, ?, ?)`,
        [usuarioId, nomeCategoria, tipo]
      );
    }

    await conexao.execute(
      `INSERT INTO fontes_destinos (usuario_id, nome, tipo)
       VALUES (?, ?, ?)`,
      [usuarioId, 'Conta corrente', 'conta']
    );

    await conexao.commit();

    return { id: usuarioId, nome, email };
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}
