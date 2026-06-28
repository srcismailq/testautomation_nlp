# 🚀 Test Automation with Natural Language

An open-source AI-powered test automation framework that enables users to create browser automation scripts using plain English instead of writing code.

Built using **Stagehand**, **Playwright**, and **Large Language Models (LLMs)**, the framework translates natural language instructions into executable browser actions, making automation accessible to both technical and non-technical users.

---

## 📌 Overview

Traditional test automation requires programming knowledge and manual script development. This project removes that barrier by allowing users to describe test scenarios in natural language.

Example:

> "Open Amazon, search for iPhone 16, add the first result to the cart."

The framework automatically converts the instruction into browser automation steps and executes them using Playwright.

---

## ✨ Features

- 🧠 Natural Language → Browser Automation
- 🌐 Playwright-based browser automation
- 🤖 Multiple LLM support
  - OpenAI
  - Gemini
  - DeepSeek
  - Ollama (Local)
  - OpenRouter
- ⚡ Electron-based Desktop UI
- 📋 Test case generation
- 🖥️ Browser interaction recording
- 🔄 Reusable automation workflows
- 📦 Modular architecture
- 🔓 Completely Open Source

---

## 🏗️ Project Structure

```
.
├── assertion-attem/          # Assertion module
├── clpower/                  # Electron UI components
├── citron/                   # Electron interface
├── finalbrain/               # Main application logic
├── locator_picker/           # DOM element picker
├── simple_stagehand_tests/   # Sample automation scripts
├── testcase/                 # Testcase generation
├── recorder-ui.ts            # Browser recorder
├── citoonbridge.ts           # Communication bridge
├── stagehand-ngllama-client.ts
├── stagehand-openrouter-client.ts
├── testcase_reader.ts
├── package.json
└── ...
```

---

## ⚙️ Technologies Used

| Technology | Purpose |
|------------|----------|
| Stagehand | Natural language browser automation |
| Playwright | Browser automation engine |
| Electron | Desktop application |
| TypeScript | Application development |
| OpenRouter | Access multiple LLM providers |
| Ollama | Local LLM execution |
| Vercel AI SDK | LLM abstraction layer |
| Browserbase | Cloud browser execution |
| Kaggle | Remote GPU support |

---

## 🧠 How It Works

1. User enters a natural language instruction.
2. The instruction is sent to an LLM.
3. Stagehand converts the instruction into browser actions.
4. Playwright executes the generated automation.
5. Results are displayed through the Electron interface.

```
Natural Language
        │
        ▼
      LLM
        │
        ▼
   Stagehand Engine
        │
        ▼
    Playwright
        │
        ▼
 Browser Automation
```

---

## 🚀 Installation

Clone the repository

```bash
git clone https://github.com/<your-username>/<repository-name>.git
```

Move into the project

```bash
cd <repository-name>
```

Install dependencies

```bash
pnpm install
```

or

```bash
npm install
```

Run the project

```bash
pnpm start
```

or

```bash
npm start
```

---

## 💻 Example Prompt

```
Open GitHub.

Login using saved credentials.

Search for "Stagehand".

Open the first repository.

Star the repository.

Close the browser.
```

The framework automatically performs these actions without writing Playwright code.

---

## 📂 Core Modules

### 🧠 Stagehand Integration

Converts natural language into executable browser actions.

### 🌐 Playwright Engine

Executes browser automation across Chromium-based browsers.

### 🤖 LLM Clients

Supports multiple providers through:

- OpenAI
- Gemini
- DeepSeek
- Ollama
- OpenRouter

### 📋 Testcase Generator

Creates reusable automation workflows from natural language.

### 🎥 Recorder UI

Captures browser interactions for easier automation generation.

### 🎯 Locator Picker

Helps identify webpage elements for robust automation.

---

## 🎯 Objectives

- Simplify test automation
- Reduce scripting effort
- Enable non-programmers to create automation
- Improve productivity
- Support privacy-focused local execution
- Provide an open-source alternative to commercial tools

---

## 🔮 Future Roadmap

- AI-powered self-healing tests
- Interactive testcase editor
- Smart assertion generation
- Vision-enabled browser automation
- Human-in-the-loop execution
- Execution analytics
- Test logging dashboard
- Advanced testcase caching
- Multi-browser parallel execution

---

## 📊 Advantages

- Less coding
- Faster test creation
- Easy maintenance
- Multiple LLM support
- Open-source
- Modular architecture
- Local or cloud deployment

---

## 📚 References

- Stagehand
- Playwright
- Browserbase
- OpenRouter
- Ollama
- Vercel AI SDK

---

## 👨‍💻 Contributors

- **Kalpesh Patil**
- **Vinit Shelar**
- **Vipin Desale**
- **Ismail Patel**

Guide:
**Prof. Santosh Varpe**

---

## 📄 License

This project is released under the MIT License.

Feel free to use, modify, and contribute.

---

⭐ If you found this project useful, consider giving it a star on GitHub.
