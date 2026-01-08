const express = require("express");
const pool = require("./db");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cron = require("node-cron");

const app = express();
const port = 3001;
const JWT_SECRET = "levelmarketing_segredo_super_secreto_12345";

app.use(express.json());
app.use(cors());

// Configuração do Motor de Envio (Mailtrap)
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "ba173c523de08a",
    pass: "32e580a7bb8edb",
  },
});

const autenticarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.status(401).send("Acesso negado.");
  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) return res.status(403).send("Token inválido.");
    req.usuario = usuario;
    next();
  });
};

// === VIGIA DE AGENDAMENTOS (Roda a cada minuto) ===
cron.schedule("* * * * *", async () => {
  console.log("⏰ Checando agendamentos...");
  let connection;
  try {
    connection = await pool.getConnection();
    const [agendados] = await connection.execute(
      "SELECT * FROM campanhas_agendadas WHERE status = 'pendente' AND data_agendamento <= NOW()"
    );

    for (let agendamento of agendados) {
      const [templates] = await connection.execute(
        "SELECT * FROM email_templates WHERE id = ?",
        [agendamento.id_template]
      );
      const [clientes] = await connection.execute("SELECT * FROM clientes");
      const template = templates[0];

      for (let cliente of clientes) {
        let htmlPersonalizado = template.conteudo_html
          .replace(/{nome}/g, cliente.nome)
          .replace(/{sobrenome}/g, cliente.sobrenome || "")
          .replace(/{email}/g, cliente.email);

        await transporter.sendMail({
          from: '"Level Marketing" <contato@levelmarketing.com>',
          to: cliente.email,
          subject: template.titulo,
          html: htmlPersonalizado,
        });
      }
      await connection.execute(
        "UPDATE campanhas_agendadas SET status = 'enviado' WHERE id = ?",
        [agendamento.id]
      );
      console.log(
        `✅ Campanha agendada ${agendamento.id} enviada com sucesso.`
      );
    }
  } catch (error) {
    console.error("Erro no Cron:", error);
  } finally {
    if (connection) connection.release();
  }
});

// --- ROTAS DA API ---

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      "SELECT * FROM usuarios WHERE username = ?",
      [username]
    );
    if (
      rows.length === 0 ||
      !(await bcrypt.compare(password, rows[0].password))
    ) {
      connection.release();
      return res.status(401).send("Credenciais inválidas.");
    }
    const token = jwt.sign(
      { id: rows[0].id, username: rows[0].username },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    connection.release();
    res.json({ token });
  } catch (error) {
    res.status(500).send("Erro no login.");
  }
});

app.post("/api/enviar-campanha", autenticarToken, async (req, res) => {
  const { templateId } = req.body;
  try {
    const connection = await pool.getConnection();
    const [templates] = await connection.execute(
      "SELECT * FROM email_templates WHERE id = ?",
      [templateId]
    );
    const [clientes] = await connection.execute("SELECT * FROM clientes");
    connection.release();

    for (let cliente of clientes) {
      let html = templates[0].conteudo_html
        .replace(/{nome}/g, cliente.nome)
        .replace(/{sobrenome}/g, cliente.sobrenome || "")
        .replace(/{email}/g, cliente.email);

      await transporter.sendMail({
        from: '"Level Marketing" <contato@levelmarketing.com>',
        to: cliente.email,
        subject: templates[0].titulo,
        html: html,
      });
    }
    res.send("Campanha disparada com sucesso!");
  } catch (error) {
    res.status(500).send("Erro no envio.");
  }
});

app.post("/api/agendar-campanha", autenticarToken, async (req, res) => {
  const { templateId, dataHora } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.execute(
      "INSERT INTO campanhas_agendadas (id_template, id_usuario, data_agendamento) VALUES (?, ?, ?)",
      [templateId, req.usuario.id, dataHora]
    );
    connection.release();
    res.status(201).send("Agendado com sucesso!");
  } catch (error) {
    res.status(500).send("Erro ao agendar.");
  }
});

app.get("/api/templates", autenticarToken, async (req, res) => {
  const connection = await pool.getConnection();
  const [rows] = await connection.execute(
    "SELECT id, titulo, data_criacao FROM email_templates WHERE id_usuario = ?",
    [req.usuario.id]
  );
  connection.release();
  res.json(rows);
});

app.get("/api/templates/detalhes/:id", autenticarToken, async (req, res) => {
  const connection = await pool.getConnection();
  const [rows] = await connection.execute(
    "SELECT * FROM email_templates WHERE id = ?",
    [req.params.id]
  );
  connection.release();
  res.json(rows[0]);
});

app.post("/api/templates", autenticarToken, async (req, res) => {
  const { titulo, conteudo_html } = req.body;
  const connection = await pool.getConnection();
  await connection.execute(
    "INSERT INTO email_templates (titulo, conteudo_html, id_usuario) VALUES (?, ?, ?)",
    [titulo, conteudo_html, req.usuario.id]
  );
  connection.release();
  res.send("Salvo!");
});

app.delete("/api/templates/:id", autenticarToken, async (req, res) => {
  const connection = await pool.getConnection();
  await connection.execute("DELETE FROM email_templates WHERE id = ?", [
    req.params.id,
  ]);
  connection.release();
  res.sendStatus(204);
});

app.get("/api/clientes", autenticarToken, async (req, res) => {
  const connection = await pool.getConnection();
  const [rows] = await connection.execute("SELECT * FROM clientes");
  connection.release();
  res.json(rows);
});

app.post("/api/clientes", autenticarToken, async (req, res) => {
  const { nome, email } = req.body;
  const connection = await pool.getConnection();
  await connection.execute("INSERT INTO clientes (nome, email) VALUES (?, ?)", [
    nome,
    email,
  ]);
  connection.release();
  res.status(201).send("Cliente adicionado!");
});

app.listen(port, () =>
  console.log(`Backend rodando em http://localhost:${port}`)
);
