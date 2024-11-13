from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

db = SQLAlchemy()


def create_app():
    load_dotenv()
    app = Flask(__name__, static_url_path="/static")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///chatbot.db"
    db.init_app(app)

    # Import models and routes here to avoid circular imports
    from app import models, routes

    app.register_blueprint(routes.bp)

    return app
