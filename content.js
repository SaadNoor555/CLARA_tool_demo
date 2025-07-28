let selectionPopup = null;
let lastSelectedText = '';
let autoCloseTimer = null;
let chatHistory = [];
let popupVisible = false;

function createPopupUI() {
  try {
    removePopup();

    selectionPopup = document.createElement('div');
    selectionPopup.className = 'custom-selection-popup';

    const header = document.createElement('div');
    header.className = 'popup-header';

    const logo = document.createElement('img');
    logo.src = chrome.runtime.getURL('clara.jpg');
    logo.alt = 'CLARA';
    logo.className = 'popup-logo';

    const logoContainer = document.createElement('div');
    logoContainer.className = 'logo-container';
    logoContainer.appendChild(logo);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.className = 'popup-close';
    closeBtn.onclick = removePopup;

    header.appendChild(closeBtn);
    header.appendChild(logoContainer);

    const showCodeBtn = createStyledButton('Explain Full Code File', '#74A9F8');
    const explainBtn = createStyledButton('Explain Marked/Selected Code', '#3A78C2');
    const refactorBtn = createStyledButton('Refactor the Code', '#255BB5');
    const statsBtn = createStyledButton('See Code Quality Attributes', '#1A4494');

    explainBtn.onclick = async () => {
      handleButtonClick(explainBtn, [showCodeBtn, refactorBtn, statsBtn], async () => {
        const selection = window.getSelection();
        lastSelectedText = selection.toString().trim();
        if (lastSelectedText) {
          const resultText = await sendToDeepSeek(lastSelectedText, 1);
          createResponsePage(resultText);
        } else {
          explainBtn.textContent = 'Please Select Something First!';
          enableButtons([explainBtn, showCodeBtn, refactorBtn, statsBtn]);
        }
      });
    };

    showCodeBtn.onclick = () =>
      handleButtonClick(showCodeBtn, [explainBtn, refactorBtn, statsBtn], async () => {
        const resultText = await sendToDeepSeek('', 0);
        createResponsePage(resultText);
      });

    refactorBtn.onclick = () =>
      handleButtonClick(refactorBtn, [explainBtn, showCodeBtn, statsBtn], async () => {
        const resultText = await sendToDeepSeek('', 2);
        createResponsePage(resultText);
      });

    statsBtn.onclick = () =>
      handleButtonClick(statsBtn, [explainBtn, showCodeBtn, refactorBtn], async () => {
        const resultText = await sendToDeepSeek('', 3);
        createResponsePage(resultText);
      });

    const footer = document.createElement('div');
    footer.textContent = 'Powered by ChatGPT 4o';
    footer.className = 'popup-footer';

    selectionPopup.append(header, explainBtn, showCodeBtn, refactorBtn, statsBtn, footer);
    document.body.appendChild(selectionPopup);
  } catch (err) {
    console.error(err);
  }
}

function handleButtonClick(activeBtn, otherBtns, action) {
  activeBtn.textContent = '🔎 Loading...';
  activeBtn.disabled = true;
  otherBtns.forEach(btn => (btn.disabled = true));
  action();
}

function enableButtons(buttons) {
  buttons.forEach(btn => {
    btn.disabled = false;
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
  return `CVE categories :Code Execution,Denial of Service,Information Leak,Privilege Escalation,Overflow,ByPass, Memory Corruption. Calculate the cyclomatic complexity, maintainability index and vulnerability category that suit most from CVE categories for the following code. Just check out the codes and from the code try to answer . just write the numbers:\n${codeText}"\n\nIn your response only give the detected values of these attributes. Don't give any explanation`;
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

    console.log(prompt);

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
  header.className = 'response-header';

  // Taller Initial Response Section
  const initialResponseContainer = document.createElement('div');
  initialResponseContainer.className = 'response-container';
  initialResponseContainer.textContent = initialResponseText;

  // Shorter Chat Area
  const chatContainer = document.createElement('div');
  chatContainer.className = 'chat-container';

  // Compact Input Area
  const inputArea = document.createElement('textarea');
  inputArea.placeholder = 'Ask CLARA chatbot your questions...';
  inputArea.className = 'input-area';

  const buttonRow = document.createElement('div');
  buttonRow.style = 'display: flex; justify-content: space-between; margin-top: 0px;';

  // Styled Buttons
  const backButton = createStyledButton('← Back', '#667446ff', '#000');
  const followUpBtn = createStyledButton('Ask Chatbot', '#007bff', '#fff');

  backButton.className = 'back-followup-button';
  followUpBtn.className = 'back-followup-button';

  backButton.onclick = () => {
    chatHistory = [];
    selectionPopup.innerHTML = '';
    popupVisible = false;
    createPopupUI();
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

  selectionPopup.style.height = '670px';
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
  messageDiv.className = 'assistant-message'
  messageDiv.textContent = `${sender}: ${message}`;
  messageDiv.className = sender === 'Assistant' ? 'assistant-message' : '';
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}


function createStyledButton(text, bgColor) {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = 'styledButton'
  button.style = `background: ${bgColor};`;
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
    createPopupUI();
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
  createPopupUI();
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

    createPopupUI();
    popupVisible = true;  // Mark popup as visible
  }, 50);
});
