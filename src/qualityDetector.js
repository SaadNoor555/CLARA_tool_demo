function statsPrompt(codeText, params =null) {

  var prompt =  `CVE categories`;
  if(params !== null) {
    prompt += processParams(params);
  }
  else {
    prompt += `: Code Execution,Denial of Service,Information Leak,Privilege Escalation,Overflow,ByPass, Memory Corruption.`
  }
  prompt+= ` Calculate the cyclomatic complexity, maintainability index and vulnerability category that suit most from CVE categories for the following code. Just check out the codes and from the code try to answer . just write the numbers:\n${codeText}"\n\nIn your response only give the detected values of these attributes. Don't give any explanation`;
  
  return prompt;
}

function processParams(params) {
  var paramStr = ': ';
  params.array.forEach(element => {
    paramStr+= element+','
  });
  return paramStr;
}