let selectionPopup = null;
let lastSelectedText = '';
let autoCloseTimer = null;
let chatHistory = [];

function extractGitHubInfo(url) {
  const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/);
  if (match) {
    const [_, owner, repo, branch, filePath] = match;
    return { owner, repo, branch, filePath };
  }
  return null;
}

function getRepoInfo() {
  return new Promise((resolve) => {
    const repo_obj = {
      'file tree': null,
      'file name': 'not available',
      'repo name': 'not available',
      'branch': 'not available',
      'owner': 'not available'
    };

    const currentUrl = window.location.href;
    const dfu = extractGitHubInfo(currentUrl);
    if (dfu) {
      repo_obj['file name'] = dfu.filePath;
      repo_obj['repo name'] = dfu.repo;
      repo_obj['branch'] = dfu.branch;
      repo_obj['owner'] = dfu.owner;
    }

    const repo_req = {
      'owner': repo_obj['owner'],
      'repo': repo_obj['repo name'],
      'branch': repo_obj['branch']
    };

    chrome.runtime.sendMessage({ action: 'repoTree', payload: repo_req }, (response) => {
      if (!chrome.runtime.lastError && response?.result?.tree) {
        repo_obj['file tree'] = response.result.tree.map(item => item.path).sort().join('\n');
      }
      resolve(repo_obj);
    });
  });
}

function promptBuilder(repo_info, results, context = 1) {
  const textareas = Array.from(document.querySelectorAll('#read-only-cursor-text-area'));
  const codeText = textareas.map(t => t.value || t.textContent || '').join('\n\n---\n\n').trim();

  let prompt = `In a GitHub repo titled ${repo_info['repo name']}`;
  if (repo_info['file tree'] && repo_info['file tree'].length < 2000) {
    prompt += ` the following code files exist:\n\n${repo_info['file tree']}\n\n`;
  }

  if (context !== 1) {
    prompt += `Explain the file called: \"${repo_info['file name']}\":\n${codeText}\n\nin context of the project.`;
  } else {
    prompt += `,Given below is the file named \"${repo_info['file name']}\":\n${codeText}\n\nWith the given information, explain the following code portion which was selected from the given file:\n${results}\n\n`;
  }
  return prompt;
}

async function sendToDeepSeek(results, context = 1) {
  try {
    const repo_info = await getRepoInfo();
    const prompt = promptBuilder(repo_info, results, context);

    chatHistory.push({ role: 'user', parts: [{ text: prompt }] });

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        if (chrome.runtime.lastError) {
          chatHistory.pop();
          resolve('❌ Error: ' + chrome.runtime.lastError.message);
        } else {
          const result = response?.result || 'an unexpected error occurred';
          if (result !== 'an unexpected error occurred') {
            chatHistory.push({ role: 'model', parts: [{ text: result }] });
          } else {
            chatHistory.pop();
          }
          resolve(result);
        }
      });
    });
  } catch (err) {
    return `❌ Failed to extract repo info: ${err.message}`;
  }
}

function removePopup() {
  if (selectionPopup) {
    selectionPopup.remove();
    selectionPopup = null;
  }
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer);
    autoCloseTimer = null;
  }
}

