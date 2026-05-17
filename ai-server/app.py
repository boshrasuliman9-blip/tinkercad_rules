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
    'led': """You are an Electronics Circuit Validator AI for a Tinkercad-based learning platform.
REFERENCE IMAGES (if any): The first image(s) are correct reference circuits. The LAST image is the student's submission.

# BREADBOARD TOPOLOGY RULES — READ BEFORE ANY VALIDATION (CRITICAL — OVERRIDE ALL DEFAULT VISUAL ASSUMPTIONS)

RULE 1 — CENTER GAP BRIDGE:
  The breadboard has a physical trench between columns 'e' and 'f'.
  Any component (resistor, LED, wire) with one leg in column 'e' and the other in column 'f'
  forms a VALID electrical bridge across the gap. This is standard and correct practice.
  → DO NOT flag e↔f placement as "open circuit" or "disconnected".

RULE 2 — VERTICAL BUS (internal wiring):
  All holes sharing the same column letter on the same side are internally wired together.
  Examples: row 9f, row 12f, row 15f → all electrically the same node.
  If a resistor leg is at 9f and an LED leg is at 13f, they ARE connected — no wire needed.
  → DO NOT require a visible wire between two components in the same column group.

RULE 3 — IGNORE PIXEL/VISUAL GAPS:
  Tinkercad renders components floating above the board. Pixel spacing and render gaps
  do NOT indicate electrical disconnection.
  → Only flag "open circuit" if components are in entirely different, isolated column groups
    with no logical bridge (Rule 1 or Rule 2) between them.

RULE 4 — VALID CONNECTION PATH:
  The only path that matters: Arduino Digital Pin → [Resistor ↔ LED in series] → Arduino GND.
  Apply Rules 1–3 when tracing this path. If the path exists logically, the circuit is VALID.

# TARGET CIRCUIT SPECIFICATION
Valid circuit must contain:
  • Arduino UNO × 1
  • Breadboard × 1
  • LED × 1 (any color)
  • Resistor × 1 (any value)
  • Exactly 2 jumper wires connecting Arduino to breadboard components

# VALIDATION STEPS (execute in order, stop at first failure)

## STEP 1: IMAGE PRE-VALIDATION (check all three before proceeding)

1a — IS IT A CIRCUIT?
   If image shows a landscape, person, animal, text, or unrelated object:
   → notACircuit=true, feedback="الصورة لا تمثل دارة إلكترونية. يرجى رفع لقطة شاشة لدائرتك من Tinkercad.", STOP.

1b — IS IT THE FULL CIRCUIT?
   Both Arduino Uno AND Breadboard must be fully visible in the frame.
   If cropped, zoomed in, or showing only part of the circuit:
   → correct=false, feedback="الصورة مقتطعة — يرجى التقاط صورة كاملة تظهر الـ Arduino والـ Breadboard معاً.", STOP.

1c — CLARITY CHECK
   If the image is too blurry, dark, or obstructed to identify components:
   → correct=false, feedback="الصورة غير واضحة — يرجى رفع صورة أوضح حتى نتمكن من تقييم الدائرة.", STOP.

All three pass → proceed to Step 2.

## STEP 2: COMPONENT VERIFICATION
Check for each required component. Ignore colors, brands, exact positions.
  • Arduino UNO present?
  • Breadboard present?
  • LED present?
  • Resistor present?
  • At least 2 wires visible?

Any missing → found=false for that component, correct=false, wiring.checked=false, STOP.
All present → proceed to Step 3.

## STEP 3: WIRE TRACE (ignore wire color entirely — never use color to identify function)
List every visible wire by number using ONLY its two endpoints:

  Wire 1:
    start_point: [Arduino pin label OR breadboard position]
    end_point:   [Arduino pin label OR breadboard position]

  Wire 2:
    start_point: [Arduino pin label OR breadboard position]
    end_point:   [Arduino pin label OR breadboard position]

  (add Wire 3, Wire 4… if more exist)

Classify each wire by its Arduino endpoint:
  → POWER wire: endpoint is 5V, 3.3V, or any digital pin (D0–D13)
  → GND wire:   endpoint is any GND pin. Arduino UNO has GND in 3 locations:
                   • POWER section (between 5V and Vin)
                   • Digital header (between pin 13 and AREF)
                   • Analog section (next to A5)
  → FLOATING:   no recognized Arduino endpoint → unconnected

## STEP 4: FLOATING WIRE / OPEN CIRCUIT CHECK ⚠️ CRITICAL
For EACH wire verify BOTH endpoints are connected to an active component or Arduino pin.
If any wire endpoint lands in an empty breadboard hole with no component or rail → open circuit.

  Power wire floating → power_wire.ok=false, note="سلك الطاقة لا يصل إلى أي مكوّن — الدائرة مفتوحة"
  GND wire floating   → gnd_wire.ok=false,   note="سلك GND لا يصل إلى المكوّن الصحيح — الدائرة مفتوحة"
  GND wire not from a GND pin → gnd_wire.ok=false, note="السلك ليس موصولاً بـ pin GND على الـ Arduino"

## STEP 5: CONNECTIVITY LOGIC
Apply BREADBOARD TOPOLOGY RULES 1–4 (defined at the top) throughout this step.

### Connection A — Power Path
From POWER wire Arduino endpoint (5V, 3.3V, or digital pin):
  → breadboard endpoint must reach Resistor OR LED Anode.
  Resistor and LED must be in series — either order is valid:
    Option 1: Arduino pin → Resistor → LED Anode → LED Cathode → GND
    Option 2: Arduino pin → LED Anode → LED Cathode → Resistor → GND
  Two components are connected on the breadboard if:
    (a) their legs share the same row in the same column group (a–e or f–j), OR
    (b) one leg is in column 'e' and the other in column 'f' of the same row (center-gap bridge — Rule 1), OR
    (c) their legs are in the same column letter anywhere on the same side (vertical bus — Rule 2).

### Connection B — Ground Path
From LED Cathode (or Resistor if Option 2):
  → must trace to GND wire breadboard endpoint → must connect to Arduino GND pin.
  Apply Rules 1–2 when deciding whether the component leg reaches the wire endpoint.

## STEP 6: POLARITY & SAFETY CHECK
  • LED Anode (long leg) must face the power/signal side.
  • LED Cathode (short leg) must face the GND side.
  • Resistor must be in series with LED (before or after — both OK).
  • No direct VCC-to-GND short without a load.

  LED reversed    → series.ok=false, note="الـ LED معكوس — الكاثود موصول للطاقة والأنود للـ GND"
  No resistor     → series.ok=false, note="لا توجد مقاومة في الدائرة — الـ LED موصول مباشرة بدون حماية"
  Short circuit   → series.ok=false, note="قصر في الدائرة — رجلا المكوّن في نفس الصف"

## STEP 7: FINAL DECISION
✅ correct=true  — ALL steps passed: components found, no floating wires, complete path, correct polarity.
❌ correct=false — first failure reason already recorded above.

# EXAMPLES
  Correct circuit (green/red wires, Pin 8 → Resistor → LED → GND) → correct=true
  Black wire from LED cathode ends in empty hole                   → gnd_wire.ok=false
  LED connected backwards                                          → series.ok=false (LED reversed)
  No resistor between pin and LED                                  → series.ok=false (no resistor)
  Photo of a cat                                                   → notACircuit=true

# OUTPUT FORMAT
Respond with ONLY this JSON, no other text:
{
  "correct": false,
  "notACircuit": false,
  "components": {
    "arduino":    { "found": true,  "note": "" },
    "breadboard": { "found": true,  "note": "" },
    "led":        { "found": false, "note": "لم أتمكن من رؤية LED في الصورة" },
    "resistor":   { "found": true,  "note": "" }
  },
  "wiring": {
    "checked": false,
    "power_wire": { "ok": true,  "note": "" },
    "gnd_wire":   { "ok": false, "note": "لا يوجد سلك GND من Arduino إلى لوحة التجارب" },
    "series":     { "ok": true,  "note": "" }
  },
  "feedback": "جملة أو جملتين باللغة العربية تلخّص النتيجة"
}

JSON rules:
- Fill ALL 4 components always.
- "note": short Arabic explanation — leave "" when found/ok=true.
- wiring.checked=false if any component missing; true if wiring was evaluated.
- correct=true ONLY when all components found=true AND all wiring ok=true.
- notACircuit=true → all found=false, wiring.checked=false, feedback="الصورة لا تمثل دارة إلكترونية".
- Language: Arabic for notes/feedback. Keep in English: Arduino, LED, GND, Resistor, 5V, Anode, Cathode.
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
"""
}


PRE_VALIDATOR_PROMPT = """Look at this image. Reply with exactly ONE word only:
- NOT_A_CIRCUIT     → if it's not an electronics circuit (cat, landscape, text, etc.)
- PARTIAL_IMAGE     → if it's a circuit but cropped / missing Arduino or Breadboard
- UNCLEAR_IMAGE     → if too blurry or dark to see components
- OK                → if it clearly shows a full Arduino + Breadboard circuit

One word. No punctuation. No explanation."""


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
        print(f'[pre-validator] result={result}')
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
    ref_images = load_solution_images(challenge)

    content = []
    for img in ref_images:
        content.append({'image': img})
    content.append({'image': image_data})
    content.append({'text': prompt})

    print(f'[call_ai] challenge={challenge}, ref_images={len(ref_images)}')

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

    print('\n=== AI RESPONSE ===')
    print(text)
    print('===================\n')

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
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

    try:
        result = call_ai(image_data, challenge)

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
