let devUser: string;

describe('Round Robin Submit Results Page', () => {
    beforeEach(() => {

        devUser = cy.dojo.env('dev_username');

        cy.loginByCognitoApi(
            'test',
            cy.dojo.env('cognito_username'),
            cy.dojo.env('cognito_password'),
        );

        cy.intercept(
            {
                method: 'GET',
                url: '**/public/tournaments/round-robin*',
                query: { status: 'ACTIVE', cohort: '1500-1600' },
            },
            {
                statusCode: 200,
                body: {
                    tournaments: [
                        {
                            type: 'ROUND_ROBIN_1500-1600',
                            startsAt: 'ACTIVE_2026-02-22T16:00:00Z',
                            cohort: '1500-1600',
                            name: 'Round Robin 1',
                            startDate: '2026-02-22T16:00:00Z',
                            endDate: '2026-03-22T20:00:00Z',
                            players: {
                                shatterednirvana: {
                                    username: 'shatterednirvana',
                                    displayName: 'Shattered Nirvana',
                                    lichessUsername: 'shatterednirvana',
                                    chesscomUsername: 'shatterednirvana',
                                    discordUsername: 'shatterednirvana#1234',
                                    discordId: '1234',
                                    status: 'ACTIVE',
                                },
                                [devUser]: {
                                    username: devUser,
                                    displayName: 'Test Account',
                                    lichessUsername: 'jackstenglein',
                                    chesscomUsername: 'jackstenglein',
                                    discordUsername: 'jackstenglein#1234',
                                    discordId: '5678',
                                    status: 'ACTIVE',
                                },
                                chessmaster3000: {
                                    username: 'chessmaster3000',
                                    displayName: 'Chess Master 3000',
                                    lichessUsername: 'chessmaster3000',
                                    chesscomUsername: 'chessmaster3000',
                                    discordUsername: 'chessmaster3000#5678',
                                    discordId: '9012',
                                    status: 'ACTIVE',
                                },
                                grandmaster5000: {
                                    username: 'grandmaster5000',
                                    displayName: 'Grandmaster 5000',
                                    lichessUsername: 'grandmaster5000',
                                    chesscomUsername: 'grandmaster5000',
                                    discordUsername: 'grandmaster5000#9012',
                                    discordId: '3456',
                                    status: 'ACTIVE',
                                },
                            },
                            playerOrder: ['shatterednirvana', devUser, 'chessmaster3000', 'grandmaster5000'],
                            pairings: [],
                            updatedAt: '2026-02-22T15:00:00Z',
                        },
                    ],
                },
            }
        ).as('listRoundRobins');

    });

    it('loads the round robin page', () => {

        cy.visit('/tournaments/round-robin');

        cy.wait('@listRoundRobins').then((interception) => {
            cy.task('log', 'This will appear in the CLI');
            cy.task('log', interception.response?.body.tournaments[0]);
        })
    });
});