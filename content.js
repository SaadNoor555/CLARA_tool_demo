let selectionPopup = null;
let lastSelectedText = '';
let autoCloseTimer = null;

function extractGitHubInfo(url) {
  const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/);
  if (match) {
    const owner = match[1];      // e.g., SaadNoor555
    const repo = match[2];       // e.g., ASE-Demo-Extension
    const branch = match[3];     // e.g., gemini
    const filePath = match[4];   // e.g., content.js or src/utils/file.js
    return { owner, repo, branch, filePath };
  } else {
    return null;
  }
}

function getRepoInfo() {
  return new Promise((resolve, reject) => {
    const scriptTag = document.querySelector('script[type="application/json"][data-target="react-app.embeddedData"]');

    const repo_obj = {
      'file tree': 'XXX',
      'file name': 'not available',
      'repo name': 'not available',
      'branch': 'not available',
      'owner': 'not available'
    };

    if (scriptTag) {
      try {
        const currentUrl = window.location.href;
        var dfu = extractGitHubInfo(currentUrl);
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
            repo_obj['file tree'] = 'not available because of error';
          } else {
            repo_obj['file tree'] = response.result.tree.map(item => item.path).sort().join('\n');
          }
          resolve(repo_obj);
        });
      } catch (e) {
        reject(e);
      }
    } else {
      reject(new Error('No matching script tag found.'));
    }
  });
}

async function sendToDeepSeek(results, resultDiv, context = 1) {
  const textareas = Array.from(document.querySelectorAll('#read-only-cursor-text-area'));
  const codeText = textareas.map(t => t.value || t.textContent || '').join('\n\n---\n\n').trim();

  if (resultDiv) resultDiv.textContent = '⏳ Loading...';

  try {
    const repo_info = await getRepoInfo();
    let prompt = '';

    if (context !== 1) {
      prompt = `In a GitHub repo titled ${repo_info['repo name']} the following code files exist-\n${repo_info['file tree']}\n\nNow explain the following code file called: ${repo_info['file name']} in context of the project in 100-120 words-\n` + codeText;
    } else {
      prompt = `In a GitHub repo titled ${repo_info['repo name']} the following code files exist-\n${repo_info['file tree']}\n\nHere is the file: ${repo_info['file name']}, and it's contents:\n${codeText}\nGiven all these, explain the following code portion which was selected from the given file: ${results} in 100-120 words-\n`;
    }
    console.log(prompt);
    chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: prompt }, (response) => {
      if (chrome.runtime.lastError) {
        resultDiv.textContent = `❌ Error: ${chrome.runtime.lastError.message}`;
      } else {
        resultDiv.textContent = response?.result || '❌ No response';
      }
    });

  } catch (err) {
    resultDiv.textContent = `❌ Failed to extract repo info: ${err.message}`;
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

function startAutoCloseTimer() {
  if (autoCloseTimer) clearTimeout(autoCloseTimer);
  autoCloseTimer = setTimeout(() => {
    removePopup();
  }, 5000000);
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
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 9999,
  });

  const explainBtn = document.createElement('button');
  explainBtn.textContent = 'Explain Selection';
  Object.assign(explainBtn.style, {
    width: '100%',
    padding: '8px',
    background: '#0969da',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    marginBottom: '10px',
  });

  const showCodeBtn = document.createElement('button');
  showCodeBtn.textContent = 'Show Full Code';
  Object.assign(showCodeBtn.style, {
    width: '100%',
    padding: '8px',
    background: '#22a65b',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    marginBottom: '10px',
  });

  const textDiv = document.createElement('div');
  Object.assign(textDiv.style, {
    whiteSpace: 'pre-wrap',
    display: 'none',
    background: '#fff',
    border: '1px solid #ddd',
    padding: '8px',
    borderRadius: '6px',
    maxHeight: '200px',
    overflowY: 'auto',
    fontFamily: 'monospace',
  });

  explainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sendToDeepSeek(lastSelectedText, textDiv, 1);
    textDiv.style.display = 'block';
    startAutoCloseTimer();
  });

  showCodeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    textDiv.style.display = 'block';
    textDiv.textContent = 'Loading...';

    try {
      sendToDeepSeek('', textDiv, 0);
      startAutoCloseTimer();
    } catch (err) {
      textDiv.textContent = '❌ Exception: ' + err.message;
    }
  });

  selectionPopup.addEventListener('mouseenter', () => {
    clearTimeout(autoCloseTimer);
  });

  selectionPopup.addEventListener('mouseleave', () => {
    startAutoCloseTimer();
  });

  selectionPopup.appendChild(explainBtn);
  selectionPopup.appendChild(showCodeBtn);
  selectionPopup.appendChild(textDiv);
  document.body.appendChild(selectionPopup);

  startAutoCloseTimer();
}

const blobRegex = /^https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+\/.+/;

function initPopupWithSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  if (selectedText) {
    createPopupUI(selectedText);
  } else {
    // Show popup even if no selection with default message
    createPopupUI('(No text selected yet)');
  }
}


// Track URL changes for PJAX navigation and call initPopupWithSelection
let lastUrl = location.href;
function onUrlChange() {
  if (blobRegex.test(location.href)) {
    initPopupWithSelection();
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
  // Observe for DOM changes that indicate PJAX navigation
  const targetNode = document.querySelector('#repo-content-pjax-container') || document.body;
  const observer = new MutationObserver(() => {
    // Check URL change on every DOM mutation
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onUrlChange();
    }
  });
  observer.observe(targetNode, { childList: true, subtree: true });
}

// Initial run if on a blob page
if (blobRegex.test(location.href)) {
  initPopupWithSelection();
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
