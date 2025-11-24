# ContextLens-Firefox

**ContextLens** is a Firefox Addon designed to bring contextual AI assistance directly to your browser.

Simply highlight any text on a webpage, use Shift+Alt+E for instant explanation or Shift+Alt+C for contextual explanation with additional input, and ContextLens will display an insightful reply, helping you understand or summarize the highlighted content without leaving your current tab in a popup.

## Usage

- Highlight text on any webpage.
- Press Shift+Alt+E for a quick AI explanation or Shift+Alt+C to provide additional context before getting the AI response.
- A popup will display the AI response without leaving the page.

## Dev Installation

1. Clone the repository and navigate to the project directory.
2. Copy the `.env.example` file to `.env`:
   ```
   cp .env.example .env
   ```
3. Obtain an API key from [OpenRouter](https://openrouter.ai/keys).
4. Edit the `.env` file and add your OpenRouter API key and preferred model:
   ```
   OPENROUTER_API_KEY=your_api_key_here
   OPENROUTER_MODEL=your_model_name_here
   ```
   For example, you can use `openai/gpt-oss-20b:free` or any other model available on OpenRouter.
5. Load the extension temporarily in Firefox:
   - Open Firefox and go to `about:debugging`.
   - Click "This Firefox" in the left sidebar.
   - Click "Load Temporary Add-on".
   - Select the `manifest.json` file from the project root.

## Privacy

This extension sends highlighted text to [OpenRouter](https://openrouter.ai) for processing. By default the selected LLM providers are set to not collect data and who has agreed to ZDR (Zero Data Retention) policy.

## Future Plans

- [x] **Customizable Keyboard Shortcuts**: Allow users to set their preferred key combination to trigger the extension.
- [x] **Additional Context Input**: Include a text field for users to provide extra context beyond the selected text.
- [ ] **Screenshot Integration**: Enable capturing and using webpage screenshots as supplementary context for AI queries.

## Contributing

### Reporting Issues

If you encounter any bugs or have feature requests, please create an issue on our [GitHub repository](https://github.com/IniyanKanmani/context-lens-firefox/issues).
