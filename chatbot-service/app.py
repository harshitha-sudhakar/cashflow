import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml-service"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "ml-service", ".env"))

from flask import Flask, request, jsonify
from flask_cors import CORS
from rag import answer_question

app = Flask(__name__)
CORS(app)


@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    user_id = data.get("userId")
    question = data.get("question")

    if not user_id:
        return jsonify({"error": "userId is required"}), 400
    if not question:
        return jsonify({"error": "question is required"}), 400

    try:
        answer = answer_question(user_id, question)
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5002)
