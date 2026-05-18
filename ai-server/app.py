import os
import re
import sys
import json
import base64
import threading
import requests
import dashscope
from dashscope import MultiModalConversation
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

_dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(_dotenv_path, override=True)
print(f'[startup] .env path: {_dotenv_path}')

app = Flask(__name__)
CORS(app)

DASHSCOPE_API_KEY   = os.environ.get('DASHSCOPE_API_KEY', '')
AI_MODEL            = os.environ.get('AI_MODEL',      'qwen-vl-plus')
AI_FAST_MODEL       = os.environ.get('AI_FAST_MODEL', 'qwen-vl-plus')
GAS_SCRIPT_URL      = os.environ.get('GAS_SCRIPT_URL', '')
UPLOAD_SECRET       = os.environ.get('UPLOAD_SECRET', '')

dashscope.api_key = DASHSCOPE_API_KEY
dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

print(f'[startup] AI_MODEL={AI_MODEL}')
print(f'[startup] AI_FAST_MODEL={AI_FAST_MODEL}')

_eval_counter = 0

CHALLENGE_DRIVE_NAMES = {
    'led':         'challenge 1',
    'push-button': 'challenge 2'
}


def upload_to_gdrive(image_data, challenge, correct, student_id, student_name):
    if not GAS_SCRIPT_URL:
        return
    try:
        resp = requests.post(GAS_SCRIPT_URL, json={
            'action':       'uploadImage',
            'uploadSecret': UPLOAD_SECRET,
            'image':        image_data,
            'challenge':    challenge,
            'correct':      correct,
            'studentId':    student_id,
            'studentName':  student_name
        }, timeout=60)
        print(f'[GDrive] {resp.status_code} {resp.text[:80]}')
    except Exception as ex:
        print(f'[GDrive error] {ex}')


CHALLENGE_SOLUTION_DIRS = {
    'led': os.path.join(os.path.dirname(__file__), '..', 'solution', 'challenge1')
}


