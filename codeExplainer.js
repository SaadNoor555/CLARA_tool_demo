function explainPrompt(repo_info, results, codeText, context = 1) {
    let prompt = `In a GitHub repo titled ${repo_info['repo name']}`;
    if (repo_info['file tree'] && repo_info['file tree'].length < 2000) {
        prompt += ` the following code files exist:\n\n${repo_info['file tree']}\n\n`;
    }
    if (context !== 1) {
        prompt += `Explain the file called: \"${repo_info['file name']}\":\n${codeText}\n\nin context of the project repository. First in 40-50 words explain what this code file does in the context of the project repository. Then, explain what this code file does(write it in 100-120 words and write 1 small line describing each method in the code.)`;
    } else {
        prompt += `,Given below is the file named \"${repo_info['file name']}\":\n${codeText}\n\nWith the given information, explain the following code portion which was selected from the given file in 50-60 words:\n${results}\n\n`;
    }
    return prompt;
}