import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_URL = "http://localhost:5000"
AI_URL = "http://localhost:8000"


def request_json(url, payload=None):
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST" if data is not None else "GET",
    )
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def check(name, url, payload, validate):
    result = request_json(url, payload)
    if not validate(result):
        raise RuntimeError(f"{name} returned an unexpected response: {result}")
    print(f"PASS: {name}")
    return result


def main():
    print("Running read-only PlaceIQ AI service smoke checks...")
    check("Backend health", f"{API_URL}/", None, lambda data: "PlaceIQ" in data.get("message", ""))
    check("AI service health", f"{AI_URL}/health", None, lambda data: data.get("status") == "ok")

    readiness = check(
        "Readiness scoring",
        f"{AI_URL}/calculate-readiness",
        {"skills": ["Python", "React", "SQL"], "resume_word_count": 450, "cgpa": 8.5, "coding_score": 75},
        lambda data: isinstance(data.get("readiness_score"), (int, float))
        and 0 <= data["readiness_score"] <= 100,
    )
    print(f"  Score: {readiness['readiness_score']}/100")

    check(
        "Role skill-gap analysis",
        f"{AI_URL}/analyze-gaps",
        {"user_skills": ["Python", "SQL"], "target_role": "Full Stack Developer"},
        lambda data: 0 <= data.get("match_percentage", -1) <= 100
        and isinstance(data.get("missing_skills"), list),
    )
    check(
        "Interview feedback analysis",
        f"{AI_URL}/analyze-feedback",
        {"text": "The candidate showed excellent communication and structured problem solving."},
        lambda data: isinstance(data.get("competencies"), list)
        and isinstance(data.get("summary"), str),
    )

    embedding = [0.1] * 384
    matches = check(
        "Candidate ranking",
        f"{AI_URL}/match-candidates",
        {
            "job_jd": {
                "id": "smoke-job",
                "title": "Backend Engineer",
                "description": "Build APIs with Python and SQL.",
                "required_skills": ["Python", "SQL"],
            },
            "candidates": [{
                "id": "smoke-candidate",
                "name": "Smoke Test Candidate",
                "skills": ["Python", "SQL"],
                "embedding": embedding,
                "readiness_score": 85,
            }],
        },
        lambda data: isinstance(data, list)
        and all(0 <= item.get("score", -1) <= 100 for item in data),
    )
    print(f"  Ranked candidates: {len(matches)}")
    print("Smoke checks passed. No Firebase users or application data were changed.")


if __name__ == "__main__":
    try:
        main()
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, RuntimeError) as error:
        print(f"Smoke check failed: {error}", file=sys.stderr)
        sys.exit(1)
