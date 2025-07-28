let hfToken = null;
let apiKey = null;
let gitToken = null;


const systemInstruction = {
  role: 'developer',
  content: null
};

const LLM_URL = 'https://api.openai.com/v1/chat/completions';

// ✅ Promise to ensure config is loaded before handling messages
const configLoaded = new Promise((resolve, reject) => {
  fetch(chrome.runtime.getURL('config.json'))
    .then(response => response.json())
    .then(config => {
      apiKey = config.GPT_KEY;
      gitToken = config.GIT_KEY;
      systemInstruction.content = config.SYSTEM_PROMPT;
      console.log("✅ Token loaded");
      resolve();
    })
    .catch(err => {
      console.error("❌ Failed to load config.json:", err);
      reject(err);
    });
});

// ✅ Message listener waits for config to be loaded
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  configLoaded
    .then(() => handleMessage(message, sender, sendResponse))
    .catch(err => sendResponse({ success: false, error: 'Failed to load API keys' }));

  return true; // keep channel open for async `sendResponse`
});

// ✅ Message handler
function handleMessage(message, sender, sendResponse) {
  if (message.action === "askDeepSeek") {
    const payload = [systemInstruction, ...message.payload];
    console.log(payload);

    if (!apiKey) {
      console.warn("🚫 API key missing");
      sendResponse({ success: false, error: "API key not available" });
      return;
    }

    fetch(LLM_URL, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: payload
      })
    })
      .then(response => response.json())
      .then(data => {
        console.log(data);
        const content = data?.choices?.[0]?.message?.content || 'No response';
        sendResponse({ success: true, result: content });
      })
      .catch(error => {
        console.error("❌ LLM API error:", error);
        sendResponse({ success: false, error: error.message });
      });
  }

  else if (message.action === "repoTree") {
    const { owner, repo, branch } = message.payload;
    const cacheKey = `${owner}/${repo}@${branch}`;

    if (!gitToken) {
      console.warn("🚫 GitHub token missing");
      sendResponse({ success: false, error: "GitHub token not available" });
      return;
    }

    fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${gitToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
      }
    })
      .then(response => response.json())
      .then(data => {
        let res = null;
        try {
          res = data.tree.map(item => item.path).sort().join('\n');
        } catch (e) {
          console.warn("⚠️ GitHub tree parse error, falling back to cache");
          res = [];
        }
        sendResponse({ success: true, result: res });
      })
      .catch(error => {
        console.error("❌ GitHub fetch error:", error);
        sendResponse({ success: false, error: error.message });
      });
  }
}
