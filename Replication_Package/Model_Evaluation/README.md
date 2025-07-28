## CLARA's Model Evaluation

We conducted an user-study to evaluate CLARA's usability and usefulness with 3 authors who are experienced in Code comprehension & Analysis task with LLM. 

We are including our survey responses in the ASE Tool Model Evaluation Dataset.xlsx file.


# User Study Data Selection Methodology

## Dataset Selection
To select an appropriate inference model for CLARA’s features, we chose 3 datasets, resembling CLARA’s 3 features for model evaluation. We selected the **CodeSearchNet dataset** by GitHub for code comprehension, **MaRV dataset** proposed by Nunes et al. for code refactoring, and **Big-Vul** dataset proposed by Fan et al. for code quality attribute detection.

# Model Selection
After dataset selection, we applied random sampling to extract 30 samples from each dataset to evaluate the models’ performance on them qualitatively. Then we carefully created prompts for each of the tasks using persona prompting and adhered to the prompt engineering guidelines proposed by Ronaki et al. As for model selection, we chose 3 widely-used benchmark generative models (GPT-4o, Gemini 2.5 Flash, and DeepSeekv3). for their superior performance in LiveBench  benchmark test. After that, each author manually reviewed each of the models’ responses, compared them with datasets’ sample answers and qualitatively rated them. Finally, GPT-4o model was
selected due to it receiving the highest average rating. The evaluation details and data are given in our replication package 

The script for the dataset to be replicated can be found on LLM_Code_Analyzer.ipynb, and the evaluation can be found in ASE TOOL Model Evaluation Dataset.xlsx



