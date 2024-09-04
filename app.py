from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import LLM_model
from dotenv import load_dotenv
import os
import uuid

load_dotenv()
MODEL_NAME_TAG = os.getenv("MODEL_NAME_TAG")
MODEL_SYSTEM_PROMPT = os.getenv("MODEL_SYSTEM_PROMPT")

app = Flask(__name__, static_url_path="/static")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///chatbot.db"
db = SQLAlchemy(app)


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    sender = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    session_id = db.Column(db.String(50), nullable=False)


class ChatSession(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    model = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used = db.Column(db.DateTime, default=datetime.utcnow)


def get_or_create_latest_session(model_name):
    latest_session = (
        ChatSession.query.filter_by(model=model_name)
        .order_by(ChatSession.last_used.desc())
        .first()
    )
    if not latest_session:
        new_session = ChatSession(id=str(uuid.uuid4()), model=model_name)
        db.session.add(new_session)
        db.session.commit()
        return new_session
    return latest_session


@app.route("/")
def index():
    return render_template("/index.html", model_name=MODEL_NAME_TAG)


@app.route("/api/send_message", methods=["POST"])
def send_message():
    data = request.json
    user_message = data["message"]
    session_id = data["session_id"]

    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Invalid session"}), 400

    session.last_used = datetime.utcnow()
    user_msg = Message(content=user_message, sender="user", session_id=session_id)
    db.session.add(user_msg)

    messages = (
        Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
    )
    context = [{"system": MODEL_SYSTEM_PROMPT}] + [
        {"user" if msg.sender == "user" else "assistant": msg.content}
        for msg in messages
    ]

    model_response = LLM_model.get_response(context, session.model)

    model_msg = Message(
        content=model_response, sender="assistant", session_id=session_id
    )
    db.session.add(model_msg)
    db.session.commit()

    return jsonify(
        {"model_response": model_response, "timestamp": model_msg.timestamp.isoformat()}
    )


@app.route("/api/get_chat_history", methods=["GET"])
def get_chat_history():
    session_id = request.args.get("session_id")
    messages = (
        Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
    )
    return jsonify(
        [
            {
                "content": msg.content,
                "sender": msg.sender,
                "timestamp": msg.timestamp.isoformat(),
            }
            for msg in messages
        ]
    )


@app.route("/api/get_all_sessions", methods=["GET"])
def get_all_sessions():
    sessions = ChatSession.query.order_by(ChatSession.last_used.desc()).all()
    return jsonify(
        [
            {
                "id": session.id,
                "model": session.model,
                "created_at": session.created_at.isoformat(),
                "last_used": session.last_used.isoformat(),
            }
            for session in sessions
        ]
    )


@app.route("/api/create_chat_session", methods=["POST"])
def create_chat_session():
    model = request.json.get("model", MODEL_NAME_TAG)
    new_session = ChatSession(id=str(uuid.uuid4()), model=model)
    db.session.add(new_session)
    db.session.commit()
    return jsonify(
        {
            "id": new_session.id,
            "model": new_session.model,
            "created_at": new_session.created_at.isoformat(),
            "last_used": new_session.last_used.isoformat(),
        }
    )


@app.route("/api/get_latest_session", methods=["GET"])
def get_latest_session():
    model = request.args.get("model", MODEL_NAME_TAG)
    session = get_or_create_latest_session(model)
    return jsonify(
        {
            "id": session.id,
            "model": session.model,
            "created_at": session.created_at.isoformat(),
            "last_used": session.last_used.isoformat(),
        }
    )


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
