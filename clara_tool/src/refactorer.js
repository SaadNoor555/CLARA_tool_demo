function refactorPrompt(repo_info, codeText) {
  var prompt =  `Refactor the following code file`
  var lang = languageChecker(repo_info);
  if(lang!=='Unknown') {
    prompt += ` written in ${lang}`
  }
  prompt += ` and provide the complete, cleaned, and refactored version as output. Include brief comments (12–15 words) next to each section where refactoring was performed, explaining the changes made. Do not include any additional explanations or descriptions, just give the refactored code as output.\n${codeText}`
  return prompt;
}

function languageChecker(repo_info) {
  if(repo_info===null) {
    return 'Unknown';
  }
  var filename = repo_info['file name'];
  const extensionToLanguageMap = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'cc': 'C++',
    'cxx': 'C++',
    'c': 'C',
    'cs': 'C#',
    'rb': 'Ruby',
    'php': 'PHP',
    'go': 'Go',
    'rs': 'Rust',
    'kt': 'Kotlin',
    'swift': 'Swift',
    'html': 'HTML',
    'css': 'CSS',
    'json': 'JSON',
    'xml': 'XML',
    'sh': 'Shell',
    'sql': 'SQL',
    'md': 'Markdown',
    'yaml': 'YAML',
    'yml': 'YAML',
    'pl': 'Perl',
    'r': 'R',
    'scala': 'Scala',
    'lua': 'Lua',
    'dart': 'Dart'
  };

  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  if (!match) return 'Unknown';

  const ext = match[1].toLowerCase();
  return extensionToLanguageMap[ext] || 'Unknown';
}
