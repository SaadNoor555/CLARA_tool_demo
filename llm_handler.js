let hfToken = null;

// Load token on startup
fetch(chrome.runtime.getURL("config.json"))
  .then(response => response.json())
  .then(config => {
    hfToken = config.HF_TOKEN;
    console.log("✅ Token loaded");
  })
  .catch(err => console.error("❌ Failed to load config.json:", err));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "askDeepSeek") {
    console.log("payload: ")
    console.log(message.payload);
    const HF_TOKEN = hfToken; // Replace this with your actual token

    fetch("https://router.huggingface.co/fireworks-ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: message.payload || "What is the capital of France?"
          }
        ],
        model: "accounts/fireworks/models/deepseek-r1-0528",
        stream: false
      })
    })
      .then(response => response.json())
      .then(data => {
        console.log(data.choices[0].message.content);
        sendResponse({ success: true, result: data.choices[0].message.content });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keeps the message channel open for async `sendResponse`
  }
});
