from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def create_app():
    app = Flask(__name__, static_url_path="/static")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///chatbot.db"
    db.init_app(app)

    # Import models and routes here to avoid circular imports
    from app import routes

    app.register_blueprint(routes.bp)

    return app
