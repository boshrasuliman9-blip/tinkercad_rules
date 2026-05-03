from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4
from urllib.parse import urlencode
from urllib.request import ProxyHandler, build_opener

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from .storage import load_db, new_id, now_iso, save_db


app = FastAPI(title="Circuit Quest API")

MAIL_RELAY_URL = "https://script.google.com/macros/s/AKfycbxWF7Bwym87UO_oRYD6OUltoJ-BHMwrMGteFsQ8YJKEz-N7zR5zjiTMOQ9J0Zp-BDPp2g/exec"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def as_bool(value: Any) -> bool:
    return value is True or str(value).lower() == "true"


def list_response(key: str, rows: list[dict]) -> dict:
    return {"ok": True, "data": rows, key: rows}


def public_user(user: dict) -> dict:
    return {key: value for key, value in user.items() if key != "passwordHash"}


def add_notif(db: dict, user_id: str, title: str, message: str, notif_type: str = "activity") -> dict:
    notif = {
        "id": new_id("nt"),
        "userId": user_id,
        "type": notif_type,
        "title": title,
        "body": message,
        "message": message,
        "text": message,
        "read": False,
        "readAt": "",
        "createdAt": now_iso(),
    }
    db.setdefault("notifs", []).insert(0, notif)
    return notif


def notify_admin_signup(user: dict, approval_base_url: str) -> dict:
    if not approval_base_url:
        return {"ok": False, "msg": "Missing approvalBaseUrl"}
    params = {
        "action": "notifyFastApiSignup",
        "userId": user.get("id", ""),
        "role": user.get("role", "student"),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "phone": user.get("phone", ""),
        "approvalBaseUrl": approval_base_url,
    }
    try:
        opener = build_opener(ProxyHandler({}))
        with opener.open(MAIL_RELAY_URL + "?" + urlencode(params), timeout=10) as response:
            body = response.read().decode("utf-8", errors="replace")
            print(f"[mail] GAS response: {body[:300]}")
            return {"ok": True, "response": body[:500]}
    except Exception as exc:
        print(f"[mail] ERROR calling GAS: {exc}")
        return {"ok": False, "msg": str(exc)}


def find_by_id(rows: list[dict], row_id: str) -> dict | None:
    return next((row for row in rows if row.get("id") == row_id), None)


def find_by_email(rows: list[dict], email: str) -> dict | None:
    email = str(email or "").strip().lower()
    return next((row for row in rows if str(row.get("email", "")).strip().lower() == email), None)


def user_collection_for_role(db: dict, role: str) -> list[dict]:
    if role == "teacher":
        return db["teachers"]
    return db["students"]


def find_user_for_review(db: dict, role: str, user_id: str) -> dict | None:
    if role == "teacher":
        return find_by_id(db["teachers"], user_id)
    if role == "creator":
        return next((user for user in db["students"] if user.get("id") == user_id and user.get("role") == "creator"), None)
    return find_by_id(db["students"], user_id)


def mark_admin_request_notifs_read(db: dict, user: dict) -> None:
    user_id = user.get("id", "")
    email = str(user.get("email", "")).lower()
    name = str(user.get("name", "")).lower()
    for notif in db["notifs"]:
        text = str(notif).lower()
        if notif.get("userId") == "admin" and notif.get("type") == "user_request":
            if user_id and user_id in text or email and email in text or name and name in text:
                notif["read"] = True
                notif["readAt"] = now_iso()


def decorate_assignments(db: dict, teacher_id: str = "") -> list[dict]:
    assignments = [
        assignment for assignment in db["assignments"]
        if not teacher_id or assignment.get("teacherId") == teacher_id
    ]
    decorated = []
    for assignment in assignments:
        related = [code for code in db["codes"] if code.get("assignmentId") == assignment.get("id")]
        item = dict(assignment)
        item["totalCount"] = len(related)
        item["submittedCount"] = len([code for code in related if code.get("submittedAt")])
        item["pendingCount"] = len([code for code in related if code.get("status") == "submitted"])
        item["approvedCount"] = len([code for code in related if code.get("status") == "approved"])
        item["rejectedCount"] = len([code for code in related if code.get("status") == "rejected"])
        decorated.append(item)
    return decorated


