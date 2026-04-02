import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dashboard.render.com/web/srv-d76vchnkijhs739m329g/logs?r=1h";

export default function App() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState({
    summary: "",
    keyPoints: [],
    quiz: [],
  });

  async function handleSubmit(event) {
    event.preventDefault();

    if (!text.trim()) {
      setError("Please paste some notes or a transcript first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult({
      summary: "",
      keyPoints: [],
      quiz: [],
    });

    try {
      const response = await fetch(`${API_URL}/api/study`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header className="hero">
          <span className="eyebrow">Smart study helper</span>
          <h1>StudyFlow</h1>
          <p>Paste notes, text, or a YouTube link and turn it into a clean study guide in seconds.</p>
        </header>

        <form className="card form-card" onSubmit={handleSubmit}>
          <label htmlFor="study-input" className="section-title">
            Paste Your Notes or Transcript
          </label>

          <textarea
            id="study-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste class notes, article text, a YouTube transcript, or a YouTube link here..."
            rows="12"
          />

          <div className="form-footer">
            <button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Study Guide"}
            </button>

            {loading && (
              <div className="loading-indicator" aria-live="polite">
                <span className="spinner" />
                <span>Processing your content...</span>
              </div>
            )}
          </div>

          {error && <p className="error">{error}</p>}
        </form>

        <section className="results">
          <div className="card">
            <h2>Summary</h2>
            {result.summary ? (
              <p className="summary-text">{result.summary}</p>
            ) : (
              <p className="empty-state">Your summary will appear here.</p>
            )}
          </div>

          <div className="card">
            <h2>Key Points</h2>
            {result.keyPoints.length > 0 ? (
              <ul className="keypoint-list">
                {result.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">Your key points will appear here.</p>
            )}
          </div>

          <div className="card">
            <h2>Quiz</h2>
            {result.quiz.length > 0 ? (
              <ol className="quiz-list">
                {result.quiz.map((item, index) => (
                  <li key={index} className="quiz-item">
                    <strong>{item.question}</strong>
                    <ul className="option-list">
                      {item.options.map((option, optionIndex) => {
                        const isAnswer = option === item.answer;
                        return (
                          <li key={optionIndex} className={isAnswer ? "correct-option" : ""}>
                            {option}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="answer-label">Answer: {item.answer}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">Your quiz will appear here.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

