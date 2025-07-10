let selectionPopup = null;
let lastSelectedText = '';
let autoCloseTimer = null;
let chatHistory = [];

function createPopupUI(text) {
  console.log('this was called');
  try {
    removePopup();
    lastSelectedText = text;

    selectionPopup = document.createElement('div');
    selectionPopup.className = 'custom-selection-popup';
    selectionPopup.style = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fff;
      color: #000;
      border: 1px solid #ddd;
      border-radius: 12px;
      padding: 15px;
      font-size: 13px;
      width: 350px;
      height: auto;
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 9999;
    `;

    const header = document.createElement('div');
    header.style = `
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const logo = document.createElement('img');
    logo.src = 'clara.jpg'; 
    logo.alt = 'CLARA';
    logo.style = 'width: 80px; height: 80px; margin-left: auto; margin-right: auto; display: block;';

    const logoContainer = document.createElement('div');
    logoContainer.style = 'flex-grow: 1; display: flex; justify-content: center;';
    logoContainer.appendChild(logo);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style = `
      background: transparent;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #888;
    `;
    closeBtn.onclick = () => {
      removePopup();
    };

    header.appendChild(closeBtn);
    header.appendChild(logoContainer);

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
    footer.textContent = 'Powered by ChatGPT 4o';
    footer.style = 'text-align: center; font-size: 11px; color: #888;';

    selectionPopup.append(header, explainBtn, showCodeBtn, footer);
    document.body.appendChild(selectionPopup);

    console.log('no problems');
  }
  catch (err) {
    console.log(err.message);
  }
  console.log('this was called too');
}



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

function createResponsePage(initialResponseText) {
  selectionPopup.innerHTML = '';

  const header = document.createElement('div');
  header.textContent = 'Code Assistant';
  header.style = 'font-size: 16px; font-weight: bold; margin-bottom: 8px; text-align: center;';

  // Taller Initial Response Section
  const initialResponseContainer = document.createElement('div');
  initialResponseContainer.style = `
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #fafafa;
    margin-bottom: 10px;
    white-space: pre-wrap;
    max-height: 160px;
    overflow-y: auto;
    font-size: 13px;
  `;
  initialResponseContainer.textContent = initialResponseText;

  // Enlarged Chat Area
  const chatContainer = document.createElement('div');
  chatContainer.style = `
    flex: 1;
    overflow-y: auto;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #fff;
    margin-bottom: 8px;
    max-height: 220px;
    font-size: 13px;
  `;

  // Compact Input Area
  const inputArea = document.createElement('textarea');
  inputArea.placeholder = 'Ask a follow-up...';
  inputArea.style = `
    width: 100%;
    padding: 6px;
    border-radius: 4px;
    border: 1px solid #ccc;
    resize: vertical;
    min-height: 36px;
    font-size: 12px;
  `;

  const buttonRow = document.createElement('div');
  buttonRow.style = 'display: flex; justify-content: space-between; margin-top: 6px;';

  const backButton = createStyledButton('← Back', '#ccc');
  const followUpBtn = createStyledButton('Submit', '#444');

  [backButton, followUpBtn].forEach(btn => {
    btn.style.padding = '4px 8px';
    btn.style.fontSize = '12px';
  });

  backButton.onclick = () => {
    selectionPopup.innerHTML = '';
    popupVisible = false;
    createPopupUI(lastSelectedText);
  };


  followUpBtn.onclick = () => {
    const followUpText = inputArea.value.trim();
    if (followUpText) {
      appendChatMessage(chatContainer, 'User', followUpText);
      inputArea.value = '';

      appendChatMessage(chatContainer, 'Assistant', '⏳ Loading...');

      chatHistory.push({ role: 'user', parts: [{ text: followUpText }] });

      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        const text = response?.result || 'An unexpected error occurred';

        const loadingMessages = chatContainer.querySelectorAll('.assistant-message');
        if (loadingMessages.length > 0) {
          loadingMessages[loadingMessages.length - 1].remove();
        }

        appendChatMessage(chatContainer, 'Assistant', text);

        if (text !== 'An unexpected error occurred') {
          chatHistory.push({ role: 'model', parts: [{ text }] });
        } else {
          chatHistory.pop();
        }
      });
    }
  };

  buttonRow.append(backButton, followUpBtn);

  selectionPopup.style.height = '500px';  // Taller overall popup
  selectionPopup.style.display = 'flex';
  selectionPopup.style.flexDirection = 'column';
  selectionPopup.style.padding = '8px';

  selectionPopup.append(header, initialResponseContainer, chatContainer, inputArea, buttonRow);
}

// Chat message appender
function appendChatMessage(container, sender, message) {
  const messageDiv = document.createElement('div');
  messageDiv.style = `
    margin-bottom: 4px;
    padding: 5px 8px;
    border-radius: 5px;
    background: ${sender === 'User' ? '#e1f5fe' : '#f5f5f5'};
    font-size: 12px;
    white-space: pre-wrap;
  `;
  messageDiv.textContent = `${sender}: ${message}`;
  messageDiv.className = sender === 'Assistant' ? 'assistant-message' : '';
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
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

let popupVisible = false;

document.addEventListener('mouseup', (event) => {
  if (popupVisible) return;  // Don’t trigger if popup is showing

  setTimeout(() => {
    const target = event.target;
    if (selectionPopup && selectionPopup.contains(target)) return;

    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (!text) {
      removePopup();
      popupVisible = false;
      return;
    }

    createPopupUI(text);
    popupVisible = true;  // Mark popup as visible
  }, 50);
});
