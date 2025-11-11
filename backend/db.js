const mysql = require('mysql2/promise');

// Cria o pool de conexões com o banco de dados
const pool = mysql.createPool({
  host: 'localhost',       // Ou o IP do seu servidor de banco
  user: 'root',            // Seu usuário do MySQL
  password: '', // Sua senha do MySQL
  database: 'level_marketing_db', // O nome do banco que você criou
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Função simples para testar a conexão
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Conexão com o MySQL bem-sucedida! (ID: ' + connection.threadId + ')');
    connection.release(); // Libera a conexão de volta para o pool
  } catch (error) {
    console.error('Erro ao conectar com o MySQL:', error);
  }
}

// Exporta o pool para ser usado em outros arquivos e testa a conexão
testConnection();
module.exports = pool;