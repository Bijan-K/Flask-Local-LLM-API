from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import LLM_model

app = Flask(__name__, static_url_path="/static")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///chatbot.db"
db = SQLAlchemy(app)


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    sender = db.Column(db.String(50), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    model = db.Column(db.String(50), nullable=False)


@app.route("/")
def index():
    return render_template("/index.html")


@app.route("/api/send_message", methods=["POST"])
def send_message():
    data = request.json
    user_message = data["message"]
    model_name = data["model"]

    # Save user message
    user_msg = Message(content=user_message, sender="user", model=model_name)
    db.session.add(user_msg)
    db.session.commit()

    # THE ANSWER TO THE POSTED TEXT
    # Get conversation context
    context = get_conversation_context(model_name)

    # Get model response
    model_response = LLM_model.get_response(context, model_name)

    # Save model response
    model_msg = Message(content=model_response, sender="model", model=model_name)
    db.session.add(model_msg)
    db.session.commit()

    return jsonify(
        {"model_response": model_response, "timestamp": model_msg.timestamp.isoformat()}
    )


@app.route("/api/get_chat_history", methods=["GET"])
def get_chat_history():
    model_name = request.args.get("model")
    messages = (
        Message.query.filter_by(model=model_name).order_by(Message.timestamp).all()
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


def get_conversation_context(model_name):
    messages = (
        Message.query.filter_by(model=model_name).order_by(Message.timestamp).all()
    )
    # Add your system message here
    context = [{"system": "You are a helpful assistant."}]
    for msg in messages:
        context.append({msg.sender: msg.content})
    return context


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
