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

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(60) NOT NULL,
    tipo VARCHAR(7) NOT NULL,

    CONSTRAINT fk_categoria_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_categoria_tipo
        CHECK (tipo IN ('entrada', 'saida')),

    UNIQUE (usuario_id, nome, tipo)
) ENGINE=InnoDB;

CREATE TABLE lancamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo VARCHAR(7) NOT NULL,
    descricao VARCHAR(120) NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    data DATE NOT NULL,

    categoria_id INT NOT NULL,
    fonte_destino_id INT NOT NULL,

    parcela_atual SMALLINT NOT NULL DEFAULT 1,
    total_parcelas SMALLINT NOT NULL DEFAULT 1,
    grupo_parcelamento CHAR(36),

    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lancamento_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_lancamento_categoria
        FOREIGN KEY (categoria_id)
        REFERENCES categorias(id),

    CONSTRAINT fk_lancamento_fonte
        FOREIGN KEY (fonte_destino_id)
        REFERENCES fontes_destinos(id),

    CONSTRAINT chk_lancamento_tipo
        CHECK (tipo IN ('entrada', 'saida')),

    CONSTRAINT chk_lancamento_valor
        CHECK (valor > 0),

    CONSTRAINT chk_total_parcelas
        CHECK (total_parcelas BETWEEN 1 AND 48),

    CONSTRAINT chk_parcela_atual
        CHECK (parcela_atual BETWEEN 1 AND total_parcelas),

    INDEX idx_lancamentos_usuario_data (usuario_id, data)
) ENGINE=InnoDB;
