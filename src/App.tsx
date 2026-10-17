import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

type Role = "user" | "assistant";

interface ChatMessage {
  id: number;
  role: Role;
  text: string;
  error?: boolean;
}

// FastAPI backend (src-back/main.py) -> run: uvicorn main:app --port 8000
const API_URL = "http://127.0.0.1:8000/message";

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const ChevronIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

const WaveIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("Fast");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  // auto-grow the textarea up to a max height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const addMessage = (role: Role, text: string, error = false) => {
    setMessages((prev) => [...prev, { id: nextId.current++, role, text, error }]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    addMessage("user", text);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

     if (!response.body) {
  throw new Error("Response body is empty");
}

const reader = response.body.getReader();
const decoder = new TextDecoder();

const assistantId = nextId.current++;

setMessages((prev) => [
  ...prev,
  { id: assistantId, role: "assistant", text: "" },
]);

let buffer = "";

while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";

  for (const line of lines) {
    if (!line.trim()) continue;

    const data: { res: string } = JSON.parse(line);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, text: m.text + data.res }
          : m
      )
    );
  }
}

buffer += decoder.decode();

if (buffer.trim()) {
  const data: { res: string } = JSON.parse(buffer);

  setMessages((prev) =>
    prev.map((m) =>
      m.id === assistantId
        ? { ...m, text: m.text + data.res }
        : m
    )
  );
}
    } catch (err) {
      const reason = err instanceof Error ? err.message : "Unknown error";
      addMessage("assistant", `Could not reach the backend. ${reason}`, true);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  const hasText = input.trim().length > 0;

  return (
    <div className="app">
      <main className="chat">
        <div className="messages">
          {messages.map((m) => (
            <div key={m.id} className={`message ${m.role}${m.error ? " error" : ""}`}>
              {m.role === "assistant" && !m.error ? (
                <div className="markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                </div>
              ) : (
                m.text
              )}
            </div>
          ))}

          {loading && (
            <div className="message assistant" aria-label="Assistant is typing">
              <span className="typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="composer-wrap">
        <div className="composer">
          <textarea
            ref={textareaRef}
            className="composer-input"
            placeholder="Ask anything"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
          />

          <div className="composer-row">
            <button type="button" className="icon-btn" aria-label="Add attachment">
              <PlusIcon />
            </button>

            <div className="composer-right">
              <label className="mode-select">
                <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Response mode">
                  <option>Fast</option>
                  <option>Thinking</option>
                </select>
                <ChevronIcon />
              </label>

              <button type="button" className="icon-btn" aria-label="Dictate">
                <MicIcon />
              </button>

              <button
                type="button"
                className={`action-btn${hasText ? " ready" : ""}`}
                aria-label={hasText ? "Send message" : "Voice mode"}
                onClick={hasText ? sendMessage : undefined}
                disabled={loading && hasText}
              >
                {hasText ? <SendIcon /> : <WaveIcon />}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
