import { useState } from "react";

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null); // Para mostrar erros de login

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null); // Limpa erros antigos

    if (!username || !password) {
      setError("Por favor, preencha o usuário e a senha.");
      return;
    }

    try {
      // Chama a função onLogin (que está no App.jsx)
      // e passa o usuário e a senha para ela
      await onLogin(username, password);
    } catch (err) {
      // Se o App.jsx der um erro (ex: 401 Senha errada),
      // nós o pegamos aqui e mostramos
      setError("Falha no login. Verifique seu usuário e senha.");
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h2>Login - Level Marketing</h2>
        <p>Por favor, acesse para continuar.</p>

        <div>
          <input
            type="text"
            placeholder="Usuário (ex: gustavo)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Mostra a mensagem de erro, se houver */}
        {error && <p className="error-message">{error}</p>}

        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

export default LoginPage;
