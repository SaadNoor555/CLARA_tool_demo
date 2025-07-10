chatHistory = []

function extractGitHubInfo(url) {
  console.log(url);
  const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/);
  console.log(match);
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

async function getCurrentTabUrl() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.url;
}


async function extractCode() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const textareas = document.querySelectorAll("#read-only-cursor-text-area");
      return Array.from(textareas).map(el => el.value.trim());
    }
  });
  console.log(injectionResult.result[0]);
  return injectionResult.result[0];
}


async function getRepoInfo() {
  const currentUrl = await getCurrentTabUrl();
  return new Promise((resolve, reject) => {
    const repo_obj = {
      'file tree': null,
      'file name': 'not available',
      'repo name': 'not available',
      'branch': 'not available',
      'owner': 'not available'
    };

    const dfu = extractGitHubInfo(currentUrl);
    console.log(dfu);
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

async function promptBuilder(repo_info, results, context=1) {
  const codeText = await extractCode()
  // const codeText = textareas.map(t => t.value || t.textContent || '').join('\n\n---\n\n').trim();
  // console.log(codeText);
  // console.log(results);
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
    qs = `,Given below is the file named "${repo_info['file name']}":\n${codeText}\n\nWith the given information, explain the following code portion which was selected from the given file:\n${results[0]['result']}\n\n `
  }

  var prompt = base;
  if(ft.length<2000) {
    prompt += ft;
  }
  prompt += qs
  // console.log(prompt);
  return prompt;
}


// function sendToDeepSeek(results, context = "code portion") {
//   const extracted = results?.[0]?.result ?? '';
//   const prompt = `Explain this ${context} briefly (within 100 words):\n` + extracted;

//   updateOutput('⏳ Loading...');

//   chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: prompt }, (response) => {
//     if (chrome.runtime.lastError) {
//       updateOutput(`❌ Error: ${chrome.runtime.lastError.message}`);
//     } else {
//       updateOutput(response?.result || '❌ No response');
//     }
//   });
// }

async function sendToDeepSeek(results, context = 1) {
  updateOutput('⏳ Loading...');
  try {
    const repo_info = await getRepoInfo();
    let prompt = await promptBuilder(repo_info, results, context);
    console.log(prompt)
    chatHistory.push({ role: 'user', parts: [{ text: prompt }] });
    console.log(chatHistory);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        if (chrome.runtime.lastError) {
          updateOutput(`❌ Error: ${chrome.runtime.lastError.message}`);
          // resolve(`❌ Error: ${chrome.runtime.lastError.message}`);
          chatHistory.pop();
        } else {
          let res = response?.result || 'an unexpected error occurred'
          updateOutput(res);
          if(res==='an unexpected error occurred') {
            chatHistory.pop();
          }
          else {
            chatHistory.push({ role: 'model', parts: [{ text: res }] });
          }
        }
      });
    });

  } catch (err) {
    console.log(err.message)
    updateOutput('an unexpected error occurred');
    return `❌ Failed to extract repo info: ${err.message}`;
  }
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
  extractTextareas((results) => sendToDeepSeek(results, 0));
});

document.getElementById('showSelection')?.addEventListener('click', () => {
  revealOutputCard('Show Selected Text');
  extractSelectedText((results) => sendToDeepSeek(results, 1));
});

document.getElementById('refactorCode')?.addEventListener('click', () => {
  revealOutputCard('Refactor the Code');
  extractTextareas((results) => {
    let code = results?.[0] ?? '';
    console.log(code);
    if(code==='') {
      updateOutput('❌ No response');
    }
    else {
      code = code.result[0];
      console.log(code);
      const prompt = `Refactor the following code to improve readability and maintainability:\n${code}`;
      const promptBody = [{ role: 'user', parts: [{ text: prompt }] }];
      updateOutput('⏳ Refactoring...');
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: promptBody }, (response) => {
        updateOutput(response?.result || '❌ No response');
      });
    }
  });
});

document.getElementById('identifyVulns')?.addEventListener('click', () => {
  revealOutputCard('Identify Code Vulnerabilities');
  extractTextareas((results) => {
    const code = results?.[0] ?? '';
    if(code==='') {
      updateOutput('❌ No response');
    }
    else {
      code = code.result[0];
      console.log(code);
      const prompt = `Identify and explain any potential security vulnerabilities in the following code:\n${code}`;
      const promptBody = [{ role: 'user', parts: [{ text: prompt }] }];
      updateOutput('🔐 Scanning for vulnerabilities...');
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: promptBody }, (response) => {
        updateOutput(response?.result || '❌ No response');
      });
    }
  });
});

document.getElementById('seeStats')?.addEventListener('click', () => {
  revealOutputCard('See Code Statistics');
  extractTextareas((results) => {
    if(code==='') {
      updateOutput('❌ No response');
    }
    else {
      code = code.result[0];
      console.log(code);
      const code = results?.[0] ?? '';
      const prompt = `Provide useful code statistics (like lines of code, number of functions, average function length, etc.) for the following:\n${code}`;
      updateOutput('📊 Analyzing code...');
      const promptBody = [{ role: 'user', parts: [{ text: prompt }] }];
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: promptBody }, (response) => {
        updateOutput(response?.result || '❌ No response');
      });
    }
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
  chatHistory.push({ role: 'user', parts: [{ text: question }] })
  chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
    let res = response?.result || '❌ No response';
    aiMessage.textContent = res;
    if(res==='❌ No response') {
      chatHistory.pop();
    }
    else {
      chatHistory.push({ role: 'model', parts: [{ text: res }] })
    }
    history.scrollTop = history.scrollHeight;
  });
});
