function sendToDeepSeek(results, resultDiv, context = "code portion") {
  const extracted = results?.[0]?.result ?? '';
  const prompt = `Explain this ${context} briefly (within 100 words):\n` + extracted;

  if (resultDiv) resultDiv.textContent = '⏳ Loading...';

  chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: prompt }, (response) => {
    if (chrome.runtime.lastError) {
      resultDiv.textContent = `❌ Error: ${chrome.runtime.lastError.message}`;
    } else {
      resultDiv.textContent = response?.result || '❌ No response';
    }
  });
}

document.getElementById('extractTextarea').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const textareas = document.querySelectorAll("#read-only-cursor-text-area");
      return Array.from(textareas).map(el => el.value.trim());
    }
  }
  , (results) => {
    const resultDiv = document.getElementById('output');
    sendToDeepSeek(results, resultDiv, "code");
  });
});

document.getElementById('showSelection').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString().trim() || '❌ No text selected.'
  }, (results) => {
    const resultDiv = document.getElementById('output');
    sendToDeepSeek(results, resultDiv, "code portion");
  });
});
