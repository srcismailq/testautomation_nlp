# Test Automation with Natural Language

An open-source test automation framework that allows users to create browser automation scripts using natural language instead of writing code.

The project combines Stagehand, Playwright, and Large Language Models (LLMs) to convert plain English instructions into executable browser actions. The goal is to make test automation easier for both developers and non-technical users.

---

## Overview

Traditional test automation requires programming knowledge and manual scripting. This project simplifies that process by allowing users to describe a test scenario in plain English.

For example:

> Open Amazon, search for "iPhone 16", and add the first product to the cart.

The framework interprets the instruction, generates the required browser actions, and executes them automatically.

---

## Features

- Create browser automation using natural language
- Playwright-based browser automation
- Support for multiple LLM providers
- Electron desktop application
- Test case generation
- Browser interaction recording
- Modular architecture
- Local and cloud execution support
- Open-source and customizable

---

## Project Structure

```text
.
├── assertion-attem/          # Assertion module
├── clpower/                  # Electron UI components
├── citron/                   # Electron interface
├── finalbrain/               # Core application logic
├── locator_picker/           # DOM element picker
├── simple_stagehand_tests/   # Sample automation scripts
├── testcase/                 # Test case generation
├── recorder-ui.ts            # Browser recorder
├── citronbridge.ts           # Communication bridge
├── stagehand-ngllama-client.ts
├── stagehand-openrouter-client.ts
├── testcase_reader.ts
├── package.json
└── ...
```

---

## Technologies Used

- Stagehand
- Playwright
- Electron
- TypeScript
- OpenRouter
- Ollama
- Browserbase
- Vercel AI SDK
- Kaggle

---

## How It Works

1. The user enters a test scenario in plain English.
2. The instruction is processed by an LLM.
3. Stagehand converts it into browser automation steps.
4. Playwright executes those actions.
5. The results are displayed through the Electron application.

```text
Natural Language
        │
        ▼
      LLM
        │
        ▼
   Stagehand
        │
        ▼
    Playwright
        │
        ▼
 Browser Automation
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/srcismailq/testautomation_nlp.git
```

Move into the project directory:

```bash
cd testautomation_nlp
```

Install the dependencies:

```bash
pnpm install
```

or

```bash
npm install
```

Run the application:

```bash
pnpm start
```

or

```bash
npm start
```

---

---

## Documentation

For a detailed explanation of the project, please refer to the project presentation:

- [Test-Automation-with-Natural-Details.pptx](./Test-Automation-with-Natural-Details.pptx)

The presentation provides additional information about the project's problem statement, system architecture, workflow, implementation, technology stack, literature review, and future work.

## Example

Input:

```text
Open GitHub.
Log in using saved credentials.
Search for "Stagehand".
Open the first repository.
Star the repository.
```

The framework converts these instructions into executable browser automation without requiring the user to write Playwright scripts.

---

## Main Components

### Stagehand

Converts natural language instructions into executable browser actions.

### Playwright

Handles browser automation across supported browsers.

### LLM Clients

Supports multiple providers including:

- OpenAI
- Gemini
- DeepSeek
- Ollama
- OpenRouter

### Test Case Generator

Generates reusable automation workflows from natural language prompts.

### Recorder

Records browser interactions to simplify automation creation.

### Locator Picker

Helps identify webpage elements for reliable automation.

---

## Future Work

The following features are planned for future development:

- Smart assertion generation
- Self-healing tests
- Interactive test case editor
- Vision-based browser automation
- Execution logs and reporting
- Test case caching
- Parallel test execution

---

## Contributors

- Kalpesh Patil
- Vinit Shelar
- Vipin Desale
- Ismail Patel

**Guide:** Prof. Santosh Varpe

---

## License

This project is licensed under the MIT License.

Contributions, suggestions, and feedback are welcome.
