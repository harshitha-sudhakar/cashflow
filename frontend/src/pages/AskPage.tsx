import { useState } from "react";
import { useAuth } from "../lib/authContext";
import { CHAT_SERVICE_URL } from "../lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AskPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !input.trim()) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${CHAT_SERVICE_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, question }),
      });
      if (!res.ok) throw new Error(`Chat service returned ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
    } catch {
      setError("Couldn't reach the chat service. Is chatbot-service running on port 5002?");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't connect to the chat service right now." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero card">
        <p className="eyebrow">Ask</p>
        <h1 className="page-title">Query your financial history</h1>
        <p className="page-description">
          Ask natural-language questions about your logged income and obligations. Answers are grounded in your own data.
        </p>
      </section>

      <section className="card chat-page">
        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="chat-empty">
              Try: "What's my expected income next month?" or "What have my utility bills looked like historically?"
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble chat-bubble-${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {loading && <div className="chat-bubble chat-bubble-assistant chat-loading">Thinking...</div>}
        </div>

        <form onSubmit={handleSubmit} className="chat-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your income or obligations..."
            disabled={loading}
          />
          <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
        {error && <p className="auth-error">{error}</p>}
      </section>
    </div>
  );
}
