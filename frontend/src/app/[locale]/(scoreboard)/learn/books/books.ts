export interface Book {
    title: string;
    author?: string;
    link?: string;
}

export interface CohortBooks {
    cohort: string;
    books: Book[];
}

export interface BookSection {
    title: string;
    cohorts: CohortBooks[];
}

export const sections: BookSection[] = [
    {
        title: 'Main Recommendations',
        cohorts: [
            {
                cohort: '0-300',
                books: [
                    {
                        title: "Everyone's First Chess Workbook Part 1",
                        author: 'Peter Giannatos',
                        link: 'https://amzn.to/3ZQSRVa',
                    },
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                ],
            },
            {
                cohort: '300-400',
                books: [
                    {
                        title: "Everyone's First Chess Workbook through Exercise 218 (end of Skewer chapter)",
                        author: 'Peter Giannatos',
                        link: 'https://amzn.to/3ZQSRVa',
                    },
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                ],
            },
            {
                cohort: '400-500',
                books: [
                    {
                        title: "Everyone's First Chess Workbook through Exercise 323 (end of Decoy chapter)",
                        author: 'Peter Giannatos',
                        link: 'https://amzn.to/3ZQSRVa',
                    },
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                ],
            },
            {
                cohort: '500-600',
                books: [
                    {
                        title: "Everyone's First Chess Workbook Parts 1-2",
                        author: 'Peter Giannatos',
                        link: 'https://amzn.to/3ZQSRVa',
                    },
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                ],
            },
            {
                cohort: '600-700',
                books: [
                    {
                        title: "Everyone's First Chess Workbook",
                        author: 'Peter Giannatos',
                        link: 'https://amzn.to/3ZQSRVa',
                    },
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                ],
            },
            {
                cohort: '700-800',
                books: [
                    {
                        title: 'Chess Tactics for Kids',
                        author: 'Murray Chandler',
                        link: 'https://amzn.to/3UFp7Le',
                    },
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                ],
            },
            {
                cohort: '800-900',
                books: [
                    {
                        title: 'How to Beat Your Dad at Chess',
                        author: 'Murray Chandler',
                        link: 'https://amzn.to/44lLZlX',
                    },
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: "It's About Time",
                        author: 'Jesse Kraai',
                        link: 'https://www.chessable.com/its-about-time-a-beginners-guide-to-time-in-chess/course/194972/',
                    },
                ],
            },
            {
                cohort: '900-1000',
                books: [
                    {
                        title: 'Learn Chess the Right Way: Book 3',
                        author: 'Susan Polgar',
                        link: 'https://amzn.to/49WWVYt',
                    },
                    {
                        title: 'First Book of Morphy',
                        author: 'Frisco Del Rosario',
                        link: 'https://amzn.to/3mpoG8X',
                    },
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                ],
            },
            {
                cohort: '1000-1100',
                books: [
                    {
                        title: 'Logical Chess: Move by Move',
                        author: 'Irving Chernev',
                        link: 'https://amzn.to/41XE8ta',
                    },
                    {
                        title: 'Mastering Time in Chess',
                        author: 'Jesse Kraai',
                        link: 'https://www.chessable.com/mastering-time-in-chess/course/277570/',
                    },
                ],
            },
            {
                cohort: '1100-1200',
                books: [
                    {
                        title: 'Mastering Time in Chess',
                        author: 'Jesse Kraai',
                        link: 'https://www.chessable.com/mastering-time-in-chess/course/277570/',
                    },
                    {
                        title: 'Most Instructive Games',
                        author: 'Irving Chernev',
                        link: 'https://amzn.to/3ymxorn',
                    },
                ],
            },
            {
                cohort: '1200-1300',
                books: [
                    {
                        title: 'Mastering Time in Chess',
                        author: 'Jesse Kraai',
                        link: 'https://www.chessable.com/mastering-time-in-chess/course/277570/',
                    },
                    {
                        title: 'Modern Ideas in Chess',
                        author: 'Richard Reti',
                        link: 'https://amzn.to/3SVRan7',
                    },
                ],
            },
            {
                cohort: '1300-1400',
                books: [
                    {
                        title: 'Winning Chess Strategies',
                        author: 'Yasser Seirawan',
                        link: 'https://amzn.to/3mD1ynK',
                    },
                ],
            },
            {
                cohort: '1400-1500',
                books: [
                    {
                        title: 'Simple Chess',
                        author: 'Michael Stean',
                        link: 'https://amzn.to/3SYGgge',
                    },
                ],
            },
            {
                cohort: '1500-1600',
                books: [
                    {
                        title: 'Simple Chess',
                        author: 'Michael Stean',
                        link: 'https://amzn.to/3SYGgge',
                    },
                    {
                        title: 'How to Reassess Your Chess',
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Lfqfk6',
                    },
                ],
            },
            {
                cohort: '1600-1700',
                books: [
                    {
                        title: 'How to Reassess Your Chess',
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Lfqfk6',
                    },
                    {
                        title: 'Art of Attack in Chess',
                        author: 'Vladimir Vukovic',
                        link: 'https://amzn.to/3SYIw7c',
                    },
                ],
            },
            {
                cohort: '1700-1800',
                books: [
                    {
                        title: 'Evaluate Like a Grandmaster',
                        author: 'Eugene Perelshteyn',
                        link: 'https://amzn.to/3IZZk9w',
                    },
                    {
                        title: 'Art of Attack in Chess',
                        author: 'Vladimir Vukovic',
                        link: 'https://amzn.to/3SYIw7c',
                    },
                    {
                        title: 'Techniques of Positional Play',
                        author: 'Valeri Bronznik',
                        link: 'https://amzn.to/44hhwWm',
                    },
                ],
            },
            {
                cohort: '1800-1900',
                books: [
                    {
                        title: 'Evaluate Like a Grandmaster',
                        author: 'Eugene Perelshteyn',
                        link: 'https://amzn.to/3IZZk9w',
                    },
                    {
                        title: 'Techniques of Positional Play',
                        author: 'Valeri Bronznik',
                        link: 'https://amzn.to/44hhwWm',
                    },
                    {
                        title: 'New York 1924',
                        author: 'Alexander Alekhine',
                        link: 'https://amzn.to/3yjYY8C',
                    },
                ],
            },
            {
                cohort: '1900-2000',
                books: [
                    {
                        title: 'Techniques of Positional Play',
                        author: 'Valeri Bronznik',
                        link: 'https://amzn.to/44hhwWm',
                    },
                    {
                        title: 'New York 1924',
                        author: 'Alexander Alekhine',
                        link: 'https://amzn.to/3yjYY8C',
                    },
                    {
                        title: 'Tal-Botvinnik 1960',
                        author: 'Mikhail Tal',
                        link: 'https://amzn.to/3F7taHI',
                    },
                    {
                        title: 'Seven Deadly Chess Sins',
                        author: 'Jonathan Rowson',
                        link: 'https://amzn.to/3F8P39T',
                    },
                ],
            },
            {
                cohort: '2000-2100',
                books: [
                    {
                        title: 'New York 1924',
                        author: 'Alexander Alekhine',
                        link: 'https://amzn.to/3yjYY8C',
                    },
                    {
                        title: 'Strategic Chess Exercises',
                        author: 'Emmanuel Bricard',
                        link: 'https://amzn.to/3JBr44U',
                    },
                    {
                        title: 'Tal-Botvinnik 1960',
                        author: 'Mikhail Tal',
                        link: 'https://amzn.to/3F7taHI',
                    },
                    {
                        title: 'My 60 Memorable Games',
                        author: 'Bobby Fischer',
                        link: 'https://amzn.to/3Yv6058',
                    },
                    {
                        title: 'Life & Games of Mikhail Tal',
                        author: 'Mikhail Tal',
                        link: 'https://amzn.to/3mCnOOz',
                    },
                    {
                        title: 'Secrets of Grandmaster Chess',
                        author: 'John Nunn',
                        link: 'https://amzn.to/3YAtS7k',
                    },
                    {
                        title: 'Seven Deadly Chess Sins',
                        author: 'Jonathan Rowson',
                        link: 'https://amzn.to/3F8P39T',
                    },
                    {
                        title: 'Mastering Chess Strategy',
                        author: 'Johan Hellsten',
                        link: 'https://amzn.to/3kZ4ria',
                    },
                ],
            },
            {
                cohort: '2100-2200',
                books: [
                    {
                        title: 'Strategic Chess Exercises',
                        author: 'Emmanuel Bricard',
                        link: 'https://amzn.to/3JBr44U',
                    },
                    {
                        title: 'Tal-Botvinnik 1960',
                        author: 'Mikhail Tal',
                        link: 'https://amzn.to/3F7taHI',
                    },
                    {
                        title: 'My 60 Memorable Games',
                        author: 'Bobby Fischer',
                        link: 'https://amzn.to/3Yv6058',
                    },
                    {
                        title: 'Life & Games of Mikhail Tal',
                        author: 'Mikhail Tal',
                        link: 'https://amzn.to/3mCnOOz',
                    },
                    {
                        title: 'Secrets of Grandmaster Chess',
                        author: 'John Nunn',
                        link: 'https://amzn.to/3YAtS7k',
                    },
                    {
                        title: 'Seven Deadly Chess Sins',
                        author: 'Jonathan Rowson',
                        link: 'https://amzn.to/3F8P39T',
                    },
                    {
                        title: 'Mastering Chess Strategy',
                        author: 'Johan Hellsten',
                        link: 'https://amzn.to/3kZ4ria',
                    },
                    {
                        title: 'Chess Structures: A Grandmaster Guide',
                        author: 'Mauricio Flores Rios',
                        link: 'https://amzn.to/3IYBBqg',
                    },
                ],
            },
            {
                cohort: '2200-2300',
                books: [
                    {
                        title: 'Tal-Botvinnik 1960',
                        author: 'Mikhail Tal',
                        link: 'https://amzn.to/3F7taHI',
                    },
                    {
                        title: 'My 60 Memorable Games',
                        author: 'Bobby Fischer',
                        link: 'https://amzn.to/3Yv6058',
                    },
                    {
                        title: 'Life & Games of Mikhail Tal',
                        author: 'Mikhail Tal',
                        link: 'https://amzn.to/3mCnOOz',
                    },
                    {
                        title: 'Secrets of Grandmaster Chess',
                        author: 'John Nunn',
                        link: 'https://amzn.to/3YAtS7k',
                    },
                    {
                        title: 'Seven Deadly Chess Sins',
                        author: 'Jonathan Rowson',
                        link: 'https://amzn.to/3F8P39T',
                    },
                    {
                        title: 'Mastering Chess Strategy',
                        author: 'Johan Hellsten',
                        link: 'https://amzn.to/3kZ4ria',
                    },
                    {
                        title: 'Chess Structures: A Grandmaster Guide',
                        author: 'Mauricio Flores Rios',
                        link: 'https://amzn.to/3IYBBqg',
                    },
                    {
                        title: 'Test of Time',
                        author: 'Garry Kasparov',
                    },
                ],
            },
            {
                cohort: '2300-2400',
                books: [
                    {
                        title: 'My 60 Memorable Games',
                        author: 'Bobby Fischer',
                        link: 'https://amzn.to/3Yv6058',
                    },
                    {
                        title: 'Seven Deadly Chess Sins',
                        author: 'Jonathan Rowson',
                        link: 'https://amzn.to/3F8P39T',
                    },
                    {
                        title: 'Test of Time',
                        author: 'Garry Kasparov',
                    },
                    {
                        title: 'Fire on Board',
                        author: 'Alexei Shirov',
                        link: 'https://amzn.to/3ypU2iF',
                    },
                    {
                        title: 'Kramnik: My Life & Games',
                        author: 'Vladimir Kramnik',
                        link: 'https://amzn.to/3mCHhi3',
                    },
                    {
                        title: 'Positional Decision Making',
                        author: 'Boris Gelfand',
                        link: 'https://amzn.to/3L7S0LB',
                    },
                    {
                        title: `Alekhine's Best Games`,
                        author: 'Alexander Alekhine',
                        link: 'https://amzn.to/3HPCMbF',
                    },
                ],
            },
            {
                cohort: '2400+',
                books: [
                    {
                        title: 'My 60 Memorable Games',
                        author: 'Bobby Fischer',
                        link: 'https://amzn.to/3Yv6058',
                    },
                    {
                        title: 'Test of Time',
                        author: 'Garry Kasparov',
                    },
                    {
                        title: 'Fire on Board',
                        author: 'Alexei Shirov',
                        link: 'https://amzn.to/3ypU2iF',
                    },
                    {
                        title: 'Kramnik: My Life & Games',
                        author: 'Vladimir Kramnik',
                        link: 'https://amzn.to/3mCHhi3',
                    },
                    {
                        title: 'Positional Decision Making',
                        author: 'Boris Gelfand',
                        link: 'https://amzn.to/3L7S0LB',
                    },
                    {
                        title: 'My Great Predecessors',
                        author: 'Garry Kasparov',
                        link: 'https://amzn.to/3kZ9OOm',
                    },
                    {
                        title: `Alekhine's Best Games`,
                        author: 'Alexander Alekhine',
                        link: 'https://amzn.to/3HPCMbF',
                    },
                ],
            },
        ],
    },
    {
        title: 'Tactics',
        cohorts: [
            {
                cohort: '1000-1100',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Winning Chess Tactics',
                        author: 'Yasser Seirawan',
                        link: 'https://amzn.to/49Z3oCc',
                    },
                ],
            },
            {
                cohort: '1100-1200',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: '1001 Chess Exercises for Beginners',
                        author: 'Franco Masetti',
                        link: 'https://amzn.to/3wpO5ol',
                    },
                ],
            },
            {
                cohort: '1200-1300',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Visualize 1 on Chessable',
                        author: 'Benedictine',
                        link: 'https://www.chessable.com/visualise-1/course/25695/',
                    },
                ],
            },
            {
                cohort: '1300-1400',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Common Chess Patterns',
                        author: 'Benedictine',
                        link: 'https://www.chessable.com/common-chess-patterns/course/13348/',
                    },
                ],
            },
            {
                cohort: '1400-1500',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: '1001 Chess Exercises for Club Players',
                        author: 'Frank Erwich',
                        link: 'https://amzn.to/3Ue8AMA',
                    },
                ],
            },
            {
                cohort: '1500-1600',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Chess Tactics From Scratch (skip 5-star problems)',
                        author: 'Martin Weteschnik',
                        link: 'https://amzn.to/3YvXB1l',
                    },
                ],
            },
            {
                cohort: '1600-1700',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Checkmate Patterns Manual',
                        author: 'CraftyRaf',
                        link: 'https://www.chessable.com/the-checkmate-patterns-manual/course/243265/',
                    },
                    {
                        title: 'Quality Chess Puzzle Book',
                        author: 'John Shaw',
                        link: 'https://qualitychess.co.uk/products/opening/50/quality_chess_puzzle_book_-_by_john_shaw/',
                    },
                ],
            },
            {
                cohort: '1700-1800',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Endgame Studies 101',
                        author: 'Kostya Kavutskiy',
                        link: 'https://www.chessable.com/endgame-studies-101/course/81472/',
                    },
                    {
                        title: 'Forcing Chess Moves',
                        author: 'Charles Hertan',
                        link: 'https://amzn.to/3SyZ1aC',
                    },
                ],
            },
            {
                cohort: '1800-1900',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: '1001 Chess Exercises for Club Players',
                        author: 'Frank Erwich',
                        link: 'https://amzn.to/3Ue8AMA',
                    },
                    {
                        title: 'Chess Tactics From Scratch (5-star problems)',
                        author: 'Martin Weteschnik',
                        link: 'https://amzn.to/3YvXB1l',
                    },
                    {
                        title: 'Think Like a Super-GM',
                        author: 'Michael Adams & Philip Hurtado',
                        link: 'https://amzn.to/3Fbr61x',
                    },
                ],
            },
            {
                cohort: '1900-2000',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Think Like a Super-GM',
                        author: 'Michael Adams & Philip Hurtado',
                        link: 'https://amzn.to/3Fbr61x',
                    },
                    {
                        title: 'How to Calculate Chess Tactics',
                        author: 'Valeri Beim',
                        link: 'https://amzn.to/42V1YIO',
                    },
                    {
                        title: 'Chess Tactics for Advanced Players',
                        author: 'Yuri Averbakh',
                        link: 'https://amzn.to/4kjV2uD',
                    },
                ],
            },
            {
                cohort: '2000-2100',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Woodpecker Method',
                        author: 'Axel Smith & Hans Tikkanen',
                        link: 'https://amzn.to/3FuI0bR',
                    },
                    {
                        title: 'Think Like a Super-GM',
                        author: 'Michael Adams & Philip Hurtado',
                        link: 'https://amzn.to/3Fbr61x',
                    },
                    {
                        title: 'Excelling at Combinational Play',
                        author: 'Jacob Aagaard',
                        link: 'https://amzn.to/4jlVqbf',
                    },
                    {
                        title: 'Chess Calculation Training',
                        author: 'Romain Edouard',
                        link: 'https://amzn.to/3SHnTNr',
                    },
                ],
            },
            {
                cohort: '2100-2200',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Think Like a Super-GM',
                        author: 'Michael Adams & Philip Hurtado',
                        link: 'https://amzn.to/3Fbr61x',
                    },
                    {
                        title: 'Excelling at Combinational Play 2',
                        author: 'Jacob Aagaard',
                        link: 'https://amzn.to/457Af9a',
                    },
                    {
                        title: 'Cognitive Chess',
                        author: 'Konstantin Chernyshov',
                        link: 'https://amzn.to/459HCgh',
                    },
                    {
                        title: 'Tactical Play',
                        author: 'Mark Dvoretsky',
                        link: 'https://amzn.to/3QpA15k',
                    },
                    {
                        title: 'Perfect Your Chess',
                        author: 'Andrei Volokitin',
                        link: 'https://amzn.to/3mA75eP',
                    },
                ],
            },
            {
                cohort: '2200-2300',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Grandmaster Preparation: Calculation',
                        author: 'Jacob Aagaard',
                        link: 'https://amzn.to/3xVl6t3',
                    },
                    {
                        title: 'Turbo-Charge Your Tactics 1',
                        author: 'Mykhaylo Oleksiyenko and Vladimir Grabinsky',
                        link: 'https://www.amazon.com/Turbo-Charge-Your-Tactics-Drive-Improvement/dp/B0CPHYPGCQ',
                    },
                    {
                        title: 'Think Like a Super-GM',
                        author: 'Michael Adams & Philip Hurtado',
                        link: 'https://amzn.to/3Fbr61x',
                    },
                    {
                        title: 'Calculation!',
                        author: 'Sam Shankland',
                        link: 'https://amzn.to/4dis2RG',
                    },
                    {
                        title: 'Tactical Play',
                        author: 'Mark Dvoretsky',
                        link: 'https://amzn.to/3QpA15k',
                    },
                    {
                        title: 'Perfect Your Chess',
                        author: 'Andrei Volokitin',
                        link: 'https://amzn.to/3mA75eP',
                    },
                    {
                        title: 'The Best Move',
                        author: 'Vlastimil Hort',
                        link: 'https://amzn.to/3F3Fyc4',
                    },
                ],
            },
            {
                cohort: '2300-2400',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Grandmaster Preparation: Calculation',
                        author: 'Jacob Aagaard',
                        link: 'https://amzn.to/3xVl6t3',
                    },
                    {
                        title: 'Turbo-Charge Your Tactics 1',
                        author: 'Mykhaylo Oleksiyenko and Vladimir Grabinsky',
                        link: 'https://www.amazon.com/Turbo-Charge-Your-Tactics-Drive-Improvement/dp/B0CPHYPGCQ',
                    },
                    {
                        title: 'Think Like a Super-GM',
                        author: 'Michael Adams & Philip Hurtado',
                        link: 'https://amzn.to/3Fbr61x',
                    },
                    {
                        title: 'Imagination in Chess',
                        author: 'Paata Gaprindashvili',
                        link: 'https://amzn.to/3SD8JsC',
                    },
                    {
                        title: 'Tactical Play',
                        author: 'Mark Dvoretsky',
                        link: 'https://amzn.to/3QpA15k',
                    },
                    {
                        title: 'Perfect Your Chess',
                        author: 'Andrei Volokitin',
                        link: 'https://amzn.to/3mA75eP',
                    },
                    {
                        title: 'The Best Move',
                        author: 'Vlastimil Hort',
                        link: 'https://amzn.to/3F3Fyc4',
                    },
                    {
                        title: "Recognizing Your Opponent's Resources",
                        author: 'Mark Dvoretsky',
                        link: 'https://amzn.to/4aUmMl3',
                    },
                ],
            },
            {
                cohort: '2400+',
                books: [
                    {
                        title: 'Chess: 5334 Problems, Combinations & Games',
                        author: 'Laszlo Polgar',
                        link: 'https://amzn.to/3lwCsGN',
                    },
                    {
                        title: 'Grandmaster Preparation: Calculation',
                        author: 'Jacob Aagaard',
                        link: 'https://amzn.to/3xVl6t3',
                    },
                    {
                        title: 'Turbo-Charge Your Tactics 1',
                        author: 'Mykhaylo Oleksiyenko and Vladimir Grabinsky',
                        link: 'https://www.amazon.com/Turbo-Charge-Your-Tactics-Drive-Improvement/dp/B0CPHYPGCQ',
                    },
                    {
                        title: 'Think Like a Super-GM',
                        author: 'Michael Adams & Philip Hurtado',
                        link: 'https://amzn.to/3Fbr61x',
                    },
                    {
                        title: 'Tactical Play',
                        author: 'Mark Dvoretsky',
                        link: 'https://amzn.to/3QpA15k',
                    },
                    {
                        title: 'Perfect Your Chess',
                        author: 'Andrei Volokitin',
                        link: 'https://amzn.to/3mA75eP',
                    },
                    {
                        title: 'The Best Move',
                        author: 'Vlastimil Hort',
                        link: 'https://amzn.to/3F3Fyc4',
                    },
                    {
                        title: "Recognizing Your Opponent's Resources",
                        author: 'Mark Dvoretsky',
                        link: 'https://amzn.to/4aUmMl3',
                    },
                    {
                        title: 'Advanced Chess Tactics',
                        author: 'Lev Psakhis',
                        link: 'https://amzn.to/4aVaTeV',
                    },
                ],
            },
        ],
    },
    {
        title: 'Endgames',
        cohorts: [
            {
                cohort: '0-1000',
                books: [
                    {
                        title: 'No Books',
                    },
                ],
            },
            {
                cohort: '1000-1100',
                books: [
                    {
                        title: "Silman's Complete Endgame Course Parts 1-2",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                ],
            },
            {
                cohort: '1100-1200',
                books: [
                    {
                        title: "Silman's Complete Endgame Course Parts 1-3",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                ],
            },
            {
                cohort: '1200-1300',
                books: [
                    {
                        title: "Silman's Complete Endgame Course Parts 1-3, Part 4 through pg. 120",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                ],
            },
            {
                cohort: '1300-1400',
                books: [
                    {
                        title: "Silman's Complete Endgame Course Parts 1-4",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                ],
            },
            {
                cohort: '1400-1500',
                books: [
                    {
                        title: "Capablanca's Best Endings",
                        author: 'Irving Chernev',
                        link: 'https://amzn.to/3V36NKg',
                    },
                    {
                        title: "Silman's Complete Endgame Course Parts 3-4",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                ],
            },
            {
                cohort: '1500-1600',
                books: [
                    {
                        title: "Capablanca's Best Endings",
                        author: 'Irving Chernev',
                        link: 'https://amzn.to/3V36NKg',
                    },
                    {
                        title: "Silman's Complete Endgame Course Parts 3-4",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                ],
            },
            {
                cohort: '1600-1700',
                books: [
                    {
                        title: "Capablanca's Best Endings",
                        author: 'Irving Chernev',
                        link: 'https://amzn.to/3V36NKg',
                    },
                    {
                        title: "Silman's Complete Endgame Course Parts 4, 5, and 9",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                ],
            },
            {
                cohort: '1700-1800',
                books: [
                    {
                        title: "Silman's Complete Endgame Course Parts 5, 6, and 9",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                    {
                        title: 'Endgame Strategy (original version preferred)',
                        author: 'Mikhail Shereshevsky',
                        link: 'https://amzn.to/3J3K2k3',
                    },
                ],
            },
            {
                cohort: '1800-1900',
                books: [
                    {
                        title: "Silman's Complete Endgame Course Parts 6 and 9",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                    {
                        title: 'Endgame Strategy (original version preferred)',
                        author: 'Mikhail Shereshevsky',
                        link: 'https://amzn.to/3J3K2k3',
                    },
                ],
            },
            {
                cohort: '1900-2000',
                books: [
                    {
                        title: "Silman's Complete Endgame Course Parts 6 and 9",
                        author: 'Jeremy Silman',
                        link: 'https://amzn.to/3Yt3goN',
                    },
                    {
                        title: 'Endgame Virtuoso',
                        author: 'Vasily Smyslov',
                        link: 'https://amzn.to/3yobRyE',
                    },
                ],
            },
            {
                cohort: '2000-2100',
                books: [
                    {
                        title: 'Endgame Strategy',
                        author: 'Mikhail Shereshevsky',
                        link: 'https://amzn.to/3J3K2k3',
                    },
                    {
                        title: '100 Endgames You Must Know',
                        author: 'Jesus de la Villa',
                        link: 'https://amzn.to/3J2hSpo',
                    },
                    {
                        title: 'Endgame Virtuoso',
                        author: 'Vasily Smyslov',
                        link: 'https://amzn.to/3yobRyE',
                    },
                    {
                        title: 'Mastering Endgame Strategy',
                        author: 'Johan Hellsten',
                        link: 'https://www.amazon.com/Mastering-Endgame-Strategy-Johan-Hellsten/dp/1781940185',
                    },
                ],
            },
            {
                cohort: '2100-2200',
                books: [
                    {
                        title: '100 Endgames You Must Know',
                        author: 'Jesus de la Villa',
                        link: 'https://amzn.to/3J2hSpo',
                    },
                    {
                        title: 'Endgame Virtuoso',
                        author: 'Vasily Smyslov',
                        link: 'https://amzn.to/3yobRyE',
                    },
                    {
                        title: 'Mastering Endgame Strategy',
                        author: 'Johan Hellsten',
                        link: 'https://www.amazon.com/Mastering-Endgame-Strategy-Johan-Hellsten/dp/1781940185',
                    },
                ],
            },
            {
                cohort: '2200-2300',
                books: [
                    {
                        title: '100 Endgames You Must Know',
                        author: 'Jesus de la Villa',
                        link: 'https://amzn.to/3J2hSpo',
                    },
                    {
                        title: 'Rook Endings',
                        author: 'Grigory Levenfish & Vasily Smyslov',
                        link: 'https://amzn.to/3ZIYmW0',
                    },
                ],
            },
            {
                cohort: '2300-2400',
                books: [
                    {
                        title: 'Rook Endings',
                        author: 'Grigory Levenfish & Vasily Smyslov',
                        link: 'https://amzn.to/3ZIYmW0',
                    },
                    {
                        title: 'Endgame Tactics',
                        author: 'Ger van Perlo',
                        link: 'https://amzn.to/3T1lbBK',
                    },
                    {
                        title: 'Practical Rook Endgames',
                        author: 'Victor Korchnoi',
                        link: 'https://amzn.to/4kmeUxi',
                    },
                    {
                        title: "Dvoretsky's Endgame Manual",
                        author: 'Mark Dvoretsky',
                        link: 'https://amzn.to/3JoaVk1',
                    },
                ],
            },
            {
                cohort: '2400+',
                books: [
                    {
                        title: 'Rook Endings',
                        author: 'Grigory Levenfish & Vasily Smyslov',
                        link: 'https://amzn.to/3ZIYmW0',
                    },
                    {
                        title: 'Endgame Tactics',
                        author: 'Ger van Perlo',
                        link: 'https://amzn.to/3T1lbBK',
                    },
                    {
                        title: 'Practical Rook Endgames',
                        author: 'Victor Korchnoi',
                        link: 'https://amzn.to/4kmeUxi',
                    },
                    {
                        title: "Dvoretsky's Endgame Manual",
                        author: 'Mark Dvoretsky',
                        link: 'https://amzn.to/3JoaVk1',
                    },
                ],
            },
        ],
    },
];
