
import { pool } from '../config/database.js';

// Buscar usuário pelo e-mail
export async function buscarPorEmail(email) {
    const [usuarios] = await pool.execute(
        'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
        [email]
    );

    return usuarios[0] || null;
}

// Buscar usuário pelo CPF
export async function buscarPorCpf(cpf) {
    const [usuarios] = await pool.execute(
        'SELECT id FROM usuarios WHERE cpf = ? LIMIT 1',
        [cpf]
    );

    return usuarios[0] || null;
}

// Buscar informações públicas do usuário
// Nunca retorna a senha ou seu hash
export async function buscarUsuarioPublicoPorId(id) {
    const [usuarios] = await pool.execute(
        `SELECT id, nome, email, criado_em
         FROM usuarios
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return usuarios[0] || null;
}

// Criar usuário e seus dados iniciais
export async function criarUsuarioComDadosPadrao({
    nome,
    email,
    cpf,
    senhaHash
}) {
    const conexao = await pool.getConnection();

    try {
        // Iniciar transação
        await conexao.beginTransaction();

        // Inserir usuário
        const [resultado] = await conexao.execute(
            `INSERT INTO usuarios
             (nome, email, cpf, senha_hash)
             VALUES (?, ?, ?, ?)`,
            [nome, email, cpf, senhaHash]
        );

        const usuarioId = resultado.insertId;

        // Categorias iniciais
        const categorias = [
            ['Salário', 'entrada'],
            ['Alimentação', 'saida'],
            ['Moradia', 'saida'],
            ['Saúde', 'saida'],
            ['Mobilidade', 'saida'],
            ['Lazer', 'saida'],
            ['Educação', 'saida'],
            ['Outros', 'saida']
        ];

        for (const [nomeCategoria, tipo] of categorias) {
            await conexao.execute(
                `INSERT INTO categorias
                 (usuario_id, nome, tipo)
                 VALUES (?, ?, ?)`,
                [usuarioId, nomeCategoria, tipo]
            );
        }

        // Criar uma fonte/destino padrão
        await conexao.execute(
            `INSERT INTO fontes_destinos
             (usuario_id, nome, tipo)
             VALUES (?, ?, ?)`,
            [usuarioId, 'Conta corrente', 'conta']
        );

        // Confirmar todas as operações
        await conexao.commit();

        return {
            id: usuarioId,
            nome,
            email
        };

    } catch (erro) {
        // Se algo falhar, desfazer todas as operações
        await conexao.rollback();

        throw erro;

    } finally {
        // Liberar conexão
        conexao.release();
    }
}