def submissions_for_assignment(db: dict, assignment_id: str) -> list[dict]:
    rows = [
        code for code in db["codes"]
        if code.get("assignmentId") == assignment_id and code.get("submittedAt")
    ]
    rows.sort(key=lambda code: code.get("submittedAt") or "")
    results = []
    for index, code in enumerate(rows, start=1):
        item = dict(code)
        item["rank"] = index
        item["codeId"] = code.get("id")
        item["studentCode"] = code.get("code")
        try:
            started = datetime.fromisoformat(code.get("startedAt", ""))
            submitted = datetime.fromisoformat(code.get("submittedAt", ""))
            item["duration"] = round((submitted - started).total_seconds() / 60)
        except ValueError:
            item["duration"] = 0
        results.append(item)
    return results


async def payload_from_request(request: Request) -> dict:
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        data = await request.json()
        return data if isinstance(data, dict) else {}
    form = await request.form()
    return dict(form)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "Circuit Quest FastAPI"}


@app.post("/api")
async def api(request: Request) -> dict:
    params = await payload_from_request(request)
    return handle_action(params)


@app.get("/api")
def api_get(request: Request) -> dict:
    return handle_action(dict(request.query_params))


@app.get("/review", response_class=HTMLResponse)
def review_request(request: Request) -> str:
    params = dict(request.query_params)
    result = handle_action(params)
    ok = bool(result.get("ok"))
    approved = params.get("action", "").startswith("approve")
    print(f"[review] action={params.get('action')} userId={params.get('userId')} result={result}")
    if ok:
        title = "تم قبول الطلب بنجاح ✅" if approved else "تم رفض الطلب ❌"
        message = "تم قبول الطلب بنجاح. يمكن للمستخدم الآن تسجيل الدخول." if approved else "تم رفض طلب الانضمام."
    else:
        title = "حدث خطأ"
        message = result.get("msg") or "تعذر تحديث الطلب."
    color = "#16a34a" if ok and approved else "#dc2626"
    return f"""<!doctype html>
<html lang="ar" dir="rtl">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;display:grid;min-height:100vh;place-items:center">
  <main style="background:white;border:1px solid #e5e7eb;border-radius:14px;padding:28px;max-width:520px;box-shadow:0 12px 34px rgba(15,23,42,.08);text-align:right">
    <h1 style="margin:0 0 10px;color:{color};font-size:24px">{title}</h1>
    <p style="margin:0;color:#334155;line-height:1.6">{message}</p>
  </main>
</body>
</html>"""


