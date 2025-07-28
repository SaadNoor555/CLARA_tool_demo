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