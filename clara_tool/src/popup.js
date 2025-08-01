chatHistory = []

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
          repo_obj['file tree'] = response.result;
        }
        catch {
          repo_obj['file tree'] = null;
        }
      }
      resolve(repo_obj);
    });
  });
}

async function promptBuilder(repo_info, results, context=1) {
  const codeText = await extractCode()

  const base = `In a GitHub repo titled ${repo_info['repo name']}`;
  var ft = '';
  if(repo_info['file tree']!=null) {
    ft = `the code files' structure and their paths are as follow-\n\n${repo_info['file tree']}\n\n`
  }
  var qs = '';
  if(context!==1) {
    qs = `Explain the code file titled: "${repo_info['file name']}":\n${codeText}\n\nin context of the project repository. First in 40-50 words explain what this code file does in the context of the project repository. Then, explain what this code file does(write it in 100-120 words and write 1 small line describing each method in the code.)\n$`
  }
  else {
    qs = `,Given below is the file named "${repo_info['file name']}":\n${codeText}\n\nWith the given information, explain the following code portion which was selected from the given file in 50-60 words:\n${results[0]['result']}\n\n `
  }

  var prompt = base;
  if(ft.length<2000) {
    prompt += ft;
  }
  prompt += qs
  //  ;
  return prompt;
}


async function sendToDeepSeek(results, context = 1) {
  updateOutput('🔎 Loading...');
  try {
    const repo_info = await getRepoInfo();
    let prompt = await promptBuilder(repo_info, results, context);
     
    chatHistory.push({ role: 'user', content: prompt });
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        if (chrome.runtime.lastError) {
          updateOutput(`Error: ${chrome.runtime.lastError.message}`);
          chatHistory.pop();
        } else {
          let res = response?.result || 'an unexpected error occurred'
          updateOutput(res);
          if(res==='an unexpected error occurred') {
            chatHistory.pop();
          }
          else {
            chatHistory.push({ role: 'assistant', content: res });
          }
        }
      });
    });

  } catch (err) {
     
    updateOutput('an unexpected error occurred');
    return `Failed to extract repo info: ${err.message}`;
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
      func: () => window.getSelection().toString().trim() || 'No text selected.'
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
    console.error('Error: #output-content not found.');
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
  chatHistory = []
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
  revealOutputCard('📂 Refactor the Code');
  extractTextareas((results) => {
    let code = results?.[0] ?? '';
    if(code==='') {
      updateOutput('No response');
    }
    else {
      code = code.result[0];
      const prompt = `Refactor the following code file and provide the complete, cleaned, and refactored version as output. Include brief comments (12–15 words) next to each section where refactoring was performed, explaining the changes made. Do not include any additional explanations or descriptions, just give the refactored code as output.\n${code}`;
      const promptBody = { role: 'user', content: prompt };
      chatHistory.push(promptBody);
      updateOutput('Refactoring...');
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        let res = response?.result || 'No response';
        if(res==='No response') {
          chatHistory.pop();
        }
        else {
          chatHistory.push({ role: 'assistant', content: res });
        }
        updateOutput(res);
      });
    }
  });
});

document.getElementById('identifyVulns')?.addEventListener('click', () => {
  revealOutputCard('Identify Code Vulnerabilities');
  extractTextareas((results) => {
    const code = results?.[0] ?? '';
    if(code==='') {
      updateOutput('No response');
    }
    else {
      code = code.result[0];
      const prompt = `Identify and explain any potential security vulnerabilities in the following code. Just check out the codes and from the code try to answer if there is any specific security vulnerability (CVE code). just write the numbers:\n${code}`;
      const promptBody = { role: 'user', content: prompt };
      chatHistory.push(promptBody)
      updateOutput('🔐 Scanning for vulnerabilities...');
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
        let res = response?.result || 'No response';
        if(res==='No response') {
          chatHistory.pop();
        }
        else {
          chatHistory.push({ role: 'assistant', content: res });
        }
        updateOutput(res);
      });
    }
  });
});

document.getElementById('seeStats')?.addEventListener('click', async () => {
  revealOutputCard('See Code Statistics');
  const codeText = await extractCode();
  // extractTextareas((results) => {
  // const code = results?.[0] ?? '';
  if (codeText === '') {
    updateOutput('No response');
  } else {
    const prompt = `Calculate the cyclomatic complexity, CVSS score, maintainability index and identify the vulnerability categories by impact according to CVE of the following code. Just check out the codes and from the code try to answer if there is any specific security vulnerability (CVE code). just write the calculated values in output. Don't give anything else.:\n${codeText}\n\nIn your response only give the detected values of these attributes. Don't give any explanation.`;
    updateOutput('💻 Analyzing code...');
    const promptBody = { role: 'user', content: prompt };
    chatHistory.push(promptBody);
    chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
      let res = response?.result || 'No response';
      if(res === 'No response') {
        chatHistory.pop();
      } else {
        chatHistory.push({ role: 'assistant', content: res });
      }
      updateOutput(res);
    });
  }
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
  chatHistory.push({ role: 'user', content: question })
  chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: chatHistory }, (response) => {
    let res = response?.result || 'No response';
    aiMessage.textContent = res;
    if(res==='No response') {
      chatHistory.pop();
    }
    else {
      chatHistory.push({ role: 'assistant', content: res })
    }
    history.scrollTop = history.scrollHeight;
  });
});
