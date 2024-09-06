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
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_used = db.Column(db.DateTime, default=datetime.utcnow)


def get_or_create_latest_session(model_name):
    latest_session = (
        ChatSession.query.filter_by(model=model_name)
        .order_by(ChatSession.last_used.desc())
        .first()
    )
    if not latest_session:
        new_session = ChatSession(
            id=str(uuid.uuid4()),
            model=model_name,
            name=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        )
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
    if not session or session.model != MODEL_NAME_TAG:
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
        {
            "user_msg_id": user_msg.id,
            "model_msg_id": model_msg.id,
            "model_response": model_response,
            "timestamp": model_msg.timestamp.isoformat(),
        }
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
                "id": msg.id,
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
                "name": session.name,
                "created_at": session.created_at.isoformat(),
                "last_used": session.last_used.isoformat(),
            }
            for session in sessions
        ]
    )


@app.route("/api/create_chat_session", methods=["POST"])
def create_chat_session():
    model = request.json.get("model")
    if model != MODEL_NAME_TAG:
        return jsonify({"error": "Invalid model"}), 400
    new_session = ChatSession(
        id=str(uuid.uuid4()),
        model=model,
        name=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
    )
    db.session.add(new_session)
    db.session.commit()
    return jsonify(
        {
            "id": new_session.id,
            "model": new_session.model,
            "name": new_session.name,
            "created_at": new_session.created_at.isoformat(),
            "last_used": new_session.last_used.isoformat(),
        }
    )


@app.route("/api/get_latest_session", methods=["GET"])
def get_latest_session():
    model = request.args.get("model", MODEL_NAME_TAG)
    if model != MODEL_NAME_TAG:
        return jsonify({"error": "Invalid model"}), 400
    session = get_or_create_latest_session(model)
    return jsonify(
        {
            "id": session.id,
            "model": session.model,
            "name": session.name,
            "created_at": session.created_at.isoformat(),
            "last_used": session.last_used.isoformat(),
        }
    )


@app.route("/api/delete_message", methods=["POST"])
def delete_message():
    data = request.json

    message_id = data["message_id"]
    session_id = data["session_id"]

    message = Message.query.get(message_id)
    if not message or message.session_id != session_id:
        return jsonify({"error": "Invalid message"}), 400

    # Delete this message and all subsequent messages in the session
    Message.query.filter(
        Message.session_id == session_id, Message.timestamp >= message.timestamp
    ).delete()

    db.session.commit()
    return jsonify({"success": True})


@app.route("/api/edit_message", methods=["POST"])
def edit_message():
    data = request.json
    message_id = data["message_id"]
    new_content = data["new_content"]
    session_id = data["session_id"]

    message = Message.query.get(message_id)

    if not message or message.session_id != session_id or message.sender != "user":
        return jsonify({"error": "Invalid message"}), 400

    # Delete all subsequent messages in the session
    Message.query.filter(
        Message.session_id == session_id, Message.timestamp >= message.timestamp
    ).delete()

    # Update the message content
    user_msg = Message(content=new_content, sender="user", session_id=session_id)
    db.session.add(user_msg)

    db.session.commit()

    # Get updated context and generate new response
    messages = (
        Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
    )
    context = [{"system": MODEL_SYSTEM_PROMPT}] + [
        {"user" if msg.sender == "user" else "assistant": msg.content}
        for msg in messages
    ]

    model_response = LLM_model.get_response(context, MODEL_NAME_TAG)

    model_msg = Message(
        content=model_response, sender="assistant", session_id=session_id
    )
    db.session.add(model_msg)
    db.session.commit()

    return jsonify(
        {
            "success": True,
            "model_response": model_response,
            "timestamp": model_msg.timestamp.isoformat(),
        }
    )


@app.route("/api/edit_session_name", methods=["POST"])
def edit_session_name():
    data = request.json
    session_id = data["session_id"]
    new_name = data["new_name"]

    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Invalid session"}), 400

    session.name = new_name
    db.session.commit()

    return jsonify({"success": True, "new_name": new_name})


@app.route("/api/delete_session", methods=["POST"])
def delete_session():
    data = request.json
    session_id = data["session_id"]

    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Invalid session"}), 400

    # Delete all messages in the session
    Message.query.filter_by(session_id=session_id).delete()

    # Delete the session
    db.session.delete(session)
    db.session.commit()

    return jsonify({"success": True})


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
