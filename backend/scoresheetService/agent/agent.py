# from google.adk.agents.llm_agent import Agent
import json
import asyncio
# root_agent = Agent(
#     model='gemini-2.5-flash',
#     name='root_agent',
#     description='A helpful assistant for user questions.',
#     instruction='Answer user questions to the best of your knowledge',
# )


import chess
from google.adk.agents import LlmAgent, SequentialAgent
from google.genai import types
from google.adk.runners import InMemoryRunner
from pydantic import BaseModel, Field
from enum import Enum

def process_chess_step(fen: str, move_to_apply: str = None) -> dict:
    """
    Validates a move and returns the new FEN + next legal moves.
    Args:
        fen: The current board position in FEN format.
        move_to_apply: The SAN move (e.g., 'e4') to execute. If None, just returns current status.
    """
    try:
        board = chess.Board(fen)
        if move_to_apply:
            try:
                board.push_san(move_to_apply)
            except ValueError:
                return {"status": "error", "message": f"Illegal move: {move_to_apply}"}

        return {
            "status": "success",
            "current_fen": board.fen(),
            "legal_moves": [board.san(m) for m in board.legal_moves],
            "is_game_over": board.is_game_over()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# System instructions
CHESS_INSTRUCTIONS = """
You are a Chess Notation OCR Specialist. Your task is to convert handwritten scoresheets into JSON.
CRITICAL RULES:
1. Start by calling 'process_chess_step' with the starting FEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'.
2. For every move in the scoresheet:
   - Identify the handwritten text in the image.
   - Compare it against the 'legal_moves' returned by your last tool call.
   - Pick the move from the legal list that best matches the visual evidence.
   - If NO legal move matches the handwriting, STOP and return the JSON moves found so far.
3. Use the 'current_fen' from the PREVIOUS tool output as the input for the NEXT tool call.
4. Output JSON format: {"moves": [{"white": "...", "black": "..."}], "error": "The error message, if there was a failure"}
5. Output ONLY the JSON and nothing else.
"""

class Status(str, Enum):
    SUCCESS = "success"
    ERROR = "error"


class ScoresheetMove(BaseModel):
    white: str = Field(description='The move played by white')
    black: str | None = Field(description='The move played by black')


class ScoresheetParserOutput(BaseModel):
    # status: Status = Field(description='The status of the OCR execution')
    error: str | None = Field(description='The error message from the execution, if applicable')
    moves: list[ScoresheetMove] = Field(description='The list of moves extracted from the scoresheet')


header_agent = LlmAgent(
    name="HeaderExtractor",
    model="gemini-2.5-flash",
    instruction="""Look at the top of the scoresheet image. Extract the game metadata. Save it as a dictionary in the shared state under the key 'metadata'""",
    output_key="metadata",
)


CLOCK_INSTRUCTIONS = """
Extract clock times from a chess scoresheet. Your task is to convert handwritten clock times into JSON.

Clock times may be written in hh:mm:ss, mm:ss, or mm notation. Extract the clock times exactly as written. Do not convert between formats.

Output JSON format: [{"white": "...", "black": "..."}]
Output ONLY the JSON and nothing else.
"""


clock_agent = LlmAgent(
    name="ClockExtractor",
    model="gemini-2.5-flash",
    instruction=CLOCK_INSTRUCTIONS,
    output_key="clocks",
)

move_agent = LlmAgent(
    name="MoveTranscriber",
    model="gemini-3-pro-preview",
    instruction=CHESS_INSTRUCTIONS,
    tools=[process_chess_step],
    output_key='game',
)

CONSOLIDATOR_INSTRUCTION = """
You are a data formatter.
Take the following metadata: {metadata}
The following clock data: {clocks}
And the following game data: {game}
Merge them into one valid JSON object.
Output ONLY the JSON and nothing else.
"""

consolidator_agent = LlmAgent(
    name="Consolidator",
    model="gemini-2.5-flash",
    instruction=CONSOLIDATOR_INSTRUCTION,
)

root_agent = SequentialAgent(
    name="ChessOCR",
    sub_agents=[header_agent, clock_agent, move_agent, consolidator_agent],
)

runner = InMemoryRunner(
    agent=root_agent,
    app_name='scoresheet_parser',
)

def create_session():
    session = asyncio.run(runner.session_service.create_session(
        app_name='scoresheet_parser', user_id='user'
    ))
    return session


# 4. Execution Function (How to pass the image)
def transcribe_scoresheet(image_path: str):
    # Load the image as a Part for the multimodal model
    with open(image_path, "rb") as f:
        image_bytes = f.read()
    
    image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
    prompt = "Please transcribe the moves from this chess scoresheet image."
    
    # Run the agent (this triggers the vision-tool loop)
    content = types.Content(
        role='user',
        parts=[image_part, types.Part.from_text(text=prompt)],
    )
    session = create_session()
    for event in runner.run(
        user_id='user',
        session_id=session.id,
        new_message=content,
    ):
        if event.content.parts and event.content.parts[0].text:
            print(f'** {event.author}: {event.content.parts[0].text}')
    print()

# # Define a convenience function to query the agent
# def run_agent(session_id: str, new_message: str):
#     content = types.Content(
#         role='user', parts=[types.Part.from_text(text=new_message)]
#     )
#     print('** User says:', new_message)
#     for event in runner.run(
#         user_id='user',
#         session_id=session_id,
#         new_message=content,
#     ):
#         if event.content.parts and event.content.parts[0].text:
#             print(f'** {event.author}: {event.content.parts[0].text}')
#     print()

if __name__ == "__main__":
    # Example usage
    result = transcribe_scoresheet("/Users/jackstenglein/Downloads/IMG_0210.HEIC")
    # print(result)
    print('\n\n')
    # print(json.dumps(json.loads(result), indent=4))
