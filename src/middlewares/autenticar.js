
import jwt from 'jsonwebtoken';

export function autenticar(req, res, next) {

    // Recuperar o cabeçalho Authorization
    const autorizacao = req.headers.authorization;

    // Verificar se o token foi enviado no formato Bearer
    const partes = (autorizacao || '').split(' ');

    if (
        partes.length !== 2 ||
        partes[0] !== 'Bearer' ||
        !partes[1]
    ) {
        return res.status(401).json({
            erro: 'Token não informado ou formato inválido.'
        });
    }

    const token = partes[1];

    // Verificar se a chave JWT está configurada
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET não configurado.');

        return res.status(500).json({
            erro: 'Autenticação não configurada.'
        });
    }

    try {
        // Validar o token
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Recuperar o ID do usuário presente no token
        const usuarioId = Number(payload.sub);

        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            return res.status(401).json({
                erro: 'Token inválido.'
            });
        }

        // Disponibilizar o ID para as próximas rotas
        req.usuarioId = usuarioId;

        // Permitir que a requisição continue
        next();

    } catch (erro) {

        return res.status(401).json({
            erro: 'Token inválido ou expirado.'
        });
    }
}