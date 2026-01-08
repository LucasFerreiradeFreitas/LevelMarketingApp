import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import axios from "axios";

const API_BASE_URL = "http://localhost:3001";

const MenuBar = ({ editor }) => {
  if (!editor) return null;
  const addImage = (e) => {
    e.preventDefault();
    const url = window.prompt("Cole a URL da imagem aqui:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };
  return (
    <div className="toolbar-container">
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleBold().run();
        }}
        className={editor.isActive("bold") ? "is-active" : ""}
      >
        Negrito
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleItalic().run();
        }}
        className={editor.isActive("italic") ? "is-active" : ""}
      >
        Itálico
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        }}
        className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
      >
        Título
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          editor.chain().focus().toggleBulletList().run();
        }}
        className={editor.isActive("bulletList") ? "is-active" : ""}
      >
        Lista
      </button>
      <button
        onClick={addImage}
        style={{ backgroundColor: "#ff9800", color: "white" }}
      >
        + Imagem
      </button>
    </div>
  );
};

function EditorEmail() {
  const [titulo, setTitulo] = useState("");
  const [templates, setTemplates] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [conteudoPrevia, setConteudoPrevia] = useState("");
  const [dataAgendamento, setDataAgendamento] = useState({});

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: "<p>Comece a escrever seu email aqui...</p>",
  });

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/templates`);
      setTemplates(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleVerPrevia = async (template) => {
    try {
      const resClientes = await axios.get(`${API_BASE_URL}/api/clientes`);
      const c = resClientes.data[0] || {
        nome: "João",
        sobrenome: "Silva",
        email: "teste@email.com",
      };

      let html = "";
      if (titulo === template.titulo) {
        html = editor.getHTML();
      } else {
        const res = await axios.get(
          `${API_BASE_URL}/api/templates/detalhes/${template.id}`
        );
        html = res.data.conteudo_html;
      }

      html = html
        .replace(/{nome}/g, c.nome)
        .replace(/{sobrenome}/g, c.sobrenome || "")
        .replace(/{email}/g, c.email);

      setConteudoPrevia(html);
      setShowModal(true);
    } catch (error) {
      alert("Erro ao gerar prévia.");
    }
  };

  const handleAgendar = async (id) => {
    const dataHora = dataAgendamento[id];
    if (!dataHora) return alert("Selecione uma data e hora!");
    try {
      await axios.post(`${API_BASE_URL}/api/agendar-campanha`, {
        templateId: id,
        dataHora,
      });
      alert("Campanha agendada com sucesso!");
    } catch (error) {
      alert("Erro ao agendar.");
    }
  };

  const handleEnviarCampanha = async (id) => {
    if (!window.confirm("Disparar para TODOS os clientes agora?")) return;
    setEnviando(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/enviar-campanha`, {
        templateId: id,
      });
      alert(res.data);
    } catch (error) {
      alert("Erro no envio.");
    } finally {
      setEnviando(false);
    }
  };

  const handleSalvarTemplate = async () => {
    if (!editor || !titulo) return alert("Preencha título e conteúdo!");
    try {
      await axios.post(`${API_BASE_URL}/api/templates`, {
        titulo,
        conteudo_html: editor.getHTML(),
      });
      alert("Template salvo!");
      setTitulo("");
      editor.commands.setContent("<p>Comece a escrever seu email aqui...</p>");
      fetchTemplates();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } // Corrigido aqui
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Excluir template?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/templates/${id}`);
      fetchTemplates();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="editor-container">
      <h2>Criar Novo Email</h2>
      <input
        type="text"
        placeholder="Título do Template"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="input-titulo"
      />

      <div className="variables-container" style={{ marginBottom: "1rem" }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().insertContent("{nome}").run();
          }}
          className="var-btn"
        >
          {"{nome}"}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().insertContent("{sobrenome}").run();
          }}
          className="var-btn"
        >
          {"{sobrenome}"}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            editor.chain().focus().insertContent("{email}").run();
          }}
          className="var-btn"
        >
          {"{email}"}
        </button>
      </div>

      <div className="tiptap-editor">
        <MenuBar editor={editor} />
        <EditorContent editor={editor} />
      </div>

      <button className="btn-salvar" onClick={handleSalvarTemplate}>
        Salvar Template
      </button>

      <div className="templates-list-section">
        <h3>Meus Templates Salvos</h3>
        <div className="templates-grid">
          {templates.map((t) => (
            <div key={t.id} className="template-card">
              <h4>{t.titulo}</h4>
              <button onClick={() => handleVerPrevia(t)} className="btn-previa">
                👁️ Ver Prévia
              </button>
              <button
                onClick={() => handleEnviarCampanha(t.id)}
                disabled={enviando}
                className="btn-enviar-card"
              >
                🚀 Disparar Agora
              </button>

              <div
                style={{
                  marginTop: "10px",
                  borderTop: "1px solid #444",
                  paddingTop: "10px",
                }}
              >
                <input
                  type="datetime-local"
                  className="input-agendamento"
                  onChange={(e) =>
                    setDataAgendamento({
                      ...dataAgendamento,
                      [t.id]: e.target.value,
                    })
                  }
                />
                <button
                  onClick={() => handleAgendar(t.id)}
                  className="btn-agendar"
                >
                  📅 Agendar
                </button>
              </div>

              <button
                onClick={() => handleDeleteTemplate(t.id)}
                className="btn-delete-small"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Visualização da Campanha</h3>
            <div
              className="email-preview-box"
              dangerouslySetInnerHTML={{ __html: conteudoPrevia }}
            />
            <button
              onClick={() => setShowModal(false)}
              className="btn-close-modal"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorEmail;
