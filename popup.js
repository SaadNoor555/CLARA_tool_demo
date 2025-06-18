document.getElementById('extractTextarea').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const textarea = document.getElementById('read-only-cursor-text-area');
      return textarea ? textarea.value.trim() : '❌ Textarea not found.';
    }
  }, (results) => {
    document.getElementById('output').textContent = results?.[0]?.result ?? '❌ No result.';
  });
});

document.getElementById('showSelection').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString().trim() || '❌ No text selected.'
  }, (results) => {
    document.getElementById('output').textContent = results?.[0]?.result ?? '❌ No result.';
  });
});
