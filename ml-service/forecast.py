import sys
import datetime as dt
from collections import defaultdict
from statistics import mean, pstdev
from firebase_client import db


def load_income(user_id: str):
    docs = db.collection("incomeEvents").where("userId", "==", user_id).stream()
    return [d.to_dict() for d in docs]


def load_obligations(user_id: str):
    docs = db.collection("obligations").where("userId", "==", user_id).stream()
    return [d.to_dict() for d in docs]


def load_accounts_balance(user_id: str) -> float:
    docs = db.collection("accounts").where("userId", "==", user_id).stream()
    return sum(float(d.to_dict().get("balance", 0)) for d in docs)


def load_user_settings(user_id: str) -> dict:
    doc = db.collection("userSettings").document(user_id).get()
    if doc.exists:
        return doc.to_dict()
    return {"forecastHorizonDays": 30, "comfortBuffer": 0}


def _certainty_weight(record: dict) -> float:
    certainty = record.get("certainty") or record.get("status") or "confirmed"
    return {
        "confirmed": 1.0,
        "likely": 0.7,
        "speculative": 0.35,
        "historical": 1.0,
    }.get(certainty, 1.0)


def _month_key(date_value: dt.date) -> int:
    return date_value.month


def _seasonal_amount(record: dict, date_field: str, amount_field: str, history_by_name: dict) -> float:
    amount = float(record.get(amount_field, 0))
    record_date = dt.date.fromisoformat(record[date_field])
    name = record.get("source") or record.get("name") or ""
    monthly_history = history_by_name.get(name, {}).get(_month_key(record_date), [])

    if len(monthly_history) >= 2:
        return mean(monthly_history)

    all_history = [value for month_values in history_by_name.get(name, {}).values() for value in month_values]
    if len(all_history) >= 2:
        return mean(all_history)

    return amount


def _seasonal_spread(record: dict, date_field: str, history_by_name: dict) -> float:
    name = record.get("source") or record.get("name") or ""
    try:
        record_date = dt.date.fromisoformat(record[date_field])
    except ValueError:
        return 0.0

    month_history = history_by_name.get(name, {}).get(_month_key(record_date), [])
    all_history = [value for month_values in history_by_name.get(name, {}).values() for value in month_values]
    sample = month_history if len(month_history) >= 2 else all_history

    return pstdev(sample) if len(sample) >= 2 else 0.0


def _build_history(records: list, date_field: str, amount_field: str):
    history_by_name = defaultdict(lambda: defaultdict(list))
    for record in records:
        if date_field not in record or amount_field not in record:
            continue

        try:
            record_date = dt.date.fromisoformat(record[date_field])
        except ValueError:
            continue

        name = record.get("source") or record.get("name") or ""
        history_by_name[name][_month_key(record_date)].append(float(record[amount_field]))

    return history_by_name


def get_seasonal_aggregates(user_id: str) -> dict:
    income = load_income(user_id)
    obligations = load_obligations(user_id)
    income_history = _build_history(income, "expectedDate", "amount")
    obligation_history = _build_history(obligations, "dueDate", "amount")

    aggregates = {"income": {}, "obligations": {}}

    for record in income:
        name = record.get("source", "")
        if not name:
            continue
        date_field = "expectedDate"
        if date_field not in record:
            continue
        try:
            record_date = dt.date.fromisoformat(record[date_field])
        except ValueError:
            continue
        seasonal = _seasonal_amount(record, date_field, "amount", income_history)
        month = _month_key(record_date)
        if name not in aggregates["income"]:
            aggregates["income"][name] = {"monthlyAverage": {}, "overallAverage": seasonal}
        aggregates["income"][name]["monthlyAverage"][month] = seasonal

    for record in obligations:
        name = record.get("name", "")
        if not name:
            continue
        date_field = "dueDate"
        if date_field not in record:
            continue
        try:
            record_date = dt.date.fromisoformat(record[date_field])
        except ValueError:
            continue
        seasonal = _seasonal_amount(record, date_field, "amount", obligation_history)
        month = _month_key(record_date)
        if name not in aggregates["obligations"]:
            aggregates["obligations"][name] = {"monthlyAverage": {}, "overallAverage": seasonal}
        aggregates["obligations"][name]["monthlyAverage"][month] = seasonal

    return aggregates


def _expand_recurring(records: list, date_field: str, horizon_days: int, interval: str) -> list:
    """
    A record with recurring=True only ever has ONE stored date. Without this,
    the forecast only ever counts it once and the rest of the horizon is flat.
    This generates the future occurrences within the horizon so recurring
    income/obligations actually show up on every date they'd realistically land.

    interval="monthly" -> same day-of-month, used for obligations (bills, rent)
    interval="weekly"  -> same day-of-week, used for income (e.g. "every weekend" gig work)
    """
    today = dt.date.today()
    horizon_end = today + dt.timedelta(days=horizon_days)
    expanded = []

    for record in records:
        expanded.append(record)
        if not record.get("recurring"):
            continue
        if date_field not in record:
            continue
        try:
            anchor_date = dt.date.fromisoformat(record[date_field])
        except ValueError:
            continue

        occurrence = anchor_date
        while True:
            if interval == "monthly":
                month = occurrence.month + 1
                year = occurrence.year + (month - 1) // 12
                month = (month - 1) % 12 + 1
                day = min(anchor_date.day, 28)  # avoid month-length edge cases
                occurrence = dt.date(year, month, day)
            else:
                occurrence = occurrence + dt.timedelta(days=7)

            if occurrence > horizon_end:
                break
            if occurrence < today:
                continue

            clone = dict(record)
            clone[date_field] = occurrence.isoformat()
            expanded.append(clone)

    return expanded


