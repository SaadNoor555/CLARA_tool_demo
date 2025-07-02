let hfToken = null;


// https://router.huggingface.co/novita/v3/openai/chat/completions

// {
//         model: "deepseek/deepseek-r1-0528",
//         stream: false,
//         messages: [
//           {
//             role: "user",
//             content: message.payload || "What is the capital of France?"
//           }
//         ]
//       }

const LLM_URL = 'https://81fc-128-239-2-78.ngrok-free.app/infer'

// Load token on startup
// fetch(chrome.runtime.getURL("config.json"))
//   .then(response => response.json())
//   .then(config => {
//     hfToken = config.HF_TOKEN;
//     console.log("✅ Token loaded");
//   })
//   .catch(err => console.error("❌ Failed to load config.json:", err));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "askDeepSeek") {
    console.log("payload: ")
    console.log(message.payload);
    const HF_TOKEN = hfToken; // Replace this with your actual token

    fetch(LLM_URL, {
      method: "POST", // ✅ Required for POST
      headers: {
        // "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "text" : message.payload || "What is the capital of France?"
      })
    })
      .then(response => response.json())
      .then(data => {
        console.log(data);
        // sendResponse({ success: true, result: data.choices[0].message.content });
        sendResponse({success: true, result: data})
      })
      .catch(error => {
        console.log(error.message);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keeps the message channel open for async `sendResponse`
  }
});
