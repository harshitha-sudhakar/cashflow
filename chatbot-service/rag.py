import os
import json
from firebase_client import db
from forecast import get_seasonal_aggregates, load_income, load_obligations


def _record_to_text(record: dict, kind: str) -> str:
    if kind == "income":
        source = record.get("source", "unknown")
        amount = record.get("amount", 0)
        status = record.get("status") or record.get("certainty", "unknown")
        date = record.get("expectedDate", "unknown date")
        excluded = record.get("excludedFromForecast", False)
        extra = " (excluded from forecast)" if excluded else ""
        return f"${amount:.2f} from {source}, {status}, logged {date}{extra}"
    else:
        name = record.get("name", "unknown")
        amount = record.get("amount", 0)
        date = record.get("dueDate", "unknown date")
        recurring = "recurring" if record.get("recurring") else "one-time"
        return f"${amount:.2f} for {name}, {recurring}, due {date}"


def _build_context(user_id: str, question: str, top_k: int = 8) -> str:
    income = load_income(user_id)
    obligations = load_obligations(user_id)
    aggregates = get_seasonal_aggregates(user_id)

    all_records = []
    for r in income:
        all_records.append((_record_to_text(r, "income"), "income"))
    for r in obligations:
        all_records.append((_record_to_text(r, "obligation"), "obligation"))

    question_lower = question.lower()
    scored = []
    for text, kind in all_records:
        score = sum(1 for word in question_lower.split() if word in text.lower())
        scored.append((score, text, kind))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_records = [text for _, text, _ in scored[:top_k]]

    agg_text = json.dumps(aggregates, indent=2)
    records_text = "\n".join(f"- {r}" for r in top_records) if top_records else "No records found."

    return f"""Seasonal aggregates (computed averages per source):
{agg_text}

Most relevant records:
{records_text}"""


def _call_llm(question: str, context: str) -> str:
    provider = os.environ.get("LLM_PROVIDER", "openai")

    system_prompt = (
        "You are a helpful financial data assistant. Answer questions based ONLY on the "
        "provided context about the user's logged income and obligations. Be factual and neutral — "
        "do not give financial advice, judgments, or recommendations. If the data is insufficient, say so."
    )
    user_prompt = f"Context:\n{context}\n\nQuestion: {question}"

    if provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        message = client.messages.create(
            model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5"),
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text

    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = client.chat.completions.create(
        model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=1024,
    )
    return response.choices[0].message.content


def answer_question(user_id: str, question: str) -> str:
    context = _build_context(user_id, question)

    if not os.environ.get("OPENAI_API_KEY") and not os.environ.get("ANTHROPIC_API_KEY"):
        return (
            f"Based on your logged data:\n\n{context}\n\n"
            "(Set OPENAI_API_KEY or ANTHROPIC_API_KEY in chatbot-service/.env for LLM-powered answers.)"
        )

    return _call_llm(question, context)
