import jwt from 'jsonwebtoken';

export function autenticar(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token, extra] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token || extra) {
    return res.status(401).json({
      erro: 'Token não informado ou formato inválido.',
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET não foi configurado.');
    return res.status(500).json({ erro: 'Autenticação não configurada.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const usuarioId = Number(payload.sub);

    if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0) {
      return res.status(401).json({ erro: 'Token inválido.' });
    }

    req.usuarioId = usuarioId;
    return next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}