def handle_action(params: dict) -> dict:
    db = load_db()
    action = params.get("action", "")

    if action == "signIn":
        role = "teacher" if params.get("role") == "teacher" else params.get("role", "student")
        collection = user_collection_for_role(db, role)
        user = find_by_email(collection, params.get("email", ""))
        if not user:
            return {"ok": False, "msg": "Account not found."}
        if user.get("status") == "pending":
            return {"ok": False, "msg": "Account is pending admin review."}
        if user.get("status") in ("rejected", "inactive", "deleted"):
            return {"ok": False, "msg": "Account is not active."}
        expected_hash = user.get("passwordHash", "")
        request_hash = params.get("passwordHash", "")
        if expected_hash and request_hash and expected_hash != request_hash:
            return {"ok": False, "msg": "Invalid email or password."}
        user = dict(user)
        user["email"] = params.get("email") or user.get("email", "")
        user["role"] = role
        if role == "student":
            add_notif(
                db,
                "admin",
                "Student signed in",
                f"{user.get('name') or user.get('email') or 'A student'} signed in.",
                "student_signin",
            )
            save_db(db)
        return {"ok": True, "user": user}

    if action == "signUp":
        role = params.get("role", "student")
        email = str(params.get("email", "")).strip().lower()
        if not email:
            return {"ok": False, "msg": "Email is required."}
        if find_by_email(db["students"], email) or find_by_email(db["teachers"], email):
            return {"ok": False, "msg": "An account with this email already exists."}
        prefix = "TE" if role == "teacher" else "CR" if role == "creator" else "ST"
        code = f"{prefix}-{datetime.now().year}-{uuid_tail()}"
        auto_approve = False
        user = {
            "id": new_id("usr"),
            "name": params.get("name", ""),
            "email": email,
            "phone": params.get("phone", ""),
            "role": role,
            "status": "active" if auto_approve else "pending",
            "passwordHash": params.get("passwordHash", ""),
            "studentCode": code if role == "student" else "",
            "teacherCode": code if role in ("teacher", "creator") else "",
            "creatorCode": code if role == "creator" else "",
            "schoolId": params.get("schoolId") or params.get("school", ""),
            "class": params.get("class", ""),
            "section": params.get("section", ""),
            "joinedAt": now_iso(),
        }
        if role == "teacher":
            db["teachers"].append(user)
        else:
            db["students"].append(user)
        add_notif(
            db,
            "admin",
            "New student request" if role == "student" else "New user request",
            f"{user.get('name') or user.get('email') or 'A user'} created a {role} account.",
            "user_request",
        )
        save_db(db)
        approval_url = params.get("approvalBaseUrl", "")
        print(f"[signup] New {role}: {email} | approvalBaseUrl={approval_url!r}")
        mail_result = notify_admin_signup(user, approval_url)
        print(f"[signup] mail_result={mail_result}")
        if auto_approve:
            return {"ok": True, "user": public_user(user), "pending": False, "mail": mail_result}
        return {"ok": True, "user": public_user(user), "pending": True, "mail": mail_result, "msg": "Your request was sent for admin review."}

    if action == "getSchools":
        rows = [school for school in db["schools"] if school.get("status") != "deleted"]
        return list_response("schools", rows)

    if action == "createSchool":
        name = str(params.get("name", "")).strip()
        if not name:
            return {"ok": False, "msg": "School name is required"}
        school = {"id": new_id("sch"), "name": name, "city": params.get("city", ""), "type": params.get("type", "school"), "status": "active", "createdAt": now_iso(), "updatedAt": now_iso()}
        db["schools"].append(school)
        save_db(db)
        return {"ok": True, "data": school}

    if action == "updateSchool":
        school = find_by_id(db["schools"], params.get("schoolId", ""))
        if school:
            for field in ("name", "city", "type", "status"):
                if params.get(field) not in (None, ""):
                    school[field] = params[field]
            school["updatedAt"] = now_iso()
            save_db(db)
        return {"ok": True, "data": school}

    if action == "deleteSchool":
        db["schools"] = [school for school in db["schools"] if school.get("id") != params.get("schoolId")]
        save_db(db)
        return {"ok": True}

    if action == "getClasses":
        teacher_id = params.get("teacherId", "")
        rows = [row for row in db["classes"] if not teacher_id or row.get("teacherId") == teacher_id]
        return list_response("classes", rows)

    if action == "createClass":
        school = find_by_id(db["schools"], params.get("schoolId", ""))
        if not school:
            return {"ok": False, "msg": "School is required"}
        grade = str(params.get("grade") or params.get("name") or "").strip()
        section = str(params.get("section") or "").strip()
        class_name = f"{grade} {section}".strip()
        row = {
            "id": new_id("cls"),
            "teacherId": params.get("teacherId", ""),
            "teacherEmail": params.get("teacherEmail", ""),
            "name": class_name,
            "grade": grade,
            "schoolId": school["id"],
            "schoolName": school.get("name", ""),
            "section": section,
            "status": "active",
            "studentCount": 0,
            "createdAt": now_iso(),
            "updatedAt": now_iso(),
        }
        db["classes"].append(row)
        save_db(db)
        return {"ok": True, "data": row}

    if action == "updateClass":
        row = find_by_id(db["classes"], params.get("classId", ""))
        if not row:
            return {"ok": False, "msg": "Class not found"}
        for field in ("teacherId", "teacherEmail", "name", "grade", "section", "status"):
            if params.get(field) is not None:
                row[field] = params[field]
        row["updatedAt"] = now_iso()
        save_db(db)
        return {"ok": True, "data": row}

    if action == "deleteClass":
        db["classes"] = [row for row in db["classes"] if row.get("id") != params.get("classId")]
        save_db(db)
        return {"ok": True}

    if action == "getStudentsByClass":
        klass = find_by_id(db["classes"], params.get("classId", ""))
        rows = []
        if klass:
            rows = [
                student for student in db["students"]
                if student.get("schoolId") == klass.get("schoolId")
                and student.get("class") == klass.get("name")
                and not student.get("leftSchool")
            ]
        return list_response("students", rows)

    if action == "markStudentLeft":
        student = find_by_id(db["students"], params.get("studentId", ""))
        if student:
            student["leftSchool"] = as_bool(params.get("left"))
            save_db(db)
        return {"ok": True}

    if action == "getStudents":
        return list_response("students", db["students"])

    if action == "getTeachers":
        return list_response("teachers", db["teachers"])

    if action == "getCreators":
        rows = [user for user in db["students"] + db["teachers"] if user.get("role") == "creator"]
        return list_response("creators", rows)

    if action == "adminCreateUser":
        role = params.get("role", "student")
        prefix = "TE" if role == "teacher" else "CR" if role == "creator" else "ST"
        code = f"{prefix}-{datetime.now().year}-{uuid_tail()}"
        user = {
            "id": new_id("usr"),
            "name": params.get("name", ""),
            "email": params.get("email", ""),
            "passwordHash": params.get("passwordHash") or params.get("password", ""),
            "role": role,
            "status": "active",
            "studentCode": code if role == "student" else "",
            "teacherCode": code if role in ("teacher", "creator") else "",
            "schoolId": params.get("schoolId", ""),
            "class": params.get("class", ""),
            "section": params.get("section", ""),
        }
        if role == "teacher":
            db["teachers"].append(user)
        else:
            db["students"].append(user)
        save_db(db)
        return {"ok": True, "userCode": code, "user": user}

    if action == "adminSetUserStatus":
        uid = params.get("userId", "")
        status = params.get("status", "active")
        for collection in ("students", "teachers"):
            user = find_by_id(db[collection], uid)
            if user and status == "deleted":
                db[collection] = [row for row in db[collection] if row.get("id") != uid]
            elif user:
                user["status"] = status
        save_db(db)
        return {"ok": True}

    if action == "getChallenges":
        return list_response("challenges", db["challenges"])

    if action == "createChallenge":
        challenge = {
            "id": new_id("chal"),
            "key": params.get("key") or str(params.get("name", "challenge")).lower().replace(" ", "-"),
            "name": params.get("name", "New Challenge"),
            "description": params.get("description", ""),
            "coverImage": params.get("coverImage", ""),
            "href": params.get("href", ""),
            "steps": params.get("steps", "[]"),
            "status": params.get("status", "draft"),
            "createdAt": now_iso(),
            "publishedAt": "",
        }
        db["challenges"].append(challenge)
        save_db(db)
        return {"ok": True, "data": challenge, "challenge": challenge}

    if action == "updateChallenge":
        challenge = find_by_id(db["challenges"], params.get("challengeId", ""))
        if not challenge:
            return {"ok": False, "msg": "Challenge not found"}
        for field in ("key", "name", "description", "coverImage", "href", "steps", "status"):
            if params.get(field) is not None:
                challenge[field] = params[field]
        save_db(db)
        return {"ok": True, "data": challenge, "challenge": challenge}

    if action in ("publishChallenge", "unpublishChallenge"):
        challenge = find_by_id(db["challenges"], params.get("challengeId", ""))
        if not challenge:
            return {"ok": False, "msg": "Challenge not found"}
        challenge["status"] = "published" if action == "publishChallenge" else "draft"
        challenge["publishedAt"] = now_iso() if action == "publishChallenge" else ""
        save_db(db)
        return {"ok": True, "data": challenge, "challenge": challenge}

    if action == "deleteChallenge":
        db["challenges"] = [row for row in db["challenges"] if row.get("id") != params.get("challengeId")]
        save_db(db)
        return {"ok": True}

    if action in ("getAssignments", "adminGetAllAssignments"):
        rows = decorate_assignments(db, "" if action == "adminGetAllAssignments" else params.get("teacherId", ""))
        return list_response("assignments", rows)

    if action == "assignChallenge":
        challenge = next((row for row in db["challenges"] if row.get("key") == params.get("challengeKey") or row.get("id") == params.get("challengeId")), None)
        klass = find_by_id(db["classes"], params.get("classId", ""))
        if not challenge or not klass:
            return {"ok": False, "msg": "Class and challenge are required"}
        assignment = {
            "id": new_id("asg"),
            "teacherId": params.get("teacherId", ""),
            "classId": klass["id"],
            "className": klass.get("name", ""),
            "challengeKey": challenge.get("key", ""),
            "challengeName": challenge.get("name", ""),
            "challengeHref": challenge.get("href", ""),
            "expiresAt": params.get("expiresAt", ""),
            "createdAt": now_iso(),
        }
        db["assignments"].append(assignment)
        students = [student for student in db["students"] if student.get("class") == klass.get("name") and student.get("schoolId") == klass.get("schoolId")]
        for student in students:
            db["codes"].append({"id": new_id("code"), "assignmentId": assignment["id"], "studentId": student["id"], "studentEmail": student.get("email", ""), "studentName": student.get("name", ""), "code": new_id("CQ").upper(), "startedAt": "", "submittedAt": "", "status": "assigned", "teacherNote": "", "createdAt": now_iso()})
        save_db(db)
        return {"ok": True, "assignmentId": assignment["id"], "total": len(students)}

    if action == "getSubmissionsByAssignment":
        rows = submissions_for_assignment(db, params.get("assignmentId", ""))
        return list_response("submissions", rows)

    if action in ("approveSubmissionTeacher", "rejectSubmissionTeacher"):
        code = find_by_id(db["codes"], params.get("codeId", ""))
        if code:
            code["status"] = "approved" if action == "approveSubmissionTeacher" else "rejected"
            code["teacherNote"] = params.get("note", "")
            save_db(db)
        return {"ok": True}

    if action == "validateCode":
        code = next((row for row in db["codes"] if row.get("code") == params.get("code")), None)
        return {"ok": bool(code), "data": code, "code": code, "msg": "" if code else "Code not found"}

    if action == "startChallenge":
        code = find_by_id(db["codes"], params.get("codeId", ""))
        if code:
            code["status"] = "started"
            code["startedAt"] = code.get("startedAt") or now_iso()
            save_db(db)
        return {"ok": True, "data": code}

    if action == "submitChallengeCode":
        code = find_by_id(db["codes"], params.get("codeId", ""))
        if code:
            code["status"] = "submitted"
            code["submittedAt"] = now_iso()
            save_db(db)
        return {"ok": True, "data": code}

    if action in ("getTeacherNotifs", "getStudentNotifs", "getAdminNotifs"):
        if action == "getAdminNotifs":
            rows = [row for row in db["notifs"] if row.get("userId") in ("admin", "")]
            return list_response("notifs", rows)
        user_id = params.get("teacherId") or params.get("studentId") or params.get("userId") or ""
        rows = [row for row in db["notifs"] if not user_id or row.get("userId") == user_id]
        return list_response("notifs", rows)

    if action == "markNotifRead":
        for notif in db["notifs"]:
            if as_bool(params.get("all")) or notif.get("id") == params.get("notifId"):
                notif["read"] = True
                notif["readAt"] = now_iso()
        save_db(db)
        return {"ok": True}

    if action == "addAchievement":
        achievement = {"id": new_id("ach"), "teacherId": params.get("teacherId", ""), "studentId": params.get("studentId", ""), "studentName": params.get("studentName", ""), "schoolId": params.get("schoolId", ""), "text": params.get("text", ""), "badge": params.get("badge", "star"), "createdAt": now_iso()}
        db["achievements"].insert(0, achievement)
        save_db(db)
        return {"ok": True, "data": achievement}

    if action == "getAchievements":
        return list_response("achievements", db["achievements"])

    if action == "getWinners":
        approved = [row for row in db["codes"] if row.get("status") == "approved"]
        return {"ok": True, "local": approved[:10], "global": approved[:10]}

    if action in ("approveTeacher", "rejectTeacher", "approveStudent", "rejectStudent", "approveCreator", "rejectCreator"):
        if "Teacher" in action:
            role = "teacher"
        elif "Creator" in action:
            role = "creator"
        else:
            role = "student"
        user = find_user_for_review(db, role, params.get("userId", ""))
        if not user:
            return {"ok": False, "msg": "Request not found."}
        approved = action.startswith("approve")
        user["status"] = "active" if approved else "rejected"
        user["reviewedAt"] = now_iso()
        mark_admin_request_notifs_read(db, user)
        user_name = user.get("name") or user.get("email") or "المستخدم"
        role_label = {"teacher": "المعلم", "creator": "المبتكر"}.get(role, "الطالب")
        if approved:
            add_notif(db, user.get("id", ""), "تم قبول طلبك", "تم قبول طلب انضمامك بنجاح. يمكنك الآن تسجيل الدخول.", "account_status")
            add_notif(db, "admin", "تم قبول طلب الانضمام بنجاح", f"تم قبول طلب {role_label} {user_name} بنجاح.", "user_request")
        else:
            add_notif(db, user.get("id", ""), "تم رفض طلبك", "نأسف، تم رفض طلب انضمامك.", "account_status")
            add_notif(db, "admin", "تم رفض طلب الانضمام", f"تم رفض طلب {role_label} {user_name}.", "user_request")
        save_db(db)
        return {"ok": True, "user": user}

    if action in ("changePassword", "reopenChallenge", "assignTeacherSchool", "removeTeacherSchool"):
        return {"ok": True}

    if action == "getTeacherSchools":
        return {"ok": True, "data": [], "schools": []}

    if action == "importUsers":
        return {"ok": True, "added": 0, "skipped": 0, "errors": []}

    return {"ok": True, "data": []}


def uuid_tail() -> str:
    return uuid4().hex[:4].upper()
