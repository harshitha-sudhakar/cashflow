import datetime as dt
from firebase_client import db

def load_income(user_id: str):
    docs = db.collection("incomeEvents").where("userId", "==", user_id).stream()
    return [d.to_dict() for d in docs]

def load_obligations(user_id: str):
    docs = db.collection("obligations").where("userId", "==", user_id).stream()
    return [d.to_dict() for d in docs]

def project_balance(user_id: str, starting_balance: float, horizon_days: int = 30):
    income = load_income(user_id)
    obligations = load_obligations(user_id)
    today = dt.date.today()

    running_balance = starting_balance
    daily_projection = []
    shortfalls = []

    for i in range(horizon_days):
        day = today + dt.timedelta(days=i)
        day_str = day.isoformat()

        day_income = sum(
            e["amount"] * (e["confidence"] if e["status"] == "pledged" else 1)
            for e in income
            if e.get("expectedDate", "").startswith(day_str) and e["status"] in ("confirmed", "pledged")
        )
        day_obligations = sum(
            o["amount"] for o in obligations
            if o.get("dueDate", "").startswith(day_str)
        )

        running_balance += day_income - day_obligations
        # Simple confidence band for now: widen by 15% of pledged income - swap in
        # the quantile regression model once there's enough historical data.
        uncertainty = 0.15 * sum(
            e["amount"] for e in income
            if e.get("expectedDate", "").startswith(day_str) and e["status"] == "pledged"
        )

        daily_projection.append({
            "date": day_str,
            "projectedBalance": running_balance,
            "confidenceLow": running_balance - uncertainty,
            "confidenceHigh": running_balance + uncertainty,
        })

        if running_balance - uncertainty < 0:
            shortfalls.append({
                "date": day_str,
                "shortfallAmount": abs(running_balance - uncertainty),
                "contributingObligations": [],
            })

    forecast = {
        "userId": user_id,
        "generatedAt": dt.datetime.now().isoformat(),
        "horizonDays": horizon_days,
        "dailyProjection": daily_projection,
        "shortfallDates": shortfalls,
    }

    db.collection("forecasts").document(user_id).set(forecast)
    return forecast


if __name__ == "__main__":
    result = project_balance("harshitha", starting_balance=100.0, horizon_days=30)
    print(f"Generated forecast with {len(result['shortfallDates'])} shortfall day(s)")
    for s in result["shortfallDates"]:
        print(f"  {s['date']}: short by ~${s['shortfallAmount']:.2f}")