def load_solution_images(challenge: str) -> list:
    folder = CHALLENGE_SOLUTION_DIRS.get(challenge)
    if not folder or not os.path.isdir(folder):
        return []
    images = []
    for filename in sorted(os.listdir(folder)):
        ext = filename.lower().rsplit('.', 1)[-1]
        if ext not in ('png', 'jpg', 'jpeg', 'webp'):
            continue
        filepath = os.path.join(folder, filename)
        with open(filepath, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode('utf-8')
        mime = 'image/jpeg' if ext in ('jpg', 'jpeg') else f'image/{ext}'
        images.append(f'data:{mime};base64,{b64}')
    return images


CHALLENGE_PROMPTS = {
    'led': """You are an Electronics Circuit Validator AI.
TASK: Validate a student's Tinkercad screenshot of a "Simple LED Circuit".
CONSTRAINT: Do NOT use any external reference images. Use ONLY the rules below. Never compare to other photos or assume standard layouts.

# 1. SPECIFICATION (Required Components)
- 1 Arduino UNO
- 1 Breadboard
- 1 LED
- 1 Resistor (any value)
- Wires: Must connect Arduino Pin → Component → Arduino GND. All connections must be physically traced via wires or breadboard continuity.

# 2. CRITICAL BREADBOARD TOPOLOGY RULES (STRICT - NO EXCEPTIONS)
Apply these rules to determine electrical connectivity. Ignoring them leads to incorrect validation.

RULE A (Vertical Bus): All holes in the SAME column letter (a-e OR f-j) on the SAME side of the breadboard are INTERNALLY CONNECTED.
   - Example: A resistor leg in 10a and an LED leg in 10e are CONNECTED if both are on the same side (top or bottom), even without a wire.
   - This applies only within the same half (top/bottom) and same column group (a-e or f-j).

RULE B (Center Gap): The trench between columns 'e' and 'f' is a BREAK.
   - Example: A leg in 10e and a leg in 10f are DISCONNECTED unless bridged by a wire or component that spans across the gap.
   - No internal connection exists across this gap.

RULE C (Visuals): Ignore pixel gaps or apparent closeness. Connectivity is determined solely by:
   - Wire connections
   - Breadboard internal buses (Rule A)
   - Physical placement spanning the center gap (Rule B)

# 3. VALIDATION STEPS

Step 1: Component Check
- Confirm presence of: Arduino, Breadboard, LED, Resistor.
- If any is missing → return "Missing Component".

Step 2: Path Trace (Must Be Continuous)
Trace the full current path from Arduino Digital Pin → Resistor → LED → Arduino GND (or reverse order).
- Resistor and LED can be in either order (series), but both must be included.
- Use Rule A & B to verify:
   - Are the components connected via wires?
   - Is there a continuous path through breadboard buses?
   - Is the center gap properly bridged?

Step 3: Polarity Check
- LED Anode (long leg) must connect to Power/Arduino Pin.
- LED Cathode (short leg) must connect to GND.
- Reverse = "Reverse Polarity".

Step 4: Short Circuit Check
- If any wire connects Arduino Pin directly to GND without passing through LED or Resistor → "Short Circuit".

Step 5: Open Circuit Check
- If any part of the path is broken (e.g., wire ends in empty hole, isolated component, unconnected pin) → "Open Circuit".

# 4. LIST OF WRONG ANSWERS (Check for these specific errors)
If the circuit is invalid, identify the exact error:
1. "Open Circuit": Path is broken. (e.g., Wire ends in empty hole, or components in isolated columns without bridge).
2. "Short Circuit": Pin connected directly to GND without Load (LED/Resistor).
3. "Missing Resistor": LED connected directly to Pin/GND (Risk of burnout).
4. "Reverse Polarity": LED is backward (Cathode to Power, Anode to GND).
5. "Missing Component": One of the 4 required parts is absent.

# 5. OUTPUT FORMAT (JSON ONLY)
Return ONLY valid JSON. No markdown, no extra text.

{
  "correct": boolean,
  "notACircuit": boolean,
  "components": {
    "arduino": {"found": boolean, "note": ""},
    "breadboard": {"found": boolean, "note": ""},
    "led": {"found": boolean, "note": ""},
    "resistor": {"found": boolean, "note": ""}
  },
  "wiring": {
    "checked": boolean,
    "power_wire": {"ok": boolean, "note": ""},
    "gnd_wire": {"ok": boolean, "note": ""},
    "series": {"ok": boolean, "note": ""}
  },
  "feedback": "Arabic sentence. If correct: 'الدائرة صحيحة'. If wrong: State the specific error from List of Wrong Answers."
}

# JSON RULES
- If correct=true: all notes="", all wiring ok=true.
- If correct=false: feedback must explain the specific error (e.g., "الـ LED معكوس" or "المسار مفتوح").
- Language: Arabic for feedback/notes. English for keys.
- Do not infer anything beyond what is visible in the image.
- Never assume default configurations or standard setups.
- Only accept direct visual evidence: wires, component positions, and breadboard topology.
""",

    'push-button': """You are a strict electronics teacher evaluating a student's Tinkercad circuit screenshot.

CHALLENGE: "Push Button LED" — Control exactly 1 LED using exactly 1 push button connected to Arduino UNO.

REJECT (notACircuit=true) if image is not a circuit at all.

REQUIRED COMPONENTS (all must be present):
- 1 Arduino UNO board
- 1 Breadboard
- 1 LED on the breadboard
- 1 Resistor in series with the LED
- 1 Push Button (small square component with 4 legs) on the breadboard
- At least 3 wires

VERDICT:
- correct=true: ALL components present and connected with wires
- correct=false: any component missing or no wires

Respond with ONLY this JSON:
{"correct": true, "feedback": "2-3 sentences in Arabic describing what you see", "issues": [], "notACircuit": false}

Rules:
- correct=true → issues=[]
- correct=false → issues lists every missing/wrong thing in Arabic
- notACircuit=true → correct=false, feedback="الصورة لا تمثل دارة إلكترونية"

Additional Constraints:
- Do not assume pull-up/pull-down resistors unless visible.
- Only count physical wires shown in the image.
- Push button must be placed on breadboard and wired correctly.
- No assumptions about internal Arduino behavior.
"""
}


PRE_VALIDATOR_PROMPT = """Analyze the image. Reply with EXACTLY ONE word from this list:
- NOT_A_CIRCUIT (if it's a cat, landscape, text, or not electronics)
- PARTIAL_IMAGE (if Arduino or Breadboard is cropped/missing)
- UNCLEAR_IMAGE (if too blurry/dark to identify components)
- OK (if it clearly shows a full Arduino + Breadboard circuit)

Do not add punctuation or explanation. Just the word."""


def call_pre_validator(image_data: str) -> str:
    try:
        response = MultiModalConversation.call(
            model=AI_FAST_MODEL,
            messages=[{
                'role': 'user',
                'content': [
                    {'image': image_data},
                    {'text': PRE_VALIDATOR_PROMPT}
                ]
            }]
        )
        if response.status_code != 200:
            print(f'[pre-validator] error: {response.code} {response.message}')
            return 'OK'
        text = response.output.choices[0].message.content[0]['text']
        result = text.strip().split()[0].upper() if text.strip() else 'OK'

        usage = response.usage or {}
        in_tok  = usage.get('input_tokens',  0)
        out_tok = usage.get('output_tokens', 0)
        print(f'[pre-validator] result={result} | input={in_tok} output={out_tok} total={in_tok+out_tok}')
        return result
    except Exception as ex:
        print(f'[pre-validator] error: {ex}')
        return 'OK'


PRE_VALIDATOR_MESSAGES = {
    'NOT_A_CIRCUIT': {'notACircuit': True,  'correct': False, 'feedback': 'الصورة لا تمثل دارة إلكترونية. يرجى رفع لقطة شاشة لدائرتك من Tinkercad.'},
    'PARTIAL_IMAGE': {'notACircuit': False, 'correct': False, 'feedback': 'الصورة مقتطعة — يرجى التقاط صورة كاملة تظهر الـ Arduino والـ Breadboard معاً.'},
    'UNCLEAR_IMAGE': {'notACircuit': False, 'correct': False, 'feedback': 'الصورة غير واضحة — يرجى رفع صورة أوضح حتى نتمكن من تقييم الدائرة.'},
}


def call_ai(image_data: str, challenge: str) -> dict:
    prompt = CHALLENGE_PROMPTS.get(challenge, CHALLENGE_PROMPTS['led'])

    content = [
        {'image': image_data},
        {'text': prompt}
    ]

    print(f'[call_ai] challenge={challenge}')

    response = MultiModalConversation.call(
        model=AI_MODEL,
        messages=[{
            'role': 'user',
            'content': content
        }]
    )

    if response.status_code != 200:
        raise ValueError(f'{response.code}: {response.message}')

    text = response.output.choices[0].message.content[0]['text']

    usage         = response.usage or {}
    input_tokens  = usage.get('input_tokens',  0)
    output_tokens = usage.get('output_tokens', 0)
    image_tokens  = usage.get('image_tokens',  0)
    text_tokens   = usage.get('input_tokens_details', {}).get('text_tokens', input_tokens - image_tokens)
    total_tokens  = input_tokens + output_tokens

    try:
        return json.loads(text), total_tokens, input_tokens, output_tokens, image_tokens, text_tokens
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group()), total_tokens, input_tokens, output_tokens, image_tokens, text_tokens
        raise ValueError('لم يعد الذكاء الاصطناعي بتنسيق JSON صحيح')


