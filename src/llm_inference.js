async function sendToDeepSeek(results, context = 1) {
  try {
    let prompt = '';
    let repo_info = null;

    if(context!==2 && context!==3) {
      repo_info = await getRepoInfo();
    }
    prompt = promptBuilder(repo_info, results, context);

    pushHistory('user', prompt);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'askDeepSeek', payload: getChatHistory() }, (response) => {
        if (chrome.runtime.lastError) {
          popHistory();
          resolve('❌ Error: ' + chrome.runtime.lastError.message);
        } else {
          const result = response?.result || 'an unexpected error occurred';
          if (result !== 'an unexpected error occurred') {
            pushHistory('assistant', result);
          } else {
            popHistory();
          }
          resolve(result);
        }
      });
    });
  } catch (err) {
    return `❌ Failed to extract repo info: ${err.message}`;
  }
}