<p align="center">
  <img src="assets/clara.jpg" alt="CLARA Logo" />
</p>

<h1 align="center">CLARA (Code expLAiner & Repo Analyzer)</h1>

## What is CLARA?

CLARA is an open-source Chrome Extension that acts as a browser extension that utilizes state-of-the-art inference model to assist developers and
researchers. CLARA has 3 features:
1. Comprehending code files and code fragments 
2. Code refactoring
3. Code quality attribute detection

---

## Install CLARA:

CLARA can be installed as a Chrome Extension on any Chrome repository. The installation link of CLARA is given below, using which a user can install CLARA on any Chromium-based Browser.

:link: [Install CLARA](https://chromewebstore.google.com/detail/clara/elidmleeoibempdgheabdhjdocppbioh)



## About this Repository

This repository hosts the code, resources, and supporting materials for the *CLARA Extension*. It is organized into the following folders:

### Replication Package
This folder contains all materials necessary to replicate the experiments, evaluations, and studies conducted for CLARA. It is further divided into the following subfolders:
- *Model_Evaluation*: Includes code to replicate the model evaluation result, and the author's evaluation for the LLMs for the 3 tasks of CLARA.
- *User_Study*: Contains the user study questionnaire and survey results related to CLARA.

### CLARA Tool
This folder contains the core codebase for the CLARA tool. The accompanying README.md file provides detailed instructions on how to run and customize CLARA to suit your requirements.

### assets
This folder holds images and other utility files used throughout the repository, including visuals for documentation purposes.

Feel free to explore these folders for a comprehensive understanding of CLARA and its functionality.

---

## CLARA in Action:

<p align="center">
  <img src="assets/CLARA_user.png" alt="CLARA UI" style="width:80%;" />
</p>
CLARA can be easily installed in any Chromium-based browser(Chrome, Brave, Edge) via its Chrome Web Store page  by clicking ‘Add to Browser’. Once installed, visiting any
GitHub code file triggers CLARA’s pop-up at the top-right( 1 in Figure).In CLARA’s popup, there are four buttons. The ”Explain Full Code File” button can give a context-aware explanation of the code file. The ”Explain Marked/Selected Code” button can help the user to understand a specific highlighted part.The ”Refactor the Code” button provides a refactored version of the source code with descriptive comments. The ’See Code Quality Attributes’ button displays quality metrics of the code file. After clicking on any of these 4 buttons, CLARA’s generated response ( 2 in Figure) is displayed in a module. A user can also leverage an AI-assisted chatbot ( 3 in figure) while using each of CLARA’s features and ask followup questions or inquiries in a continuous conversation.
---

## CLARA's Architecture:

CLARA is implemented using Python with the following architecture:  

<p align="center">
  <img src="assets/Clara_archi.png" alt="CLARA Architecture" />
</p>


CLARA’s architecture, shown in, is composed of two subsystem units: (1) Backend, and (2) Client.

***A. Backend of CLARA***

CLARA’s backend consists of four main components:

***1) Data Scraper:*** After CLARA is installed in a browser, when a user visits the code files of an open-source GitHub repository, this component scrapes necessary code file information along with repository metadata essential for contextual understanding (e.g., repo title, file tree containing paths of all files and folders, readme information, tags and topics) and communicates with message dispatcher for data propagation.

***2) Message Dispatcher:*** This component acts as a middleware between CLARA’s client and backend. This component dispatches client-side request to the relevant code comprehension/analysis component or to the chatbot manager. Likewise, the generated feedback response is sent back to the client’s appropriate module from the backend through this component.

***3) Code Comprehension & Analysis Components:*** There are three components in CLARA that assist users with code comprehension and analysis tasks :

***i) Code Explainer:*** This component retrieves the necessary code file data, repository’s contextual information and the required action event from the message dispatcher. Then, it constructs a well-defined prompt by parsing the retrieved code and repository context data and sends it to the LLM inference module. After receiving the response, the component processes the output, formats it appropriately, and returns it using message dispatcher.

***ii) Code Refactorer:*** When a user requests code refactoring, this component receives the action request and the code file data from message dispatcher, constructs an appropriate prompt with instructions to generate a clean, refactored version of the code with descriptive comments about refactoring changes, passes it to the LLM inference module. Then, it returns the formatted response to the client via message dispatcher.

***iii) Code Quality Attribute Detector:*** This component analyzes the code file data and predicts quality attributes, such as cyclomatic complexity, maintainability index, and CVE classified vulnerabilities. Upon receiving the action request from the message dispatcher, this component breaks the code, formats it properly, and constructs a suitable prompt to for the inference module. Then, it utilizes the message dispatcher to return the formatted output.

