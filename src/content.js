let selectionPopup = null;
let lastSelectedText = '';
let autoCloseTimer = null;
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


function promptBuilder(repo_info, results, context = 1) {
  const textareas = Array.from(document.querySelectorAll('#read-only-cursor-text-area'));
  const codeText = textareas.map(t => t.value || t.textContent || '').join('\n\n---\n\n').trim();
  if(context === 2) {
    return refactorPrompt(codeText);
  }
  if(context === 3) {
    return statsPrompt(codeText);
  }
  return explainPrompt(repo_info, results, codeText, context);
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
    clearHistory();
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
      pushHistory('user', followUpText);

      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: getChatHistory }, (response) => {
        const text = response?.result || `An unexpected error occurred`;

        const loadingMessages = chatContainer.querySelectorAll('.assistant-message');
        if (loadingMessages.length > 0) {
          loadingMessages[loadingMessages.length - 1].remove();
        }

        appendChatMessage(chatContainer, 'Assistant', text);

        if (text !== 'An unexpected error occurred') {
          pushHistory('assistant', text);
        } else {
          popHistory();
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
    clearHistory();
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
  clearHistory();
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
