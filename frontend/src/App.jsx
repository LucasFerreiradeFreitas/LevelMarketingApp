import { useState, useEffect } from "react";
import axios from "axios";
import LoginPage from "./LoginPage"; // Importa nossa nova página de login
import EditorEmail from "./EditorEmail";
import "./App.css";

// A URL da API do backend
const API_BASE_URL = "http://localhost:3001";

// Configura o Axios para incluir o token em todas as requisições
// Esta é a nova forma de fazer, interceptando requisições
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function App() {
  // O 'token' é nosso "crachá". Começamos buscando no localStorage
  const [token, setToken] = useState(localStorage.getItem("token"));

  const [clientes, setClientes] = useState([]);

  // Guarda a página atual. Começamos em 'clientes'.
  const [paginaAtual, setPaginaAtual] = useState("clientes");

  // Estados para o formulário de "Adicionar"
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");

  // Estados para o formulário de "Editar"
  const [editingClientId, setEditingClientId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Este useEffect "assiste" o 'token'.
  // Quando o 'token' mudar (no login ou logout):
  useEffect(() => {
    if (token) {
      // Salva o token no navegador para persistir o login
      localStorage.setItem("token", token);
      // Agora que temos o token, buscamos os clientes
      fetchClientes();
    } else {
      // Se não há token (logout), removemos
      localStorage.removeItem("token");
    }
  }, [token]); // Roda toda vez que o 'token' mudar

  // A NOVA FUNÇÃO DE LOGIN
  const handleLogin = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, {
        username,
        password,
      });

      const novoToken = response.data.token;
      setToken(novoToken); // Isso vai disparar o useEffect acima
    } catch (error) {
      console.error("Erro no login:", error);
      throw error; // Avisa o LoginPage que deu errado
    }
  };

  // A NOVA FUNÇÃO DE LOGOUT
  const handleLogout = () => {
    setToken(null); // Limpar o token "acorda" o useEffect e limpa tudo
    setClientes([]); // Limpa a lista de clientes da tela
  };

  // --- Funções de Gerenciamento de Clientes ---

  async function fetchClientes() {
    try {
      // O token já está sendo enviado (graças ao 'interceptor' do axios)
      const response = await axios.get(`${API_BASE_URL}/api/clientes`);
      setClientes(response.data);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      // Se o token for inválido (ex: expirou), fazemos o logout forçado.
      if (
        error.response &&
        (error.response.status === 401 || error.response.status === 403)
      ) {
        handleLogout();
      }
    }
  }

  // Função para ADICIONAR cliente
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!novoNome || !novoEmail) return alert("Preencha tudo!");
    try {
      await axios.post(`${API_BASE_URL}/api/clientes`, {
        nome: novoNome,
        email: novoEmail,
      });
      setNovoNome("");
      setNovoEmail("");
      fetchClientes(); // Atualiza a lista
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
    }
  };

  // Função para DELETAR cliente
  const handleDelete = async (idCliente) => {
    if (!window.confirm("Tem certeza?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/clientes/${idCliente}`);
      setClientes((clientesAtuais) => {
        // 'filter' cria um NOVO array, mantendo apenas os
        // clientes cujo 'id' NÃO é o que acabamos de deletar.
        return clientesAtuais.filter((cliente) => cliente.id !== idCliente);
      });
    } catch (error) {
      console.error("Erro ao deletar cliente:", error);
    }
  };

  // Função chamada quando clicamos em "Editar"
  const handleEditClick = (cliente) => {
    setEditingClientId(cliente.id);
    setEditNome(cliente.nome);
    setEditEmail(cliente.email);
  };

  // Função chamada quando clicamos em "Cancelar" (edição)
  const handleCancelEdit = () => {
    setEditingClientId(null);
  };

  // Função chamada quando clicamos em "Salvar" (edição)
  const handleSaveEdit = async (idCliente) => {
    try {
      await axios.put(`${API_BASE_URL}/api/clientes/${idCliente}`, {
        nome: editNome,
        email: editEmail,
      });
      setEditingClientId(null);
      fetchClientes(); // Atualiza a lista
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      alert("Erro ao salvar. Verifique o console.");
    }
  };

  // --- A RENDERIZAÇÃO CONDICIONAL ---

  // PRIMEIRO VERIFICAMOS: O usuário NÃO está logado?
  if (!token) {
    // Se NÃO HÁ TOKEN, mostre a Página de Login e pare aqui
    return <LoginPage onLogin={handleLogin} />;
  }

  // SE CHEGOU AQUI, o usuário ESTÁ logado.
  // Então, mostre o PAINEL DE CONTROLE PRINCIPAL:
  return (
    <div className="App">
      {/* --- O NOVO CABEÇALHO DE NAVEGAÇÃO --- */}
      <header className="main-header">
        <h1>Level Marketing</h1>
        <nav>
          <button
            onClick={() => setPaginaAtual("clientes")}
            className={paginaAtual === "clientes" ? "active" : ""}
          >
            Gerenciar Clientes
          </button>
          <button
            onClick={() => setPaginaAtual("editor")}
            className={paginaAtual === "editor" ? "active" : ""}
          >
            Criar Campanha
          </button>

          {/* O botão de sair agora usando suas funções reais */}
          <button className="btn-logout-nav" onClick={handleLogout}>
            Sair
          </button>
        </nav>
      </header>

      {/* --- O CONTEÚDO DA PÁGINA ATUAL --- */}
      <main className="main-content">
        {/* Mostra o Gerenciador de Clientes */}
        {paginaAtual === "clientes" && (
          <div className="clientes-container">
            {/* Formulário de Adicionar */}
            <form onSubmit={handleSubmit}>
              <h3>Adicionar Novo Cliente</h3>
              <div>
                <input
                  type="text"
                  placeholder="Nome"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                />
              </div>
              <button type="submit">Adicionar Cliente</button>
            </form>

            <h2>Lista de Clientes Atuais</h2>
            <ul>
              {clientes.map((cliente) => (
                <li key={cliente.id}>
                  {editingClientId === cliente.id ? (
                    // MODO DE EDIÇÃO
                    <>
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                      />
                      <button onClick={() => handleSaveEdit(cliente.id)}>
                        Salvar
                      </button>
                      <button onClick={handleCancelEdit}>Cancelar</button>
                    </>
                  ) : (
                    // MODO DE VISUALIZAÇÃO (CORRIGIDO)
                    <>
                      <strong>
                        <span>
                          <strong>Nome:</strong> {cliente.nome} -{" "}
                          <strong>Email:</strong> {cliente.email}
                        </span>
                      </strong>

                      <button
                        onClick={() => handleEditClick(cliente)}
                        style={{ marginLeft: "10px" }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(cliente.id)}
                        style={{ marginLeft: "5px" }}
                      >
                        Deletar
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mostra o Editor de Email */}
        {paginaAtual === "editor" && <EditorEmail />}
      </main>
    </div>
  );
} // <-- Esta é a chave } que fecha a "function App()"

export default App;
