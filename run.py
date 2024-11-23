from app import create_app, db
from hypercorn.config import Config
from hypercorn.asyncio import serve
import asyncio

app = create_app()


async def main():
    config = Config()
    config.bind = ["localhost:5000"]
    await serve(app, config)


if __name__ == "__main__":
    asyncio.run(main())
