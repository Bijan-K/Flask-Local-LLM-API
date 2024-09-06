## Simple flask API-UI for chatting (in text) with LLM models 

A simple general purpose UI template for quick prototyping and testing.

#### Set up:
```
python -m venv venv

.\venv\scripts\activate # windows
source venv/bin/activate # Linux

# Edit the LLM_model file to your needs
# add your specific dependencies to requireements 
# add the display name of your model and system prompt to the .env file. 
# for example, 'PHI-3' for name tag and 'you are an assistant language model' for system prompt(without quotations).

pip install -r requirements.txt

python app.py
```

I left the llm_model open ended because I thought some would like to use it with transformers and some may want to use an API. 

![image](/Readme_screenshot.png)

#### Important warning
since I am using a .env file for getting the label name of model and the system prompt, an important problem emerges as that you would need to restart the terminal after changing the .env file... which is less than ideal. 

If you are bothered by this, manually assign the names and the system prompt in the app.py line 10,11 as a string instead. 

And another important note, the messages get appended once the API receives its answer. This is mostly in order to assign the correct message id(that is in the database) to the users message, in a single post request. 

