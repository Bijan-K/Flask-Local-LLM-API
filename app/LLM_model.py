# the output function should be get_response()
# and the returned value should be string
# Model name is here for checking
import asyncio
import random


async def get_response(content: list, model_name: str) -> str:
    # Simulate API delay between 1-3 seconds
    delay = random.uniform(1, 3)
    await asyncio.sleep(delay)

    # For testing, return info about the delay and received context
    response = f"Response after {delay:.1f}s delay. Received {len(content)} messages with model {model_name}"
    return response