***4) Chatbot Manager:*** The chatbot manager facilitates communication between the client’s chatbot module and backend’s LLM inference module. In doing so, it manages conversational history, parses relevant information (both from scraped data and user inquiries), and constructs well-formatted and structured prompts and response messages accordingly.

***B. CLARA’s Client Side (Frontend)***

CLARA’s client design structure contains a pop-up with four buttons, representing its features. Additionally, CLARA’s feedback response section is divided into two key modules: (1) Feature Module, and (2) Chatbot Module. The feature module shows the generated feedback response in a structured and user-friendly format. The Chatbot Module contains an input field for receiving user inquiries and an output area where both user questions and chatbot responses are displayed in a clear, conversational format.

--- 

## How can I contribute to CLARA?

We are more than happy to receive your contributions (any kind of contributions). If you have an idea of a feature or enhancement, or if you find a bug, please open an issue (or a pull request). If you have questions, feel free to contact us: <a href="https://github.com/adnan23062000">Ahmed Adnan</a> (bsse1131@iit.du.ac.bd),   <a href="https://github.com/antu-saha">Saad Sakib Noor</a> (bsse1122@iit.du.ac.bd), <a href="https://github.com/mushfiqurgalib">Mushfiqur Rahman</a> (mushfiqur.rahman@bubt.edu.bd), and <a href="">Kazi Sakib</a> (sakib@iit.du.ac.bd)

---
  
## How do I customize and run CLARA on my server?
CLARA is a tool for bug report duplicate detection, severity prediction and bug localization. A user can run CLARA and customize it by following the instructions given below. We have also made our .env file public so that users can get an idea of which variable names to use and which values are required in those variables.

*Step 1:* 

Clone the repository 

*Step 2:* 

Download the Models 

