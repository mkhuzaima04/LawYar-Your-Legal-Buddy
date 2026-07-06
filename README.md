**LawYar—Your Legal Buddy**
LawYar is an intelligent, conversational legal assistant built specifically for the Pakistani legal system. It uses a Retrieval-Augmented Generation (RAG) architecture to answer legal questions grounded strictly in real Pakistani statutes — such as the Pakistan Penal Code (PPC) and the Code of Criminal Procedure (CrPC) — eliminating the hallucination risks common in generic AI chatbots.
"Pakistan's Law, finally speaking your language."

**🧭 Table of Contents**
Overview
Problem Statement
Key Features
System Architecture
Tech Stack
Getting Started
How It Works (RAG Pipeline)
Results
Future Work

**📖 Overview**

Legal research in Pakistan is traditionally slow, expensive, and inaccessible to non-experts. Generic AI chatbots (like ChatGPT) often mix foreign legal concepts with Pakistani law, producing hallucinated or legally invalid advice.

LawYar solves this by pairing a conversational chat interface with a curated vector database of authentic Pakistani legal statutes. Every response is generated only from text retrieved from this database — if no relevant law is found, the system explicitly says so instead of guessing.

This repository contains the web application — a full-stack MERN + Python NLP system.


**Problem Statement**

Pakistani laws (PPC, CrPC, etc.) are written in dense, archaic legal language that is hard for ordinary citizens to understand.
Generic LLMs are prone to hallucination and often blend in foreign (US/UK) legal concepts.
Traditional legal research platforms (e.g. Pakistan Law Site) only support rigid keyword search — no natural conversation.
Basic legal consultations can be prohibitively expensive for simple questions.
Most platforms lack accessibility features for visually impaired or low-literacy users.

** Key Features**

💬 Conversational Legal Chatbot — ask legal questions in plain English or Urdu.
📚 Retrieval-Augmented Generation (RAG) — answers are grounded in a real, curated Pakistan Laws Dataset (no hallucinated statutes).
📌 Source Citations — every answer references the exact section of law it came from (e.g. "According to Section 379 of the PPC").
🚫 Anti-Hallucination Guardrails — if no relevant law is found, the system responds with an explicit "information not found" message instead of fabricating one.
🎙️ Voice Accessibility — Speech-to-Text and Text-to-Speech support in both Urdu and English.
📖 Legislation Browser — browse and search the full text of Acts (PPC, CrPC) directly, without going through the chatbot.
🔐 Secure Authentication — JWT-based auth with hashed passwords, session-based chat history.
🌐 Bilingual Support — multilingual (BERT-based) embeddings allow seamless switching between Urdu and English queries.



**System Architecture**
LawYar's web app follows a decoupled, multi-tier architecture that separates lightweight web operations from heavy AI computation:

┌─────────────────────┐
│   Client Tier        │   React.js SPA (Chat UI, Legislation Browser)
└──────────┬───────────┘
           │ HTTP/HTTPS
┌──────────▼───────────┐
│  API & Routing Tier   │   Node.js / Express.js
│  - Auth (JWT)         │
│  - Session Mgmt       │
│  - Proxy to AI Engine │
└──────────┬───────────┘
           │
┌──────────▼───────────┐        ┌─────────────────────┐
│   AI & Data Tier      │◄──────►│  Google Cloud Speech │
│  - Python (FastAPI)   │        │  (STT / TTS)         │
│  - Embedding (BERT)    │        └─────────────────────┘
│  - FAISS Vector Search│
│  - Hugging Face LLM   │
└──────────┬───────────┘
           │
┌──────────▼───────────┐        ┌─────────────────────┐
│  Pakistan Laws Dataset │        │  MongoDB             │
│  (PPC, CrPC — vectorized)      │  (Users, Chat History)│
└───────────────────────┘        └─────────────────────┘

**Core subsystems:**
Application API Subsystem (Node.js) — handles auth, chat history, and routing.
Retrieval / NLP Subsystem (Python + FastAPI) — embeds queries, performs FAISS similarity search, and generates grounded responses.
Voice Processing Subsystem — integrates Google Cloud Speech-to-Text and Text-to-Speech.
Client Interface Subsystem (React.js) — renders the chat UI and Legislation Browser.

**Tech Stack**
LayerTechnologyFrontendReact.jsBackend API (Routing & Auth)Node.js, Express.jsAI / NLP EnginePython, FastAPIGenerative AI FrameworkHugging Face TransformersVector Database (RAG)FAISS (Facebook AI Similarity Search)User & History DatabaseMongoDB (NoSQL)Voice ProcessingGoogle Cloud Speech-to-Text & Text-to-SpeechAuthJWT + bcrypt

**How It Works (RAG Pipeline)**

User submits a query (text or voice) via the React chat interface.
Node.js API authenticates the request (JWT) and forwards the query to the Python NLP engine.
Query embedding — the query is converted into a dense vector using a multilingual BERT-based model.
Similarity search — FAISS searches the vectorized Pakistan Laws Dataset for the most relevant statutes/sections.
Grounded generation — the LLM (via Hugging Face Transformers) generates a response using only the retrieved legal text — never from its own memory.
Fallback safeguard — if no relevant statute is found, the system returns an "Information not found" message instead of guessing.
Response delivery — the answer (with citations) is stored in MongoDB and returned to the user, optionally read aloud via Text-to-Speech.


**Results**

Retrieval Accuracy: ~80% on a 50-query benchmark test set.
Hallucination Prevention: 100% refusal rate on out-of-scope (non-legal) queries.
Average Latency: ~3.2 seconds end-to-end (text queries).
Transcription Accuracy: ~88% (English), ~80% (Urdu).

**Future Work**

📌 Integration of real-time case law and judicial precedents (Supreme Court / High Court rulings).
📝 Automated legal document drafting (affidavits, rent agreements, legal notices).
🗣️ Fine-tuned Urdu LLM for improved legal-domain generation and transcription.
👨‍⚖️ "Pro" tier connecting users directly with licensed lawyers.
📴 Offline-capable legislation browser for low-connectivity areas.



