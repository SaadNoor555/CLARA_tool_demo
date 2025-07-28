## CLARA's User Study

We conducted an user-study to evaluate CLARA's usability and usefulness with 5 professional developers & 5 academics who are experienced in code comprehension & code analysis tasks with GitHub. The survey questionnaire is available at **CLARA Tool Demo'25 Question.pdf**.

We are including our survey responses in the CLARA Tool Demo'25(Responses).csv file.


# User Study Data Selection Methodology

## Code Analysis

To evaluate the code comprehension feature, we replicated a repository from the **CodeSearchNet** dataset so that CLARA can consider repository context while comprehending a code file. Then, we selected 2 code files
within this project, both included in our sampled set of 30 code comprehension examples for the users to analyze CLARA’s code comprehension features

---

## Code Refactoring

For evaluating the code refactoring feature, we selected 2 code files from our 30 sampled code refactoring data from **MaRV**  dataset.

---

## Code Quality Attributes

For the code quality attribute detection feature, we also chose 2 code files from our sampled set of code files from the **Big-Vul** dataset

### Evaluation Fairness

To ensure a balanced evaluation, for each feature, we selected 2 code files (one where the model made good and accurate predictions, and one where the model underperformed) from our set of qualitatively evaluated samples
