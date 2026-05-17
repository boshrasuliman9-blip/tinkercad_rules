import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'), override=True)

import dashscope
from dashscope import MultiModalConversation

dashscope.api_key = os.environ.get('DASHSCOPE_API_KEY', '')
dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'
model = os.environ.get('AI_MODEL', 'qwen3.6-plus')

print(f'Testing model: {model}')
print(f'API key: {dashscope.api_key[:10]}...')

response = MultiModalConversation.call(
    model=model,
    messages=[{'role': 'user', 'content': [{'text': 'قل مرحبا فقط'}]}]
)

print(f'Status: {response.status_code}')
if response.status_code == 200:
    content = response.output['choices'][0]['message']['content']
    text = ''.join(c.get('text', '') for c in content if isinstance(c, dict))
    print(f'Response: {text}')
else:
    print(f'Error: {response.code} - {response.message}')