def _compute_projection(
    income: list,
    obligations: list,
    starting_balance: float,
    horizon_days: int,
    extra_income: list | None = None,
    extra_obligations: list | None = None,
):
    today = dt.date.today()
    expanded_income = _expand_recurring(income, "expectedDate", horizon_days, interval="weekly")
    expanded_obligations = _expand_recurring(obligations, "dueDate", horizon_days, interval="monthly")
    all_income = expanded_income + (extra_income or [])
    all_obligations = expanded_obligations + (extra_obligations or [])
    income_history = _build_history(income, "expectedDate", "amount")
    obligation_history = _build_history(obligations, "dueDate", "amount")

    running_balance = starting_balance
    daily_projection = []
    shortfalls = []
    active_days = 0

    for i in range(horizon_days):
        day = today + dt.timedelta(days=i)
        day_str = day.isoformat()

        day_income = 0.0
        day_income_uncertainty = 0.0
        for record in all_income:
            if record.get("expectedDate", "") != day_str:
                continue
            if record.get("excludedFromForecast"):
                continue
            projected_amount = _seasonal_amount(record, "expectedDate", "amount", income_history)
            certainty_weight = _certainty_weight(record)
            day_income += projected_amount * certainty_weight
            day_income_uncertainty += abs(projected_amount) * (1 - certainty_weight)
            day_income_uncertainty += _seasonal_spread(record, "expectedDate", income_history)

        day_obligations = 0.0
        day_obligation_uncertainty = 0.0
        for record in all_obligations:
            if record.get("dueDate", "") != day_str:
                continue
            if record.get("excludedFromForecast"):
                continue
            projected_amount = _seasonal_amount(record, "dueDate", "amount", obligation_history)
            day_obligations += projected_amount
            day_obligation_uncertainty += abs(projected_amount) * (1 - _certainty_weight(record))
            day_obligation_uncertainty += _seasonal_spread(record, "dueDate", obligation_history)

        if day_income != 0 or day_obligations != 0:
            active_days += 1

        running_balance += day_income - day_obligations
        uncertainty = max(
            0.1 * abs(running_balance),
            day_income_uncertainty + day_obligation_uncertainty,
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

    diagnostics = {
        "totalIncomeRecords": len(income),
        "totalObligationRecords": len(obligations),
        "expandedIncomeOccurrences": len(all_income),
        "expandedObligationOccurrences": len(all_obligations),
        "activeDaysInHorizon": active_days,
    }

    return daily_projection, shortfalls, diagnostics


def project_balance(user_id: str, horizon_days: int = 30):
    income = load_income(user_id)
    obligations = load_obligations(user_id)
    starting_balance = load_accounts_balance(user_id)

    daily_projection, shortfalls, diagnostics = _compute_projection(
        income, obligations, starting_balance, horizon_days
    )

    forecast = {
        "userId": user_id,
        "generatedAt": dt.datetime.now().isoformat(),
        "horizonDays": horizon_days,
        "startingBalance": starting_balance,
        "dailyProjection": daily_projection,
        "shortfallDates": shortfalls,
        "diagnostics": diagnostics,
    }

    db.collection("forecasts").document(user_id).set(forecast)
    return forecast


def simulate_projection(user_id: str, hypothetical: dict, horizon_days: int = 30):
    income = load_income(user_id)
    obligations = load_obligations(user_id)
    starting_balance = load_accounts_balance(user_id)

    extra_income = []
    extra_obligations = []

    h_type = hypothetical.get("type")
    amount = float(hypothetical.get("amount", 0))
    date = hypothetical.get("date", "")
    name = hypothetical.get("name", "Hypothetical")

    if h_type == "income":
        extra_income.append({
            "source": name,
            "amount": amount,
            "expectedDate": date,
            "status": "confirmed",
            "certainty": "confirmed",
        })
    elif h_type == "expense":
        extra_obligations.append({
            "name": name,
            "amount": amount,
            "dueDate": date,
            "status": "upcoming",
            "certainty": "confirmed",
        })

    daily_projection, shortfalls, diagnostics = _compute_projection(
        income, obligations, starting_balance, horizon_days,
        extra_income=extra_income, extra_obligations=extra_obligations,
    )

    return {
        "horizonDays": horizon_days,
        "startingBalance": starting_balance,
        "dailyProjection": daily_projection,
        "shortfallDates": shortfalls,
        "diagnostics": diagnostics,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 forecast.py <your-firebase-uid> [horizon_days]")
        print("Find your UID in Firebase Console -> Authentication -> Users table.")
        sys.exit(1)

    user_id = sys.argv[1]
    horizon = int(sys.argv[2]) if len(sys.argv) > 2 else 30

    result = project_balance(user_id, horizon_days=horizon)
    print(f"Generated forecast for {user_id} with {len(result['shortfallDates'])} shortfall day(s)")
    print(f"Starting balance from accounts: ${result['startingBalance']:.2f}")
    d = result["diagnostics"]
    print(f"Income records logged: {d['totalIncomeRecords']} (expanded to {d['expandedIncomeOccurrences']} occurrences with recurrence)")
    print(f"Obligation records logged: {d['totalObligationRecords']} (expanded to {d['expandedObligationOccurrences']} occurrences with recurrence)")
    print(f"Days within the {horizon}-day horizon with any activity: {d['activeDaysInHorizon']}")
    if d["activeDaysInHorizon"] == 0:
        print("^ This is why the chart is flat: none of your logged dates fall within the forecast window.")
        print("  Check that your income/obligation dates are today or in the future, not in the past.")
    for s in result["shortfallDates"]:
        print(f"  {s['date']}: short by ~${s['shortfallAmount']:.2f}")
