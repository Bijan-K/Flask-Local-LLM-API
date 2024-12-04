from flask import Blueprint, request, jsonify, render_template
from app import db
from app.models import Message, ChatSession
from app.utils import get_or_create_latest_session
import app.LLM_model as LLM_model
from datetime import datetime
import uuid

from functools import wraps
import asyncio

bp = Blueprint("routes", __name__)

model_name = "PHI-3"
model_system_prompt = "You are a helpful assistant."


@bp.route("/")
def index():
    """
    Renders the main index page.

    Returns:
    - HTML template (index.html) with the current model name
    """
    return render_template("index.html", model_name=model_name)


def async_route(f):
    @wraps(f)
    def wrapped(*args, **kwargs):
        return asyncio.run(f(*args, **kwargs))

    return wrapped


@bp.route("/api/send_message", methods=["POST"])
@async_route
async def send_message():
    """
    Handles sending a user message and generating an AI response.

    Expected JSON payload:
    {
        "message": string, user's message
        "session_id": string, current chat session ID
    }

    Returns:
    - JSON object with the following keys:
        - user_msg_id (int): Database ID of the user's message
        - model_msg_id (int): Database ID of the model's response
        - model_response (str): The generated AI response
        - timestamp (str): ISO formatted timestamp of the response
    """
    data = request.json
    user_message = data["message"]
    session_id = data["session_id"]

    session = ChatSession.query.get(session_id)
    if not session or session.model != model_name:
        return jsonify({"error": "Invalid session"}), 400

    session.last_used = datetime.utcnow()
    user_msg = Message(content=user_message, sender="user", session_id=session_id)
    db.session.add(user_msg)

    messages = (
        Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
    )
    context = [{"system": model_system_prompt}] + [
        {"user" if msg.sender == "user" else "assistant": msg.content}
        for msg in messages
    ]

    model_response = await LLM_model.get_response(context, session.model)

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


@bp.route("/api/get_chat_history", methods=["GET"])
def get_chat_history():
    """
    Retrieves the chat history for a specific session.

    Query Parameters:
    - session_id (str): ID of the chat session

    Returns:
    - JSON array of message objects, each containing:
        - id (int): Message database ID
        - content (str): Message content
        - sender (str): Message sender ('user' or 'assistant')
        - timestamp (str): ISO formatted message timestamp
    """
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


@bp.route("/api/get_all_sessions", methods=["GET"])
def get_all_sessions():
    """
    Retrieves all chat sessions, ordered by most recently used.

    Returns:
    - JSON array of session objects, each containing:
        - id (str): Session UUID
        - model (str): Model used in the session
        - name (str): Session name
        - created_at (str): ISO formatted session creation timestamp
        - last_used (str): ISO formatted timestamp of last session use
    """
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


@bp.route("/api/create_chat_session", methods=["POST"])
def create_chat_session():
    """
    Creates a new chat session.

    Expected JSON payload:
    {
        "model": string, name of the model to use
    }

    Returns:
    - JSON object with session details:
        - id (str): Generated session UUID
        - model (str): Model name
        - name (str): Session name (timestamp by default)
        - created_at (str): ISO formatted session creation timestamp
        - last_used (str): ISO formatted timestamp of session creation
    - Returns 400 error if no model is provided
    """
    model = request.json.get("model")
    if not model:
        return jsonify({"error": "Model name is required"}), 400

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


@bp.route("/api/get_latest_session", methods=["GET"])
def get_latest_session():
    """
    Retrieves the latest session for a specific model.

    Query Parameters:
    - model (str, optional): Model name (defaults to current model_name)

    Returns:
    - JSON object with session details:
        - id (str): Session UUID
        - model (str): Model name
        - name (str): Session name
        - created_at (str): ISO formatted session creation timestamp
        - last_used (str): ISO formatted timestamp of last session use
    - Returns 400 error if an invalid model is provided
    """
    model = request.args.get("model", model_name)
    if model != model_name:
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


@bp.route("/api/delete_message", methods=["POST"])
def delete_message():
    """
    Deletes a specific message and all subsequent messages in a session.

    Expected JSON payload:
    {
        "message_id": int, ID of the message to delete
        "session_id": str, ID of the chat session
    }

    Returns:
    - JSON object with success status:
        - success (bool): True if deletion was successful
    - Returns 400 error if message or session is invalid
    """
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


@bp.route("/api/edit_message", methods=["POST"])
@async_route
async def edit_message():
    """
    Edits a user message and regenerates the AI response.

    Expected JSON payload:
    {
        "message_id": int, ID of the message to edit
        "new_content": str, updated message content
        "session_id": str, ID of the chat session
    }

    Returns:
    - JSON object with:
        - success (bool): True if edit was successful
        - model_response (str): Newly generated AI response
        - timestamp (str): ISO formatted timestamp of the new response
    - Returns 400 error if message or session is invalid
    """
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

    # Generate a new response
    messages = (
        Message.query.filter_by(session_id=session_id).order_by(Message.timestamp).all()
    )
    context = [{"system": model_system_prompt}] + [
        {"user" if msg.sender == "user" else "assistant": msg.content}
        for msg in messages
    ]

    model_response = await LLM_model.get_response(context, model_name)

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


@bp.route("/api/edit_session_name", methods=["POST"])
def edit_session_name():
    """
    Edits the name of a specific chat session.

    Expected JSON payload:
    {
        "session_id": str, ID of the chat session
        "new_name": str, updated session name
    }

    Returns:
    - JSON object with:
        - success (bool): True if name change was successful
        - new_name (str): The updated session name
    - Returns 400 error if session is invalid
    """
    data = request.json
    session_id = data["session_id"]
    new_name = data["new_name"]

    session = ChatSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Invalid session"}), 400

    session.name = new_name
    db.session.commit()
    return jsonify({"success": True, "new_name": new_name})


@bp.route("/api/delete_session", methods=["POST"])
def delete_session():
    """
    Deletes an entire chat session and all its messages.

    Expected JSON payload:
    {
        "session_id": str, ID of the chat session to delete
    }

    Returns:
    - JSON object with:
        - success (bool): True if session deletion was successful
    - Returns 400 error if session is invalid
    """
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


@bp.route("/api/get_model_config", methods=["GET"])
def get_model_config():
    """
    Retrieve the current model configuration.

    Returns:
    - JSON object with:
        - model_name (str): The current model name
        - system_prompt (str): The current system prompt
    """
    return jsonify({"model_name": model_name, "system_prompt": model_system_prompt})


@bp.route("/api/set_model_config", methods=["POST"])
def set_model_config():
    """
    Set the model configuration.

    Expected JSON payload (both fields optional):
    {
        "model_name": string, new model name
        "system_prompt": string, new system prompt
    }

    Returns:
    - JSON object with:
        - success (bool): Whether the configuration was updated
        - model_name (str): Updated model name
        - system_prompt (str): Updated system prompt
    """
    global model_name, model_system_prompt
    data = request.json

    # Update model name if provided
    if data.get("model_name"):
        model_name = data["model_name"]

    # Update system prompt if provided
    if data.get("system_prompt"):
        model_system_prompt = data["system_prompt"]

    return jsonify(
        {
            "success": True,
            "model_name": model_name,
            "system_prompt": model_system_prompt,
        }
    )