@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.get_json(silent=True)

    if not data or 'image' not in data:
        return jsonify({'error': 'لم يتم إرسال صورة'}), 400

    image_data   = data['image']
    challenge    = data.get('challenge',   'led')
    student_id   = data.get('studentId',   '')
    student_name = data.get('studentName', '')

    if not image_data.startswith('data:image/'):
        return jsonify({'error': 'تنسيق الصورة غير صحيح'}), 400

    global _eval_counter
    _eval_counter += 1
    img_num = _eval_counter

    try:
        pre = call_pre_validator(image_data)
        if pre in PRE_VALIDATOR_MESSAGES:
            msg = PRE_VALIDATOR_MESSAGES[pre]
            print(f'\n[#{img_num}] challenge={challenge} | status={pre}')
            if pre != 'PARTIAL_IMAGE':
                threading.Thread(
                    target=upload_to_gdrive,
                    args=(image_data, challenge, False, student_id, student_name),
                    daemon=True
                ).start()
            return jsonify(msg)

        result, total_tok, _, out_tok, img_tok, txt_tok = call_ai(image_data, challenge)

        status = 'CORRECT' if result.get('correct') else 'WRONG'
        print(f'\n[#{img_num}] challenge={challenge} | status={status}')
        print('========= TOKEN USAGE =========')
        print(f'  Input tokens  : {img_tok + txt_tok:>8,}')
        if img_tok:
            print(f'  Image tokens  : {img_tok:>8,}  (ضمن الـ input)')
        print(f'  Output tokens : {out_tok:>8,}')
        print(f'  ─────────────────────────────')
        print(f'  Total         : {total_tok:>8,}')
        print('================================\n')

        if not result.get('notACircuit', False):
            threading.Thread(
                target=upload_to_gdrive,
                args=(image_data, challenge, result.get('correct', False),
                      student_id, student_name),
                daemon=True
            ).start()

        return jsonify(result)
    except Exception as e:
        return jsonify({
            'correct': False, 'score': 0,
            'feedback': f'حدث خطأ أثناء التقييم: {str(e)}',
            'issues': []
        }), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'model': AI_MODEL})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
