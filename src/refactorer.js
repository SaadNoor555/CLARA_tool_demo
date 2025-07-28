function refactorPrompt(codeText) {
  return `Refactor the following code file and provide the complete, cleaned, and refactored version as output. Include brief comments (12–15 words) next to each section where refactoring was performed, explaining the changes made. Do not include any additional explanations or descriptions, just give the refactored code as output.\n${codeText}`
}