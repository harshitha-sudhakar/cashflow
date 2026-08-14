from flask import Flask, request, jsonify
from flask_cors import CORS
from forecast import project_balance, simulate_projection, load_user_settings

app = Flask(__name__)
CORS(app)


@app.route("/generate-forecast", methods=["POST"])
def generate_forecast():
    data = request.get_json()
    user_id = data.get("userId")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400

    settings = load_user_settings(user_id)
    horizon_days = data.get("horizonDays", settings.get("forecastHorizonDays", 30))

    result = project_balance(user_id, horizon_days=horizon_days)
    return jsonify({
        "shortfallCount": len(result["shortfallDates"]),
        "startingBalance": result["startingBalance"],
        "horizonDays": result["horizonDays"],
    })


@app.route("/simulate", methods=["POST"])
def simulate():
    data = request.get_json()
    user_id = data.get("userId")
    hypothetical = data.get("hypothetical")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400
    if not hypothetical:
        return jsonify({"error": "hypothetical entry is required"}), 400

    settings = load_user_settings(user_id)
    horizon_days = data.get("horizonDays", settings.get("forecastHorizonDays", 30))

    result = simulate_projection(user_id, hypothetical, horizon_days=horizon_days)
    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5001)
