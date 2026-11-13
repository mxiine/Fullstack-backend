CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    cpf CHAR(11) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE fontes_destinos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(60) NOT NULL,
    tipo VARCHAR(14) NOT NULL,

    dia_fechamento SMALLINT,
    dia_vencimento SMALLINT,
    limite DECIMAL(12,2),

    CONSTRAINT fk_fonte_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_fonte_tipo
        CHECK (tipo IN ('renda', 'conta', 'cartao_credito')),

    CONSTRAINT chk_dias_cartao
        CHECK (
            dia_fechamento BETWEEN 1 AND 31
            AND dia_vencimento BETWEEN 1 AND 31
            OR tipo <> 'cartao_credito'
        ),

    CONSTRAINT chk_dados_cartao
        CHECK (
            tipo <> 'cartao_credito'
            OR limite IS NOT NULL AND limite > 0
        ),

    UNIQUE (usuario_id, nome)
) ENGINE=InnoDB;