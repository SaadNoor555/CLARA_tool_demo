// document.getElementById('extractTextarea').addEventListener('click', async () => {
//   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

//   chrome.scripting.executeScript({
//     target: { tabId: tab.id },
//     func: () => {
//       const textarea = document.getElementById('read-only-cursor-text-area');
//       return textarea ? textarea.value.trim() : '❌ Textarea not found.';
//     }
//   }, (results) => {
//     document.getElementById('output').textContent = results?.[0]?.result ?? '❌ No result.';
//   });
// });


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
    if (resultDiv) resultDiv.textContent = '⏳ Loading...';
    console.log("going to llm");
    chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: "Explain this code:\n" + results?.[0]?.result || []}, (response) => {
      console.log("hi llm");
      if (chrome.runtime.lastError) {
        resultDiv.textContent = `❌ Error: ${chrome.runtime.lastError.message}`;
      } else {
        console.log(response.result);
        resultDiv.textContent = response?.result || '❌ No response';
      }
    });
  });
});

document.getElementById('showSelection').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.getSelection().toString().trim() || '❌ No text selected.'
  }, (results) => {
    const resultDiv = document.getElementById('output');
    if (resultDiv) resultDiv.textContent = '⏳ Loading...';
    console.log("going to llm");
    chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: "Explain this code portion:\n" + results?.[0]?.result || []}, (response) => {
      console.log("hi llm");
      if (chrome.runtime.lastError) {
        resultDiv.textContent = `❌ Error: ${chrome.runtime.lastError.message}`;
      } else {
        console.log(response.result);
        resultDiv.textContent = response?.result || '❌ No response';
      }
    });
  });
});
