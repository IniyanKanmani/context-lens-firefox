export async function getEnv(key) {
  let value = "";

  try {
    const response = await fetch(browser.runtime.getURL(".env"));
    const text = await response.text();
    const lines = text.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith(`${key}=`)) {
        value = trimmed.split("=")[1].replace(/"/g, "");
        break;
      }
    }
  } catch (e) {
    console.error("Failed to load .env:", e);
  }

  return value;
}
