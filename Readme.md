## Simple flask API-UI for chatting (in text) with LLM models 

A simple general purpose UI template for quick prototyping and testing.

Set up:
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