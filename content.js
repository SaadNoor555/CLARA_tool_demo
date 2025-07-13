let selectionPopup = null;
let lastSelectedText = '';
let autoCloseTimer = null;
let chatHistory = [];
let popupVisible = false;

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
      background: var(--popup-bg, #fff);
      color: var(--popup-text, #333);
      border: 1px solid var(--popup-border, #ddd);
      border-radius: 12px;
      padding: 20px;
      font-size: 14px;
      width: 350px;
      height: auto;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 15px;
      z-index: 9999;
      max-height: 80vh; 
      overflow-y: auto; 
    `;

    const header = document.createElement('div');
    header.style = `
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-weight: bold;
      padding-bottom: 10px;
    `;

    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('clara.jpg'); 
    logo.alt = 'CLARA';
    logo.style = 'width: 80px; height: 80px; margin-left: auto; margin-right: auto; display: block;';

    const logoContainer = document.createElement('div');
    logoContainer.style = 'flex-grow: 1; display: flex; justify-content: center;';
    logoContainer.appendChild(logo);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style = `
      background: none;
      border: none;
      font-size: 16px;
      color: var(--popup-text, #333);
      cursor: pointer;
      padding: 5px;
      transition: all 0.3s ease;
      transform: translateY(-10px); /* Moves the button slightly above */
    `;
    closeBtn.onclick = () => {
      removePopup();
    };

    header.appendChild(closeBtn);
    header.appendChild(logoContainer);

    const showCodeBtn = createStyledButton('Explain Full Code File', '#74A9F8');   
    const explainBtn = createStyledButton('Explain Marked/Selected Code', '#3A78C2');        
    const refactorBtn = createStyledButton('Refactor the Code', '#255BB5');           
    const statsBtn = createStyledButton('See Code Quality Attributes', '#1A4494');      

    explainBtn.onclick = async () => {
      explainBtn.textContent = '🔎 Loading...';
      explainBtn.disabled = true;
      showCodeBtn.disabled = true;
      refactorBtn.disabled = true;
      statsBtn.disabled = true;
      if(lastSelectedText!==null) {
        const resultText = await sendToDeepSeek(lastSelectedText, 1);
        createResponsePage(resultText);
      }
      else {
        explainBtn.textContent = 'Please Select Something First!';
        showCodeBtn.disabled = false;
        refactorBtn.disabled = false;
        statsBtn.disabled = false;
      }
    };

    showCodeBtn.onclick = async () => {
      showCodeBtn.textContent = '🔎 Loading...';
      explainBtn.disabled = true;
      showCodeBtn.disabled = true;
      refactorBtn.disabled = true;
      statsBtn.disabled = true;
      const resultText = await sendToDeepSeek('', 0);
      createResponsePage(resultText);
    };

    refactorBtn.onclick = async () => {
      refactorBtn.textContent = '🔎 Loading...';
      explainBtn.disabled = true;
      showCodeBtn.disabled = true;
      refactorBtn.disabled = true;
      const resultText = await sendToDeepSeek('', 2);
      createResponsePage(resultText);
    }

    statsBtn.onclick = async () => {
      statsBtn.textContent = '🔎 Loading...';
      explainBtn.disabled = true;
      showCodeBtn.disabled = true;
      refactorBtn.disabled = true;
      statsBtn.disabled = true;
      const resultText = await sendToDeepSeek('', 3);
      createResponsePage(resultText);
    }

    const footer = document.createElement('div');
    footer.textContent = 'Powered by ChatGPT 4o';
    footer.style = 'text-align: center; font-size: 11px; color: #888;';

    selectionPopup.append(header, explainBtn, showCodeBtn, refactorBtn, statsBtn, footer);
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
      if (!chrome.runtime.lastError) {
        try {
          repo_obj['file tree'] = response.result;
          console.log(repo_obj['file tree']);
        }
        catch {
          repo_obj['file tree'] = null;
        }
      }
      resolve(repo_obj);
    });
  });
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
      if (!chrome.runtime.lastError) {
        try {
          repo_obj['file tree'] = response.result;
          console.log(repo_obj['file tree']);
        }
        catch {
          repo_obj['file tree'] = null;
        }
      }
      resolve(repo_obj);
    });
  });
}

function refactorPrompt(codeText) {
  return `Refactor the following code file and provide the complete, cleaned, and refactored version as output. Include brief comments (12–15 words) next to each section where refactoring was performed, explaining the changes made. Do not include any additional explanations or descriptions, just give the refactored code as output.\n${codeText}`
}

function statsPrompt(codeText) {
  return `Calculate the cyclomatic complexity, CVSS score, maintainability index and identify the vulnerability categories by impact according to CVE of the following code. Just check out the codes and from the code try to answer if there is any specific security vulnerability (CVE code). just write the calculated values in output. Don't give anything else.:\n${codeText}\n\nIn your response only give the detected values of these attributes. Don't give any explanation.`;
}

function promptBuilder(repo_info, results, context = 1) {
  const textareas = Array.from(document.querySelectorAll('#read-only-cursor-text-area'));
  const codeText = textareas.map(t => t.value || t.textContent || '').join('\n\n---\n\n').trim();
  if(context === 2) {
    return refactorPrompt(codeText);
  }
  if(context === 3) {
    return statsPrompt(codeText);
  }
  let prompt = `In a GitHub repo titled ${repo_info['repo name']}`;
  if (repo_info['file tree'] && repo_info['file tree'].length < 2000) {
    prompt += ` the following code files exist:\n\n${repo_info['file tree']}\n\n`;
  }

  if (context !== 1) {
    prompt += `Explain the file called: \"${repo_info['file name']}\":\n${codeText}\n\nin context of the project repository. First in 40-50 words explain what this code file does in the context of the project repository. Then, explain what this code file does(write it in 100-120 words and write 1 small line describing each method in the code.)`;
  } else {
    prompt += `,Given below is the file named \"${repo_info['file name']}\":\n${codeText}\n\nWith the given information, explain the following code portion which was selected from the given file in 50-60 words:\n${results}\n\n`;
  }
  return prompt;
}

async function sendToDeepSeek(results, context = 1) {
  try {
    let prompt = '';
    let repo_info = null;

    if(context!==2 && context!==3) {
      repo_info = await getRepoInfo();
    }
    prompt = promptBuilder(repo_info, results, context);

    chatHistory.push({ role: 'user', content: prompt});

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        if (chrome.runtime.lastError) {
          chatHistory.pop();
          resolve('❌ Error: ' + chrome.runtime.lastError.message);
        } else {
          const result = response?.result || 'an unexpected error occurred';
          if (result !== 'an unexpected error occurred') {
            chatHistory.push({ role: 'assistant', content: result });
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
  header.textContent = 'CLARA';
  header.style = `
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 8px;
    text-align: center;
  `;

  // Taller Initial Response Section
  const initialResponseContainer = document.createElement('div');
  initialResponseContainer.style = `
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #fafafa;
    margin-bottom: 10px;
    white-space: pre-wrap;
    max-height: 700px;
    min-height: 250px;
    overflow-y: auto;
    font-size: 13px;
  `;
  initialResponseContainer.textContent = initialResponseText;

  // Shorter Chat Area
  const chatContainer = document.createElement('div');
  chatContainer.style = `
    flex: 1;
    overflow-y: auto;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: #fff;
    margin-bottom: 8px;
    max-height: 400px;
    font-size: 13px;
  `;

  // Compact Input Area
  const inputArea = document.createElement('textarea');
  inputArea.placeholder = 'Ask CLARA chatbot your questions...';
  inputArea.style = `
    width: 100%;
    padding: 6px;
    border-radius: 4px;
    border: 1px solid #ccc;
    resize: vertical;
    min-height: 60px;
    font-size: 12px;
  `;

  const buttonRow = document.createElement('div');
  buttonRow.style = 'display: flex; justify-content: space-between; margin-top: 6px;';

  // Styled Buttons
  const backButton = createStyledButton('← Back', '#667446ff', '#000');
  const followUpBtn = createStyledButton('Ask Chatbot', '#007bff', '#fff');

  [backButton, followUpBtn].forEach(btn => {
    btn.style.padding = '6px 12px';
    btn.style.margin = '2px 2px'
    btn.style.fontSize = '12px';
    btn.style.border = 'none';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
  });

  backButton.onclick = () => {
    chatHistory = [];
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

      chatHistory.push({ role: 'user', content: followUpText });

      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        const text = response?.result || `An unexpected error occurred`;

        const loadingMessages = chatContainer.querySelectorAll('.assistant-message');
        if (loadingMessages.length > 0) {
          loadingMessages[loadingMessages.length - 1].remove();
        }

        appendChatMessage(chatContainer, 'Assistant', text);

        if (text !== 'An unexpected error occurred') {
          chatHistory.push({ role: 'assistant', content: text });
        } else {
          chatHistory.pop();
        }
      });
    }
  };

  buttonRow.append(backButton, followUpBtn);

  selectionPopup.style.height = '500px';
  selectionPopup.style.display = 'flex';
  selectionPopup.style.flexDirection = 'column';
  selectionPopup.style.padding = '8px';

  selectionPopup.append(
    header,
    initialResponseContainer,
    chatContainer,
    inputArea,
    buttonRow
  );
}

// Helper to create styled buttons
function createStyledButton(text, bgColor, textColor = '#5353d6ff') {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.style.backgroundColor = bgColor;
  btn.style.color = textColor;
  return btn;
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
    createPopupUI(null);
    popupVisible = true;
  } else {
    removePopup();
    popupVisible = false;
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
  createPopupUI(null);
  popupVisible = true;
  observePageChanges();
}


document.addEventListener('mouseup', (event) => {
  if (popupVisible) {
    // console.log('fail');
    return;
  }  // Don’t trigger if popup is showing
  chatHistory = [];
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
