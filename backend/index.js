const express = require("express");
const pool = require("./db"); // Importa o nosso pool de conexões
const app = express();
const port = 3001;
// Chave secreta para assinar o JWT
const JWT_SECRET = "levelmarketing_segredo_super_secreto_12345";

// === MIDDLEWARE DE AUTENTICAÇÃO ===
// Este é o nosso "segurança"
const autenticarToken = (req, res, next) => {
  // 1. O token (crachá) vem no cabeçalho 'Authorization'
  // O formato é "Bearer TOKEN_LONGO_AQUI"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Pega só o token

  // 2. Se não veio o crachá, barra a entrada
  if (token == null) {
    return res.status(401).send('Acesso negado. Nenhum token fornecido.');
  }

  // 3. Verifica se o crachá é válido
  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    // Se o crachá for inválido ou expirou...
    if (err) {
      return res.status(403).send('Token inválido ou expirado.'); // 403 = Proibido
    }

    // 4. Se o crachá é VÁLIDO!
    // Anexamos os dados do usuário (ex: id, username) na requisição
    req.usuario = usuario; 

    // Deixa a requisição "passar" para a próxima função (a rota real)
    next(); 
  });
};

// === Middlewares ===
// Habilita o Express para entender JSON no corpo das requisições
app.use(express.json());

// (Opcional, mas recomendado) Habilita o CORS para permitir que o frontend (React) chame o backend
// Instale com: npm install cors
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(cors()); // Por enquanto, permite de qualquer origem

// === Rotas da API ===

// === AUTENTICAÇÃO ===

// Rota para REGISTRAR um novo usuário

app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Validação simples
    if (!username || !password) {
      return res.status(400).send("Usuário e senha são obrigatórios.");
    }

    // 2. Criptografar (hashear) a senha
    // "salt rounds" (10) é o custo do processamento. 10 é um bom padrão.
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Salvar no banco de dados
    const connection = await pool.getConnection();

    await connection.execute(
      "INSERT INTO usuarios (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );

    connection.release();

    // 4. Enviar resposta de sucesso
    res.status(201).send("Usuário registrado com sucesso!");
  } catch (error) {
    // "error.code === 'ER_DUP_ENTRY'" é o erro do MySQL para chave duplicada
    // Isso acontece se o username já existir (graças ao UNIQUE)
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).send("Este nome de usuário já existe.");
    }

    // Outros erros
    console.error("Erro no registro:", error);
    res.status(500).send("Erro no servidor ao registrar usuário.");
  }
});

// Rota para LOGAR um usuário
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Validação
    if (!username || !password) {
      return res.status(400).send("Usuário e senha são obrigatórios.");
    }

    // 2. Buscar o usuário no banco
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM usuarios WHERE username = ?",
      [username]
    );

    // 3. Verificar se o usuário existe
    if (rows.length === 0) {
      connection.release();
      // Usamos uma mensagem genérica por segurança
      return res.status(401).send("Usuário ou senha inválidos.");
    }

    const usuario = rows[0]; // Pegamos o primeiro (e único) usuário

    // 4. Comparar a senha enviada com a senha criptografada no banco
    const senhaCorreta = await bcrypt.compare(password, usuario.password);

    if (!senhaCorreta) {
      connection.release();
      return res.status(401).send("Usuário ou senha inválidos.");
    }

    // 5. Se chegou aqui, o usuário e a senha estão corretos!
    // Gerar o "crachá" (Token JWT)
    const payload = {
      id: usuario.id,
      username: usuario.username,
    };

    const token = jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: "8h" } // Token expira em 8 horas
    );

    connection.release();

    // 6. Enviar o token para o frontend!
    res.json({
      message: "Login bem-sucedido!",
      token: token,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).send("Erro no servidor ao tentar logar.");
  }
});

app.use('/api/clientes', autenticarToken);

// Rota de teste
app.get("/", (req, res) => {
  res.send("Olá do Backend! A conexão com o banco foi testada no console.");
});

// [REQUISITO 1] - Gerenciamento de Lista de Emails
// Rota para buscar todos os clientes (emails)
app.get("/api/clientes", async (req, res) => {
  try {
    // 1. Pega uma conexão do pool
    const connection = await pool.getConnection();

    // 2. Executa a query (Exemplo: crie uma tabela 'clientes' antes)
    const [rows] = await connection.execute("SELECT * FROM clientes");

    // 3. Libera a conexão
    connection.release();

    // 4. Retorna os dados como JSON
    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    res.status(500).send("Erro no servidor ao buscar clientes.");
  }
});

// === GERENCIAMENTO DE CLIENTES ===

// Rota para adicionar um novo cliente (email)
app.post("/api/clientes", async (req, res) => {
  // Pega os dados enviados pelo frontend (React)
  const { nome, email } = req.body;

  // [REQUISITO 1.15] Validação simples
  if (!nome || !email) {
    return res.status(400).send("Nome e email são obrigatórios.");
  }

  try {
    const connection = await pool.getConnection();

    // [REQUISITO 1.16] Adiciona na lista
    const [result] = await connection.execute(
      "INSERT INTO clientes (nome, email) VALUES (?, ?)",
      [nome, email]
    );

    connection.release();

    // Retorna uma resposta de sucesso
    res.status(201).json({
      message: "Cliente adicionado com sucesso!",
      clienteId: result.insertId,
    });
  } catch (error) {
    console.error("Erro ao adicionar cliente:", error);
    res.status(500).send("Erro no servidor ao adicionar cliente.");
  }
});

// [REQUISITO 1.16] - Rota para DELETAR um cliente
app.delete("/api/clientes/:id", async (req, res) => {
  // Pega o ID da URL (ex: /api/clientes/5)
  const { id } = req.params;

  try {
    const connection = await pool.getConnection();

    // Executa o comando SQL para deletar
    const [result] = await connection.execute(
      "DELETE FROM clientes WHERE id = ?",
      [id]
    );

    connection.release();

    // Verifica se algo foi realmente deletado
    if (result.affectedRows === 0) {
      // Se nenhum cliente com esse ID foi encontrado
      return res.status(404).send("Cliente não encontrado.");
    }

    // Envia uma resposta de sucesso (204 = "No Content", ou seja, sucesso sem corpo)
    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar cliente:", error);
    res.status(500).send("Erro no servidor ao deletar cliente.");
  }
});

// [REQUISITO 1.16] - Rota para ATUALIZAR (Editar) um cliente
app.put("/api/clientes/:id", async (req, res) => {
  // Pega o ID da URL
  const { id } = req.params;
  // Pega os novos dados do corpo da requisição
  const { nome, email } = req.body;

  // Validação simples
  if (!nome || !email) {
    return res.status(400).send("Nome e email são obrigatórios.");
  }

  try {
    const connection = await pool.getConnection();

    // Executa o comando SQL UPDATE
    const [result] = await connection.execute(
      "UPDATE clientes SET nome = ?, email = ? WHERE id = ?",
      [nome, email, id]
    );

    connection.release();

    // Verifica se algo foi realmente atualizado
    if (result.affectedRows === 0) {
      return res.status(404).send("Cliente não encontrado.");
    }

    // Envia uma resposta de sucesso (200 = OK)
    res.status(200).json({ Clienid: id, nome: nome, email: email });
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);
    res.status(500).send("Erro no servidor ao atualizar cliente.");
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});
