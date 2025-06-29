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
  const resultDiv = document.getElementById('output');
  if (resultDiv) resultDiv.textContent = '⏳ Loading...';
  console.log("going to llm");
  chrome.runtime.sendMessage({ action: 'askDeepSeek' }, (response) => {
    console.log("hi llm");
    if (chrome.runtime.lastError) {
      resultDiv.textContent = `❌ Error: ${chrome.runtime.lastError.message}`;
    } else {
      console.log(response.result);
      resultDiv.textContent = response?.result || '❌ No response';
    }
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
