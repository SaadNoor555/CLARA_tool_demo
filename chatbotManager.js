let chatHistory = [];

function clearHistory() {
    chatHistory = [];
}

function pushHistory(role, content) {
    chatHistory.push({
        role: role,
        content: content
    });
}

function popHistory() {
    chatHistory.pop();
}

function getChatHistory() {
    return chatHistory;
}