function createResponsePage(responseText) {
  selectionPopup.innerHTML = '';

  const header = document.createElement('div');
  header.textContent = 'Code Assistant';
  header.style = 'font-size: 16px; font-weight: bold; margin-bottom: 10px; text-align: center;';

  const responseContainer = document.createElement('div');
  responseContainer.style = `
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fafafa;
    margin-bottom: 10px;
    white-space: pre-wrap;
    max-height: 200px;  /* Set max height for scroll */
  `;
  responseContainer.textContent = responseText;

  const inputArea = document.createElement('textarea');
  inputArea.placeholder = 'Ask a follow-up...';
  inputArea.style = `
    width: 100%;
    padding: 8px;
    border-radius: 6px;
    border: 1px solid #ccc;
    resize: vertical;
    min-height: 50px;
    margin-top: 10px;
  `;

  const buttonRow = document.createElement('div');
  buttonRow.style = 'display: flex; justify-content: space-between; margin-top: 8px;';

  const backButton = createStyledButton('← Back', '#ccc');
  const followUpBtn = createStyledButton('Submit', '#444');

  backButton.onclick = () => createPopupUI(lastSelectedText);
  followUpBtn.onclick = () => {
    const followUpText = inputArea.value.trim();
    if (followUpText) {
      responseContainer.textContent = '⏳ Loading...';
      chatHistory.push({ role: 'user', parts: [{ text: followUpText }] });
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        const text = response?.result || 'an unexpected error occurred';
        responseContainer.textContent = text;
        if (text !== 'an unexpected error occurred') {
          chatHistory.push({ role: 'model', parts: [{ text }] });
        } else {
          chatHistory.pop();
        }
      });
    }
  };

  buttonRow.append(backButton, followUpBtn);

  selectionPopup.style.height = '400px';  // Fixed height for response popup
  selectionPopup.style.display = 'flex';
  selectionPopup.style.flexDirection = 'column';
  selectionPopup.style.justifyContent = 'space-between';

  selectionPopup.append(header, responseContainer, inputArea, buttonRow);
}


function createPopupUI(text) {
  removePopup();
  lastSelectedText = text;

  selectionPopup = document.createElement('div');
  selectionPopup.className = 'custom-selection-popup';
  selectionPopup.style = 'position: fixed; top: 20px; right: 20px; background: #fff; color: #000; border: 1px solid #ddd; border-radius: 12px; padding: 15px; font-size: 13px; width: 350px; height: auto; box-shadow: 0 6px 20px rgba(0,0,0,0.2); display: flex; flex-direction: column; gap: 10px;';

  const header = document.createElement('div');
  header.textContent = 'Code Assistant';
  header.style = 'font-size: 16px; font-weight: bold; text-align: center;';

  const explainBtn = createStyledButton('Explain Selected Code', '#0969da');
  const showCodeBtn = createStyledButton('Explain Full Code', '#22a65b');

  explainBtn.onclick = async () => {
    explainBtn.textContent = 'Loading...';
    explainBtn.disabled = true;
    showCodeBtn.disabled = true;
    const resultText = await sendToDeepSeek(lastSelectedText, 1);
    createResponsePage(resultText);
  };

  showCodeBtn.onclick = async () => {
    showCodeBtn.textContent = 'Loading...';
    explainBtn.disabled = true;
    showCodeBtn.disabled = true;
    const resultText = await sendToDeepSeek('', 0);
    createResponsePage(resultText);
  };

  const footer = document.createElement('div');
  footer.textContent = 'Powered by DeepSeek AI';
  footer.style = 'text-align: center; font-size: 11px; color: #888;';

  selectionPopup.append(header, explainBtn, showCodeBtn, footer);
  document.body.appendChild(selectionPopup);
}

function createStyledButton(text, bgColor) {
  const button = document.createElement('button');
  button.textContent = text;
  button.style = `width: 100%; padding: 10px; background: ${bgColor}; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;`;
  button.onmouseover = () => button.style.background = darkenColor(bgColor, 0.1);
  button.onmouseout = () => button.style.background = bgColor;
  return button;
}

function darkenColor(hex, lum) {
  let rgb = "#", c;
  for (let i = 1; i < 7; i++) {
    c = parseInt(hex.substr(i,1),16);
    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 15));
    rgb += c.toString(16);
  }
  return rgb;
}

const blobRegex = /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/.+/;
let lastUrl = location.href;

function onUrlChange() {
  if (blobRegex.test(location.href)) {
    chatHistory = [];
    createPopupUI('(No text selected yet)');
  } else {
    removePopup();
  }
}

setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    onUrlChange();
  }
}, 500);

function observePageChanges() {
  const targetNode = document.querySelector('#repo-content-pjax-container') || document.body;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onUrlChange();
    }
  });
  observer.observe(targetNode, { childList: true, subtree: true });
}

if (blobRegex.test(location.href)) {
  createPopupUI('(No text selected yet)');
  observePageChanges();
}

document.addEventListener('mouseup', (event) => {
  setTimeout(() => {
    const target = event.target;
    if (selectionPopup && selectionPopup.contains(target)) return;

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text) {
      removePopup();
      return;
    }

    createPopupUI(text);
  }, 50);
});
