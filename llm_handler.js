let hfToken = null;
let apiKey = null;
let gitToken = null;

// https://router.huggingface.co/fireworks-ai/inference/v1/chat/completions
// headers: {
//         "Authorization": `Bearer ${TOKEN}`,
//         "Content-Type": "application/json"
//       }

// body: JSON.stringify({
//         messages: [
//           {
//             role: "user",
//             content: message.payload || "What is the capital of France?"
//           }
//         ],
//         model: "accounts/fireworks/models/deepseek-r1-0528",
//         stream: false
//       })


const LLM_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

// Load token on startup
fetch(chrome.runtime.getURL("config.json"))
  .then(response => response.json())
  .then(config => {
    apiKey = config.API_KEY
    hfToken = config.HF_TOKEN;
    gitToken = config.GIT_KEY;
    console.log("✅ Token loaded");
  })
  .catch(err => console.error("❌ Failed to load config.json:", err));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.action === "askDeepSeek") {
    // console.log("payload: ")
    console.log(message.payload);

    var payload = {
      contents: message.payload,
    };


    const TOKEN = apiKey; // Replace this with your actual token

    fetch(LLM_URL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': TOKEN,
      },
      body: JSON.stringify(payload)
    })
      .then(response => response.json())
      .then(data => {
        console.log(data);
        sendResponse({ success: true, result: data["candidates"][0]["content"]["parts"][0]["text"] });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keeps the message channel open for async `sendResponse`
  }


  else if(message.action == "repoTree") {

    const GITHUB_TOKEN = gitToken;
    const OWNER = message.payload['owner']
    const REPO = message.payload['repo']
    const BRANCH = message.payload['branch']

    fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
      }
    })
    .then(response => response.json())
      .then(data => {
        console.log(data);
        sendResponse({ success: true, result: data});
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});
