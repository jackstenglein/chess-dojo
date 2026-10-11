'use client';

import {
    ContributorStatus,
    PuzzlebaseContributor,
} from '@jackstenglein/chess-dojo-common/src/puzzlebase/api';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { Alert, Button, Collapse, Paper, Stack, Typography } from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';
import { AddContributor } from './AddContributor';
import { AnnotatorLink } from './AnnotatorLink';
import { PuzzlebaseClient } from './puzzlebaseClient';
import { errorMessage } from './puzzlebaseErrors';

const PANEL_HIDDEN_KEY = 'puzzlebase-contributors-panel-hidden';

/**
 * For admins: the applications waiting to become Puzzle Contributors, each with Approve and Deny
 * buttons, then the current contributors (each can be removed) and the people who were denied or
 * removed (each can be approved again). Shows nothing when there is no one to show.
 */
export function ApplicationsPanel({ client }: { client: PuzzlebaseClient }) {
    const [people, setPeople] = useState<PuzzlebaseContributor[]>([]);
    const [working, setWorking] = useState<string>();
    // The contributor whose removal is waiting to be confirmed.
    const [confirming, setConfirming] = useState<string>();
    const [error, setError] = useState<string>();
    const [open, setOpen] = useState<'contributors' | 'closed'>();
    // Whether the panel is open. The choice is remembered on this device.
    const [shown, setShown] = useState(true);

    useEffect(() => {
        try {
            if (window.localStorage.getItem(PANEL_HIDDEN_KEY) === '1') setShown(false);
        } catch {
            // Storage is blocked: the panel just starts open.
        }
    }, []);

    const toggleShown = () => {
        const next = !shown;
        setShown(next);
        try {
            window.localStorage.setItem(PANEL_HIDDEN_KEY, next ? '0' : '1');
        } catch {
            // Not remembered, but the panel still opens and closes.
        }
    };

    useEffect(() => {
        let cancelled = false;
        client
            .listContributors()
            .then((all) => {
                if (!cancelled) setPeople(all);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(errorMessage(err));
            });
        return () => {
            cancelled = true;
        };
    }, [client]);

    const decide = async (
        username: string,
        decision: 'approve' | 'deny' | 'revoke',
        becomes: ContributorStatus,
    ) => {
        setWorking(username);
        setConfirming(undefined);
        setError(undefined);
        try {
            await client[decision](username);
            setPeople((all) =>
                all.map((c) => (c.username === username ? { ...c, status: becomes } : c)),
            );
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setWorking(undefined);
        }
    };

    const withStatus = (...statuses: ContributorStatus[]) =>
        people.filter((c) => statuses.includes(c.status));
    const waiting = withStatus('PENDING');
    const members = withStatus('APPROVED');
    const turnedDown = withStatus('DENIED', 'REVOKED');

    const row = (person: PuzzlebaseContributor, actions: ReactNode) => (
        <Stack
            key={person.username}
            direction='row'
            sx={{ gap: 2, alignItems: 'center', justifyContent: 'space-between' }}
        >
            <Stack sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 'bold' }}>
                    <AnnotatorLink username={person.username} displayName={person.displayName} />
                </Typography>
                {person.message && (
                    <Typography variant='body2' color='text.secondary'>
                        {person.message}
                    </Typography>
                )}
                {person.status === 'APPROVED' && (
                    <Typography variant='body2' color='text.secondary'>
                        {person.role === 'ADMIN' ? 'Puzzle admin · ' : ''}
                        {person.puzzleCount} puzzle{person.puzzleCount === 1 ? '' : 's'} added
                    </Typography>
                )}
            </Stack>
            <Stack direction='row' sx={{ gap: 1 }}>
                {actions}
            </Stack>
        </Stack>
    );

    const approveButton = (person: PuzzlebaseContributor, label = 'Approve') => (
        <Button
            variant='contained'
            size='small'
            disabled={working === person.username}
            onClick={() => decide(person.username, 'approve', 'APPROVED')}
            aria-label={`${label} ${person.displayName}`}
        >
            {label}
        </Button>
    );

    const section = (
        title: string,
        count: number,
        key: 'contributors' | 'closed',
        body: ReactNode,
    ) =>
        count > 0 && (
            <>
                <Button
                    color='inherit'
                    onClick={() => setOpen((v) => (v === key ? undefined : key))}
                    endIcon={open === key ? <ExpandLess /> : <ExpandMore />}
                    sx={{ justifyContent: 'space-between', textTransform: 'none' }}
                >
                    <Typography
                        variant='overline'
                        sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                    >
                        {title} · {count}
                    </Typography>
                </Button>
                <Collapse in={open === key} unmountOnExit>
                    <Stack sx={{ gap: 1.5 }}>{body}</Stack>
                </Collapse>
            </>
        );

    return (
        <Paper variant='outlined' sx={{ p: 2 }}>
            <Button
                color='inherit'
                fullWidth
                onClick={toggleShown}
                aria-expanded={shown}
                endIcon={shown ? <ExpandLess /> : <ExpandMore />}
                sx={{ justifyContent: 'space-between', textTransform: 'none', mb: shown ? 1 : 0 }}
            >
                <Typography variant='overline' sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                    Puzzle Contributors
                    {!shown && waiting.length > 0 ? ` · ${waiting.length} waiting` : ''}
                </Typography>
            </Button>
            <Collapse in={shown} unmountOnExit>
                <Stack sx={{ gap: 1.5 }}>
                    <AddContributor
                        client={client}
                        exclude={withStatus('APPROVED').map((c) => c.username)}
                        onAdded={(added) =>
                            setPeople((all) => [
                                ...all.filter((c) => c.username !== added.username),
                                added,
                            ])
                        }
                    />
                    <Typography
                        variant='overline'
                        sx={{ color: 'text.secondary', lineHeight: 1.4 }}
                    >
                        Applications waiting · {waiting.length}
                    </Typography>
                    {error && <Alert severity='error'>{error}</Alert>}
                    {waiting.map((applicant) =>
                        row(
                            applicant,
                            <>
                                <Button
                                    color='inherit'
                                    size='small'
                                    disabled={working === applicant.username}
                                    onClick={() => decide(applicant.username, 'deny', 'DENIED')}
                                    aria-label={`Deny ${applicant.displayName}`}
                                >
                                    Deny
                                </Button>
                                {approveButton(applicant)}
                            </>,
                        ),
                    )}

                    {section(
                        'Puzzle Contributors',
                        members.length,
                        'contributors',
                        members.map((person) =>
                            row(
                                person,
                                person.role === 'ADMIN' ? null : confirming === person.username ? (
                                    <>
                                        <Button
                                            color='inherit'
                                            size='small'
                                            onClick={() => setConfirming(undefined)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            color='error'
                                            variant='contained'
                                            size='small'
                                            disabled={working === person.username}
                                            onClick={() =>
                                                decide(person.username, 'revoke', 'REVOKED')
                                            }
                                            aria-label={`Confirm removing ${person.displayName}`}
                                        >
                                            Confirm remove
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        color='error'
                                        size='small'
                                        onClick={() => setConfirming(person.username)}
                                        aria-label={`Remove ${person.displayName}`}
                                    >
                                        Remove
                                    </Button>
                                ),
                            ),
                        ),
                    )}

                    {section(
                        'Denied or removed',
                        turnedDown.length,
                        'closed',
                        turnedDown.map((person) =>
                            row(
                                person,
                                <>
                                    <Typography
                                        variant='body2'
                                        color='text.secondary'
                                        sx={{ alignSelf: 'center' }}
                                    >
                                        {person.status === 'DENIED' ? 'Denied' : 'Removed'}
                                    </Typography>
                                    {approveButton(person, 'Approve again')}
                                </>,
                            ),
                        ),
                    )}
                </Stack>
            </Collapse>
        </Paper>
    );
}
