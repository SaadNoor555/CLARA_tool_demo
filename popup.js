function sendToDeepSeek(results, context = "code portion") {
  const extracted = results?.[0]?.result ?? '';
  const prompt = `Explain this ${context} briefly (within 100 words):\n` + extracted;

  updateOutput('⏳ Loading...');

  chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: prompt }, (response) => {
    if (chrome.runtime.lastError) {
      updateOutput(`❌ Error: ${chrome.runtime.lastError.message}`);
    } else {
      updateOutput(response?.result || '❌ No response');
    }
  });
}

function extractTextareas(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const textareas = document.querySelectorAll("#read-only-cursor-text-area");
        return Array.from(textareas).map(el => el.value.trim());
      }
    }, callback);
  });
}

function extractSelectedText(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString().trim() || '❌ No text selected.'
    }, callback);
  });
}

function updateOutput(content) {
  const resultDiv = document.getElementById('output-content');
  if (resultDiv) {
    const placeholder = resultDiv.querySelector('.placeholder');
    if (placeholder) placeholder.remove();
    resultDiv.textContent = content;
  } else {
    console.error('❌ Error: #output-content not found.');
  }
}

function revealOutputCard(featureTitle) {
  document.getElementById('button-group')?.classList.add('hidden');
  document.getElementById('output-container')?.classList.remove('hidden');
  document.getElementById('output-feature-title').textContent = featureTitle;
}

function returnToHome() {
  document.getElementById('output-container')?.classList.add('hidden');
  document.getElementById('button-group')?.classList.remove('hidden');
  document.getElementById('output-content').textContent = '';
  document.getElementById('output-feature-title').textContent = '';
  document.getElementById('chat-history').innerHTML = '';
  document.getElementById('chat-input').value = '';
}

// Event bindings
document.getElementById('backButton')?.addEventListener('click', returnToHome);

document.getElementById('explainCode')?.addEventListener('click', () => {
  revealOutputCard('Explain Code');
  extractTextareas((results) => sendToDeepSeek(results, "code"));
});

document.getElementById('showSelection')?.addEventListener('click', () => {
  revealOutputCard('Show Selected Text');
  extractSelectedText((results) => sendToDeepSeek(results, "code portion"));
});

document.getElementById('refactorCode')?.addEventListener('click', () => {
  revealOutputCard('Refactor the Code');
  extractTextareas((results) => {
    const code = results?.[0] ?? '';
    const prompt = `Refactor the following code to improve readability and maintainability:\n${code}`;
    updateOutput('⏳ Refactoring...');
    chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: prompt }, (response) => {
      updateOutput(response?.result || '❌ No response');
    });
  });
});

document.getElementById('identifyVulns')?.addEventListener('click', () => {
  revealOutputCard('Identify Code Vulnerabilities');
  extractTextareas((results) => {
    const code = results?.[0] ?? '';
    const prompt = `Identify and explain any potential security vulnerabilities in the following code:\n${code}`;
    updateOutput('🔐 Scanning for vulnerabilities...');
    chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: prompt }, (response) => {
      updateOutput(response?.result || '❌ No response');
    });
  });
});

document.getElementById('seeStats')?.addEventListener('click', () => {
  revealOutputCard('See Code Statistics');
  extractTextareas((results) => {
    const code = results?.[0] ?? '';
    const prompt = `Provide useful code statistics (like lines of code, number of functions, average function length, etc.) for the following:\n${code}`;
    updateOutput('📊 Analyzing code...');
    chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: prompt }, (response) => {
      updateOutput(response?.result || '❌ No response');
    });
  });
});

document.getElementById('chat-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const question = input.value.trim();
  if (!question) return;

  const history = document.getElementById('chat-history');
  const userMessage = document.createElement('div');
  userMessage.className = 'chat-message user';
  userMessage.textContent = question;
  history.appendChild(userMessage);

  const aiMessage = document.createElement('div');
  aiMessage.className = 'chat-message ai';
  aiMessage.textContent = '⏳ Thinking...';
  history.appendChild(aiMessage);

  input.value = '';
  history.scrollTop = history.scrollHeight;

  chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: question }, (response) => {
    aiMessage.textContent = response?.result || '❌ No response';
    history.scrollTop = history.scrollHeight;
  });
});