You can download our fine-tuned models for the 3 features from here: [models](https://drive.google.com/drive/folders/1IQdWRwUKVGmU-8p4PNbWd4vTxIAuaoNY?usp=sharing). 

After downloading, put them in your preferable location and add the location path (the path of the downloaded folders with feature names; e.g. 'modelDupBr', 'modelPrioritySeverity') in the .env file. Add model paths for each of the 3 features in the .env file in variables ''DUPLICATE_BR_MODEL_PATH', 'SEVERITY_PREDICTION_MODEL_PATH', 'BUGLOCALIZATION_MODEL_PATH'.

You can also use your own fine-tuned models. You just need to add your model path in the .env file.

[n.b. - The bug localization model (Llama-7b-chat-finetune) requires a GPU of the ampere family to load the shards to run, the entire project and the models require about 20gb of space]


*Step 3:*

Install ngrok from (https://ngrok.com/download) [This will create a secure tunnel from a public endpoint (Github repository) to a locally running network service (our project running in localhost)]


*Step 4:* 

Create a new GitHub application. You need to go to the following path:

   Settings -> Developer's Settings -> New GitHub App

Make sure in ‘Repository Permissions’ section of the GitHub application, there is Read and Write access to ‘Actions’, ‘Webhooks’ and ‘Issues’. After saving the GitHub application, there will be an option to Generate a private access token (this token will enable permission for CLARA to fetch and post data to a user’s Github repositories). Generate this token and then copy and paste app id, client id, and github private access token/private key to the .env file of the cloned code.



*Step 5:*  

Open the cloned project in IDE and install the required dependencies. You can use our [requirements.txt](https://github.com/sea-lab-wm/sprint_issue_report_assistant_tool/blob/main/SPRINT%20Tool/requirements.txt) file for this. Then, run the following 2 commands in 2 different terminals:  

ngrok http 5000

python main.py
# or
python -m main


*Step 6:*

Go to the repository where you need to run the tool. Go to -

Settings -> Webhooks -> Add Webhook 

Then copy the forwarding address shown after running the command ngrok http 5000 or ./ngrok http 5000 (if ngrok.exe is in your SPRINT Tool folder)  into the Payload URL section of Add Webhook. 


Make sure ‘Which events would you like to trigger this webhook?’ section has ‘Issues’, ‘Issue Comments’ and ‘Labels’ checkboxes checked


*Step 7:*

Create issues in that repository and see SPRINT work

---

# SPRINT API Documentation

## Overview
SPRINT provides three features: *Duplicate Issue Detection*, *Severity Prediction*, and *Bug Localization*. Each feature is implemented as a Python function-based API and can be used within your project. Below is a guide on how to interact with these APIs, the expected inputs, outputs, and how to modify or customize their behavior.

---

## 1. Duplicate Issue Detection

### *Function*
DuplicateDetection(sent1, sent2, issue_id)

### *Purpose*
Compares a new issue with an existing one to detect duplicates based on textual similarity.

### *Input Parameters*
- sent1: String. The title or description of the new issue.
- sent2: String. The title or description of the existing issue to compare against.
- issue_id: Integer. The ID of the issue being compared.

### *Output*
- *Returns:*
Integer  
  - 1: Duplicate.  
  - 0: Not a duplicate.

### *Customization*
- *Model Path:* Update the DUPLICATE_BR_MODEL_PATH environment variable in .env to change the pre-trained model.  
- *Model Hyperparameters:* Modify the tokenizer settings (max_length, padding) or replace the model architecture if needed.  
- *Parallel Processing:* The APIs support multiprocessing for faster execution using a multiprocessing pool. Customize the chunkify logic or the number of processes (processes=4) to suit your system’s capabilities.

---

## 2. Severity Prediction

### *Function*
SeverityPrediction(input_text)

### *Purpose*
Predicts the severity level of a reported issue based on its textual content.

### *Input Parameters*
- input_text: String. The combined title and description of the issue.

### *Output*
- *Returns:*
String. One of the following severity levels:
  - Blocker, Critical, Major, Minor, Trivial.

### *Customization*
- *Model Path:* Update the SEVERITY_PREDICTION_MODEL_PATH in .env.  
- *Severity Classes:* Adjust the severity classification mapping in GetSeverityPriorityClass if custom labels are needed:
  ```python
  severity_classes = {
      0: "Blocker",
      1: "Major",
      2: "Minor",
      3: "Trivial",
      4: "Critical",
  }


## 3. Bug Localization

### *Function*
BugLocalization(issue_data, repo_full_name, code_files_list)

### *Purpose*
Predicts the most likely buggy code files that might require modification to fix the issue.

### *Input Parameters*
- issue_data: String. The combined title and description of the issue.  
- repo_full_name: String. The repository’s full name (e.g., org/repo).  
- code_files_list: List of Strings. Paths to all code files in the repository.

### *Output*
- *Returns:*
List of Strings. File paths for the top 5–6 predicted buggy files.

### *Customization*
- *Model Path:* Update the BUGLOCALIZATION_MODEL_PATH in .env.  
- *Prompt:* Modify the prompt string in the function to adjust the question or context provided to the model.  
- *Quantization Settings:* Fine-tune the BitsAndBytesConfig if you need to optimize model performance for specific hardware.

---

### *General Notes*

#### *Environment Configuration*
All three features rely on pre-trained models and their paths are defined in .env. SPRINT's three features can support many transformer-based models and LLMs. Update the following environment variables to add your customized model paths:
- DUPLICATE_BR_MODEL_PATH  
- SEVERITY_PREDICTION_MODEL_PATH  
- BUGLOCALIZATION_MODEL_PATH

#### *Model Replacement*
To use custom models:
1. Fine-tune your models for tasks like classification or text similarity.
2. Save the models to a local directory.
3. Update the corresponding model paths in the .env file.

---

# Extending SPRINT with New Features

## Overview
SPRINT is designed to be modular and extensible, allowing developers to easily add new features. This guide provides a brief overview of how to create a new feature as a functional API and integrate it into SPRINT.

---

## Steps to Add a New Feature

### 1. *Define the Feature*
Identify the new functionality you want to add. Clearly define:
- *Purpose*: What problem does the feature solve?
- *Inputs*: What data does it require?
- *Outputs*: What will the feature return or produce?

### 2. *Create the Feature Functional API*

1. *Set Up the Model/Logic*
   - If the feature requires a machine learning model, train or fine-tune a model specific to the task.
   - Save the model and its tokenizer in a local directory.
   - Define the model's path in the .env file for easy configuration.

2. *Implement the API*
   Write a Python function that encapsulates the feature's logic. Use SPRINT's existing APIs as templates. Ensure:
   - The function accepts clear input parameters.
   - The function processes the inputs and produces outputs efficiently.
   - Proper error handling is included.

3. *Integrate the New Feature into SPRINT*  
   Update the Process Logic  

   Modify the processIssueEvents.py file to include calls to the new feature API. All the GitHub issues after fetching can be used from this code file according to the requirements.
   Example:  

   ```python
   # Call the new feature
   new_feature_result = NewFeature(input_issue_data)
   create_comment(repo_full_name, issue_number, new_feature_result)

4. *Add Configuration*

   Add environment variables for the new feature in the .env file (e.g., model paths, hyperparameters).

5.   *Update Outputs*

   Decide how the results from the new feature will be presented. For example:
   - Add comments to GitHub issues.
   - Attach labels based on the feature's output.

---
