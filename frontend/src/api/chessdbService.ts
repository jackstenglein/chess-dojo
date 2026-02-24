import { axiosService } from "./axiosService";
import { Chess, Color } from "chess.js";
import { ChessDbMove, ChessDbPv } from "./cache/chessdb";

/**
 * Normalize the score based on current turn, Chessdb has weird flipping logic which we need to normalize
 * @param score chessDB score
 * @param turn current turn
 * @returns normalized score
 */
function normalizeChessDBScore(score: number, turn: Color): number{
  if(turn === "b"){
    return -score;
  }

  return score;

}

/**
 * Gets human readable word note for given note symbol
 * @param note symbol
 * @returns converted note
 */
function getChessDbNoteWord(note: string): string {
    switch (note) {
        case '!':
            return 'Best';
        case '*':
            return 'Good';
        case '?':
            return 'Bad';
        default:
            return 'unknown';
    }
}

interface ChessDbResponse {
    status: string;
    moves: ChessDbMove[];
}

interface ChessDbPvResponse {
    status: string;
    score: number;
    depth: number;
    pv: string[];
    pvSAN: string[];
}


export class ChessDBService {
  private baseUrl: string;

  constructor(baseUrl = "https://www.chessdb.cn/cdb.php") {
    this.baseUrl = baseUrl;
  }

  async getAnalysis(fen: string): Promise<{ data?: { moves: ChessDbMove[]; totalMoves: number }; error?: string }> {
    if (!fen) {
      return { error: "Missing required argument: fen" };
    }

    const encodedFen = encodeURIComponent(fen);
    const apiUrl = `${this.baseUrl}?action=queryall&board=${encodedFen}&json=1`;

    try {
      const response = await axiosService.get<ChessDbResponse>(apiUrl);
      const responseData = response.data;

      if (responseData.status !== "ok") {
        await this.queueAnalysis(fen);
        return { error: `Position evaluation not available: ${responseData.status}` };
      }

      const moves = responseData.moves;

      if (!Array.isArray(moves) || moves.length === 0) {
        return { error: "No candidate moves found for this position." };
      }

      const processedMoves = this.processMoves(moves, fen);

      return {
        data: {
          moves: processedMoves,
          totalMoves: processedMoves.length,
        },
      };
    } catch (error) {
      return { error: `Request failed: ${error as string}` };
    }
  }

  async getPv(fen: string): Promise<{ data?: ChessDbPv; error?: string }> {
    if (!fen) {
      return { error: "Missing required argument: fen" };
    }

    const encodedFen = encodeURIComponent(fen);
    const pvUrl = `${this.baseUrl}?action=querypv&board=${encodedFen}&stable=1&json=1`;

    try {
      const response = await axiosService.get<ChessDbPvResponse>(pvUrl);
      const responseData = response.data;

      if (responseData.status !== "ok") {
        return { error: `PV not available: ${responseData.status}` };
      }

      const pvData: ChessDbPv = {
        score: responseData.score,
        depth: responseData.depth,
        pv: responseData.pv ?? [],
        pvSAN: responseData.pvSAN ?? [],
      };

      return { data: pvData };
    } catch (error) {
      return { error: `Request failed: ${error as string}` };
    }
  }

  async queueAnalysis(fen: string): Promise<{ success?: boolean; error?: string }> {
    if (!fen) {
      return { error: "Missing required argument: fen" };
    }

    const encodedFen = encodeURIComponent(fen);
    const queueUrl = `${this.baseUrl}?action=queue&board=${encodedFen}&json=1`;

    try {
      const response = await axiosService.get<{ status: string }>(queueUrl);
      const responseData = response.data;

      if (responseData.status !== "ok") {
        return { error: `Failed to queue position: ${responseData.status}` };
      }

      return { success: true };
    } catch (error) {
      return { error: `Request failed: ${error as string}` };
    }
  }

  private processMoves(moves: ChessDbMove[], fen: string): ChessDbMove[] {
    const turn = new Chess(fen).turn();

    return moves.map((move) => {
      const scoreNum = Number(move.score);
      const fixedNote = getChessDbNoteWord(move.note?.split(" ")[0] || "");
      const normalizedScore = normalizeChessDBScore(scoreNum, turn);
      const scoreStr = isNaN(normalizedScore) ? "N/A" : (normalizedScore / 100).toFixed(2);

      return {
        uci: move.uci || "N/A",
        san: move.san || "N/A",
        score: scoreStr,
        winrate: move.winrate || "N/A",
        rank: move.rank,
        note: fixedNote,
      };
    });
  }
}