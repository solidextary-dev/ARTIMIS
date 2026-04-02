# StudyFlow

StudyFlow is a simple web app that turns notes or a YouTube transcript into:

- a summary
- key points
- a 5-question quiz

## Project Structure

```text
StudyFlow/
  backend/
    src/
      index.js
    .env.example
    package.json
  frontend/
    public/
    src/
      App.jsx
      main.jsx
      styles.css
    index.html
    package.json
    vite.config.js
  .gitignore
  README.md
```

## Prerequisites

- Node.js 18 or newer
- An OpenAI API key

## Setup

### 1. Add your API key

In `backend`, copy `.env.example` to `.env` and add your key:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.2
PORT=5000
```

### 2. Install dependencies

Open two terminals.

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

## Run Locally

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Then open the local URL shown by Vite, usually:

`http://localhost:5173`

## How It Works

1. Paste notes or a YouTube transcript into the textarea.
2. Click `Generate Study Guide`.
3. The frontend sends your text to the Express backend.
4. The backend makes 3 OpenAI requests:
   - summary
   - key points
   - quiz
5. The backend returns structured JSON to the frontend.

## API Response Shape

```json
{
  "summary": "Short summary here",
  "keyPoints": [
    "Point one",
    "Point two"
  ],
  "quiz": [
    {
      "question": "Question 1?",
      "answer": "Answer 1"
    }
  ]
}
```

## Notes

- This app accepts pasted text. If you have a YouTube transcript, paste the transcript into the input box.
- The environment here did not have `node` or `npm` installed, so the code was created but not executed in this session.

