## Simple flask API-UI for chatting (in text) with LLM models 

A simple general purpose UI template for quick prototyping and testing.

#### Set up:
```
python -m venv venv

.\venv\scripts\activate # windows
source venv/bin/activate # Linux

# Edit the LLM_model file to your needs.
# add your specific dependencies to requireements.
# add the display name of your model and system prompt to the .env file.
# this name is will also be used to segement your side bar categories.  
# for example, 'PHI-3' can be used for  the name tag and 'you are an assistant language model' for system prompt(without quotations).

pip install -r requirements.txt

python run.py
```

I left the llm_model open ended to accommodate prototyping needs.

![image](/Readme_screenshot.png)

#### Important warning
since I am using a .env file for getting the label name of model and the system prompt, an important problem emerges as that you may sometimes need to restart the terminal after changing the .env file... which is less than ideal. 

If you are bothered by this, manually assign the names and the system prompt in the /app/routes.py line 13,14 as a string. 
