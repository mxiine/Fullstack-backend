
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

import {
    buscarPorEmail,
    buscarPorCpf,
    criarUsuarioComDadosPadrao,
    buscarUsuarioPublicoPorId
} from '../models/usuario.models.js';

import { autenticar } from '../middlewares/autenticar.js';

const router = express.Router();

// Limitar tentativas de login
const limitarTentativasLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        erro: 'Muitas tentativas de login. Tente novamente mais tarde.'
    }
});

// Validar CPF
function cpfValido(cpf) {
    const digitos = String(cpf).replace(/\D/g, '');

    if (
        digitos.length !== 11 ||
        /^(\d)\1{10}$/.test(digitos)
    ) {
        return false;
    }

    const calcularDigito = (tamanho) => {
        let soma = 0;

        for (let i = 0; i < tamanho; i++) {
            soma += Number(digitos[i]) * (tamanho + 1 - i);
        }

        const resto = (soma * 10) % 11;

        return resto === 10 ? 0 : resto;
    };

    return (
        calcularDigito(9) === Number(digitos[9]) &&
        calcularDigito(10) === Number(digitos[10])
    );
}

// Cadastro de usuário
router.post('/cadastro', async (req, res) => {

    const {
        nome: nomeRecebido,
        email: emailRecebido,
        cpf: cpfRecebido,
        senha,
        confirmacaoSenha
    } = req.body || {};

    // Normalizar os dados
    const nome = typeof nomeRecebido === 'string'
        ? nomeRecebido.trim()
        : '';

    const email = typeof emailRecebido === 'string'
        ? emailRecebido.trim().toLowerCase()
        : '';

    const cpf = typeof cpfRecebido === 'string'
        ? cpfRecebido.replace(/\D/g, '')
        : '';

    // Validar os campos
    const campos = {};

    if (!nome) {
        campos.nome = 'O nome é obrigatório.';
    } else if (nome.length > 120) {
        campos.nome = 'O nome deve ter no máximo 120 caracteres.';
    }

    if (!email) {
        campos.email = 'O e-mail é obrigatório.';
    } else if (
        email.length > 160 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
        campos.email = 'Informe um e-mail válido.';
    }

    if (!cpf) {
        campos.cpf = 'O CPF é obrigatório.';
    } else if (!cpfValido(cpf)) {
        campos.cpf = 'Informe um CPF válido.';
    }

    if (typeof senha !== 'string' || !senha) {
        campos.senha = 'A senha é obrigatória.';
    } else if (!/^(?=.*\p{L})(?=.*\d).{8,}$/u.test(senha)) {
        campos.senha = 'A senha deve ter pelo menos 8 caracteres, contendo letras e números.';
    }

    if (
        typeof confirmacaoSenha !== 'string' ||
        !confirmacaoSenha
    ) {
        campos.confirmacaoSenha = 'Confirme sua senha.';
    } else if (confirmacaoSenha !== senha) {
        campos.confirmacaoSenha = 'As senhas não coincidem.';
    }

    if (Object.keys(campos).length > 0) {
        return res.status(400).json({
            erro: 'Dados inválidos.',
            campos
        });
    }

    try {
        // Verificar se o e-mail já existe
        const emailExistente = await buscarPorEmail(email);

        if (emailExistente) {
            return res.status(409).json({
                erro: 'Usuário já cadastrado.',
                campos: {
                    email: 'Já existe um usuário com este e-mail.'
                }
            });
        }

        // Verificar se o CPF já existe
        const cpfExistente = await buscarPorCpf(cpf);

        if (cpfExistente) {
            return res.status(409).json({
                erro: 'Usuário já cadastrado.',
                campos: {
                    cpf: 'Já existe um usuário com este CPF.'
                }
            });
        }

        // Proteger a senha com bcrypt
        const senhaHash = await bcrypt.hash(senha, 10);

        // Criar usuário, categorias e conta padrão
        const usuario = await criarUsuarioComDadosPadrao({
            nome,
            email,
            cpf,
            senhaHash
        });

        return res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            usuario
        });

    } catch (erro) {

        // Tratar possíveis duplicidades no próprio banco
        // Inclusive em caso de duas requisições simultâneas
        if (erro.code === 'ER_DUP_ENTRY') {
            const mensagem = String(
                erro.sqlMessage || erro.message || ''
            ).toLowerCase();

            if (mensagem.includes('cpf')) {
                return res.status(409).json({
                    erro: 'Usuário já cadastrado.',
                    campos: {
                        cpf: 'Já existe um usuário com este CPF.'
                    }
                });
            }

            if (mensagem.includes('email')) {
                return res.status(409).json({
                    erro: 'Usuário já cadastrado.',
                    campos: {
                        email: 'Já existe um usuário com este e-mail.'
                    }
                });
            }

            return res.status(409).json({
                erro: 'E-mail ou CPF já cadastrado.'
            });
        }

        console.error('Erro no cadastro:', erro);

        return res.status(500).json({
            erro: 'Erro interno ao cadastrar usuário.'
        });
    }
});


// Login de usuário
router.post('/login', limitarTentativasLogin, async (req, res) => {

    const { email: emailRecebido, senha } = req.body || {};

    const email = typeof emailRecebido === 'string'
        ? emailRecebido.trim().toLowerCase()
        : '';

    if (!email || typeof senha !== 'string' || !senha) {
        return res.status(400).json({
            erro: 'Informe o e-mail e a senha.'
        });
    }

    try {
        // Buscar usuário
        const usuario = await buscarPorEmail(email);

        // Mensagem genérica para não revelar se o e-mail existe
        if (!usuario) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        // Comparar senha informada com o hash armazenado
        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senha_hash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET não configurado.');

            return res.status(500).json({
                erro: 'Autenticação não configurada.'
            });
        }

        // Gerar token JWT com validade de uma hora
        const token = jwt.sign(
            {},
            process.env.JWT_SECRET,
            {
                subject: String(usuario.id),
                expiresIn: '1h'
            }
        );

        return res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (erro) {
        console.error('Erro no login:', erro);

        return res.status(500).json({
            erro: 'Erro interno ao realizar login.'
        });
    }
});


// Consultar usuário autenticado
router.get('/me', autenticar, async (req, res) => {

    try {
        // O ID vem do token validado pelo middleware
        const usuario = await buscarUsuarioPublicoPorId(
            req.usuarioId
        );

        if (!usuario) {
            return res.status(404).json({
                erro: 'Usuário não encontrado.'
            });
        }

        return res.status(200).json({
            usuario
        });

    } catch (erro) {
        console.error('Erro ao buscar usuário:', erro);

        return res.status(500).json({
            erro: 'Erro ao consultar usuário.'
        });
    }
});

export default router;