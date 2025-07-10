let selectionPopup = null;
let lastSelectedText = '';
let autoCloseTimer = null;
let chatHistory = [];

function extractGitHubInfo(url) {
  const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/);
  if (match) {
    const owner = match[1];
    const repo = match[2];
    const branch = match[3];
    const filePath = match[4];
    return { owner, repo, branch, filePath };
  } else {
    return null;
  }
}


function promptBuilder(repo_info, results, context=1) {
  const textareas = Array.from(document.querySelectorAll('#read-only-cursor-text-area'));
  const codeText = textareas.map(t => t.value || t.textContent || '').join('\n\n---\n\n').trim();

  const base = `In a GitHub repo titled ${repo_info['repo name']}`;
  var ft = '';
  if(repo_info['file tree']!=null) {
    ft = `the following code files exist-\n\n${repo_info['file tree']}\n\n`
  }
  var qs = '';
  if(context!==1) {
    qs = `Explain the file called: "${repo_info['file name']}":\n${codeText}\n\nin context of the project.\n$`
  }
  else {
    qs = `,Given below is the file named "${repo_info['file name']}":\n${codeText}\n\nWith the given information, explain the following code portion which was selected from the given file:\n${results}\n\n `
  }

  var prompt = base;
  if(ft.length<2000) {
    prompt += ft;
  }
  prompt += qs
  // console.log(prompt);
  return prompt;
}

function getRepoInfo() {
  return new Promise((resolve, reject) => {
    const repo_obj = {
      'file tree': null,
      'file name': 'not available',
      'repo name': 'not available',
      'branch': 'not available',
      'owner': 'not available'
    };

    const currentUrl = window.location.href;
    const dfu = extractGitHubInfo(currentUrl);
    repo_obj['file name'] = dfu['filePath'];
    repo_obj['repo name'] = dfu['repo'];
    repo_obj['branch'] = dfu['branch'];
    repo_obj['owner'] = dfu['owner'];

    const repo_req = {
      'owner': repo_obj['owner'],
      'repo': repo_obj['repo name'],
      'branch': repo_obj['branch']
    };

    chrome.runtime.sendMessage({ action: 'repoTree', payload: repo_req }, (response) => {
      if (chrome.runtime.lastError) {
        repo_obj['file tree'] = null;
      } else {
        try {
          repo_obj['file tree'] = response.result.tree.map(item => item.path).sort().join('\n');
        }
        catch {
          console.log('failed to retrieve file tree');
          repo_obj['file tree'] = null;
        }
      }
      resolve(repo_obj);
    });
  });
}

async function sendToDeepSeek(results, context = 1) {
  try {
    const repo_info = await getRepoInfo();
    let prompt = promptBuilder(repo_info, results, context);

    chatHistory.push({ role: 'user', parts: [{ text: prompt }] });
    console.log(chatHistory);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        if (chrome.runtime.lastError) {
          resolve(`❌ Error: ${chrome.runtime.lastError.message}`);
          chatHistory.pop();
        } else {
          resolve(response?.result || 'an unexpected error occurred');
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

  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    flexDirection: 'column',
    height: '400px',
    width: '100%',
    position: 'relative'
  });

  const backButton = document.createElement('button');
  backButton.textContent = '← Back';
  Object.assign(backButton.style, {
    position: 'absolute',
    top: '10px',
    left: '10px',
    background: '#eee',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  });

  backButton.addEventListener('click', () => {
    createPopupUI(lastSelectedText);
  });

  const responseDiv = document.createElement('div');
  Object.assign(responseDiv.style, {
    flex: '1',
    overflowY: 'auto',
    marginTop: '40px',
    marginBottom: '80px',
    whiteSpace: 'pre-wrap',
    padding: '5px'
  });
  responseDiv.textContent = responseText;
  if(responseText === 'an unexpected error occurred') {
    chatHistory.pop();
  }
  else {
    chatHistory.push({ role: 'model', parts: [{ text: responseText }] });
  }

  const inputBox = document.createElement('textarea');
  Object.assign(inputBox.style, {
    width: 'calc(100% - 20px)',
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    resize: 'vertical',
    minHeight: '50px',
    position: 'absolute',
    bottom: '40px',
    left: '10px',
  });
  inputBox.placeholder = 'Ask a follow-up...';

  const followUpBtn = document.createElement('button');
  followUpBtn.textContent = 'Submit Follow-up';
  Object.assign(followUpBtn.style, {
    width: 'calc(100% - 20px)',
    padding: '8px',
    background: '#444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    cursor: 'pointer',
    fontSize: '13px'
  });

  followUpBtn.addEventListener('click', () => {
    const followUpText = inputBox.value.trim();
    if (followUpText) {
      responseDiv.textContent = '⏳ Loading...';
      chatHistory.push({ role: 'user', parts: [{ text: followUpText }] });
      console.log(chatHistory);
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        let text = response?.result || 'an unexpected error occurred';
        responseDiv.textContent = text;
        if(text === 'an unexpected error occurred') {
          chatHistory.pop();
          console.log(chatHistory);
        }
        else {
          chatHistory.push({ role: 'model', parts: [{ text: response?.result || 'sorry cannot answer right now' }] });
        }
      });
    }
  });

  container.appendChild(backButton);
  container.appendChild(responseDiv);
  container.appendChild(inputBox);
  container.appendChild(followUpBtn);
  selectionPopup.appendChild(container);
}

function createPopupUI(text) {
  removePopup();
  lastSelectedText = text;

  selectionPopup = document.createElement('div');
  selectionPopup.classList.add('custom-selection-popup');
  Object.assign(selectionPopup.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: '#f9f9f9',
    color: '#000',
    border: '1px solid #ccc',
    borderRadius: '10px',
    padding: '10px',
    fontSize: '13px',
    width: '320px',
    height: '400px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 9999,
    overflow: 'hidden'
  });

  const explainBtn = document.createElement('button');
  explainBtn.textContent = 'Explain Selected Code';
  Object.assign(explainBtn.style, {
    width: '100%',
    padding: '8px',
    background: '#0969da',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    marginBottom: '10px'
  });

  const showCodeBtn = document.createElement('button');
  showCodeBtn.textContent = 'Explain Full Code';
  Object.assign(showCodeBtn.style, {
    width: '100%',
    padding: '8px',
    background: '#22a65b',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    marginBottom: '10px'
  });

  explainBtn.addEventListener('click', async (e) => {
    explainBtn.textContent = 'Loading...';
    explainBtn.disabled = true;
    showCodeBtn.disabled = true;
    e.stopPropagation();
    const resultText = await sendToDeepSeek(lastSelectedText, 1);
    createResponsePage(resultText);
  });

  showCodeBtn.addEventListener('click', async (e) => {
    showCodeBtn.textContent = 'Loading...';
    explainBtn.disabled = true;
    showCodeBtn.disabled = true;
    e.stopPropagation();
    const resultText = await sendToDeepSeek('', 0);
    createResponsePage(resultText);
  });

  selectionPopup.appendChild(explainBtn);
  selectionPopup.appendChild(showCodeBtn);
  document.body.appendChild(selectionPopup);
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