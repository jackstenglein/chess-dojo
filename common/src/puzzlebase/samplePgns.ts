/**
 * Example puzzles for the guide in the submit dialog. Each shows one of the conventions a
 * contributor can use in the solution: a defense to beat, one to skip, and alternate solutions.
 * They are also tested, so the guide can never show a PGN that would be rejected.
 */
export interface SamplePgn {
    title: string;
    /** What the example teaches, in a sentence. */
    lesson: string;
    pgn: string;
}

export const SAMPLE_PGNS: SamplePgn[] = [
    {
        title: 'Defenses and analysis',
        lesson: 'A variation on the opponent’s move is another defense the solver must beat. A variation on the solver’s own move is not played: it is shown in the analysis afterwards.',
        pgn: `[Event "Las Palmas"]
[Date "1973.??.??"]
[White "Ljubojevic, Ljubomir"]
[Black "Stein, Leonid"]
[Result "0-1"]
[Annotator "Kostya"]
[SetUp "1"]
[FEN "r1bq1rk1/ppp2pbp/3p2p1/2n5/2P3n1/1PN1PN2/PB1QBPPP/3RK2R b K - 0 1"]
[Source "Chess Informant"]

1... Nxf2 $1 (1... Bxc3 $2 {this line is not given during the solving, but is shown in the analysis box afterwards.} 2. Qxc3 $18) 2. Kxf2 {Main line} (2. O-O Nxd1 $19 {first defense}) 2... Bxc3 3. Qxc3 Ne4+ $19 {Puzzle ends here at the evaluation. More moves can be shown from here in "the notes" without extending the puzzle. They would show up in the analysis box.} 0-1`,
    },
    {
        title: 'SKIP and ALT',
        lesson: 'Start a comment with SKIP to leave a defense out of the puzzle (it still shows in the analysis). Start it with ALT for another solution: the solver can play it out, and misses in it count like any other.',
        pgn: `[Event "III b Tunis 118/81"]
[Date "2013.??.??"]
[White "Amin, Bassem"]
[Black "Abdel Razik, Khaled"]
[Result "1-0"]
[Annotator "Amin,Bassem"]
[SetUp "1"]
[FEN "8/2k2p1p/r1b1pPpP/3p4/pRpP1K2/P1P3P1/2B2P2/8 w - - 0 1"]
[Source "ECC5"]

1. Bxg6 $3 fxg6 (1... hxg6 {SKIP -- this is an opponent's defense, but we write SKIP because white has too many wins after this move. But we include it in the analysis afterwards.} 2. Rb8 $1 $18 ({or} 2. h7 Ra8 3. Kg5 Rh8 4. Kh6 $18)) 2. Rb8 $1 (2. f7 {ALT - an alternate solution, gives full points and allows the user to either try again or proceed.} Ra8 3. Ke5 Kd7 4. Kf6 $18 {is also winning.}) 2... Kxb8 3. f7 $18 1-0`,
    },
    {
        title: 'ALT2',
        lesson: 'Start a comment with ALT2 for a move that is good, but not the best. The solver is told there is a better one and tries again, at no cost.',
        pgn: `[Event "Correspondence"]
[Date "1953.??.??"]
[White "Madsen"]
[Black "Napolitano"]
[Result "0-1"]
[Annotator "Kostya"]
[SetUp "1"]
[FEN "6k1/1p1qrpp1/p7/7p/PQ6/8/1PPp2PP/3R2K1 b - - 0 1"]
[Source "Chess Informant"]

1... Re1+ (1... Re2 {ALT2 - This means that the move is good, but not quite as good as the main line. User is prompted to try again without losing points.} 2. Kf1 Qe6 $19) 2. Rxe1 Qd4+ $1 3. Qxd4 dxe1=Q# 0-1`,
    },
];
