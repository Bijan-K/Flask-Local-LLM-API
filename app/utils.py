from app import db
from app.models import ChatSession
from datetime import datetime
import uuid


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
