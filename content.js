let selectionPopup = null;
let lastSelectedText = '';
let autoCloseTimer = null;


function getRepoInfo() {
  console.log('in getRepoInfo');

  return new Promise((resolve, reject) => {
    const scriptTag = document.querySelector('script[type="application/json"][data-target="react-app.embeddedData"]');

    var repo_obj = {
      'file tree': 'XXX',
      'file name': 'not available',
      'repo name': 'not available',
      'branch': 'not available',
      'owner': 'not available'
    };

    if (scriptTag) {
      try {
        const jsonText = scriptTag.textContent.trim();
        const data = JSON.parse(jsonText);
        console.log(data['payload']);

        repo_obj['file name'] = data['payload']['path'];
        repo_obj['repo name'] = data['payload']['repo']['name'];
        repo_obj['branch'] = data['payload']['refInfo']['name'];
        repo_obj['owner'] = data['payload']['repo']['ownerLogin'];

        const repo_req = {
          'owner': repo_obj['owner'],
          'repo': repo_obj['repo name'],
          'branch': repo_obj['branch']
        };

        chrome.runtime.sendMessage({ action: 'repoTree', payload: repo_req }, (response) => {
          if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
            repo_obj['file tree'] = 'not available because of error';
          } else {
            repo_obj['file tree'] = response.result.tree.map(item => item.path).sort().join('\n');
          }
          console.log(repo_obj);
          resolve(repo_obj);
        });

      } catch (e) {
        console.error('❌ Failed to parse JSON:', e);
        reject(e);
      }
    } else {
      console.log('❌ No matching script tag found.');
      reject(new Error('No matching script tag found.'));
    }
  });
}



// function buildPrompt(repo_info, context) {

// }

async function sendToDeepSeek(results, resultDiv, context = "code portion") {
  const extracted = results;
  if (resultDiv) resultDiv.textContent = '⏳ Loading...';

  try {
    const repo_info = await getRepoInfo();  // Waits for the file tree to be fetched

    const prompt = `In a GitHub repo titled ${repo_info['repo name']} the following code files exist-\n${repo_info['file tree']}\n\nNow explain the following code file: ${repo_info['file name']} in context of the project in 100-120 words-\n` + extracted;

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
  }, 5000000); // 10 seconds
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

  // Explain Selection button
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

  // Show Full Code button
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
    // textDiv.textContent = `You have selected this:\n${lastSelectedText}`;
    sendToDeepSeek(lastSelectedText, textDiv, "code portion");
    textDiv.style.display = 'block';
    startAutoCloseTimer();
  });

  showCodeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    textDiv.style.display = 'block';
    textDiv.textContent = 'Loading...';

    try {
      const textareas = Array.from(document.querySelectorAll('#read-only-cursor-text-area'));
      if (textareas.length === 0) {
        textDiv.textContent = '❌ No elements with id "read-only-cursor-text-area" found.';
      } else {
        const codeText = textareas.map(t => t.value || t.textContent || '').join('\n\n---\n\n').trim();
        sendToDeepSeek(codeText, textDiv, "code");
      }
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


function onReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

onReady(() => {
	const selection = window.getSelection();
	const selectedText = selection.toString().trim();
	createPopupUI(selectedText || '(No text selected yet)');
});


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
