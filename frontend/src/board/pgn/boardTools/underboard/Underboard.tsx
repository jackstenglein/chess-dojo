import useGame from '@/context/useGame';
import { useLightMode } from '@/style/useLightMode';
import {
    AccessAlarm,
    Article,
    Chat,
    Construction,
    Edit,
    Folder,
    MoreHoriz,
    Sell,
    Settings as SettingsIcon,
    Share,
    Storage,
} from '@mui/icons-material';
import {
    Card,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    ToggleButtonProps,
    Tooltip,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import React, {
    forwardRef,
    useCallback,
    useImperativeHandle,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { Resizable, ResizeCallbackData } from 'react-resizable';
import { useLocalStorage } from 'usehooks-ts';
import { AuthStatus, useAuth } from '../../../../auth/Auth';
import { useChess } from '../../PgnBoard';
import ResizeHandle from '../../ResizeHandle';
import Explorer from '../../explorer/Explorer';
import { PlayerOpeningTreeProvider } from '../../explorer/player/PlayerOpeningTree';
import { UnderboardPgnText } from '../../pgnText/PgnText';
import { ResizableData } from '../../resize';
import Editor from './Editor';
import ClockUsage from './clock/ClockUsage';
import Comments from './comments/Comments';
import { Directories } from './directories/Directories';
import Settings from './settings/Settings';
import { ShortcutAction, ShortcutBindings } from './settings/ShortcutAction';
import { ShareTab } from './share/ShareTab';
import Tags from './tags/Tags';
import { Tools } from './tools/Tools';
import {
    CustomUnderboardTab,
    DefaultUnderboardTab,
    DefaultUnderboardTabInfo,
    UnderboardTab,
} from './underboardTabs';

const MIN_TAB_BUTTON_WIDTH = 40;

function getTabInfo(
    tab: UnderboardTab,
    tabInfo: Record<DefaultUnderboardTab, DefaultUnderboardTabInfo>,
): DefaultUnderboardTabInfo {
    if (typeof tab === 'string') {
        return tabInfo[tab];
    }
    return tab;
}

function getTabName(tab: UnderboardTab): string {
    return typeof tab === 'string' ? tab : tab.name;
}

export interface UnderboardApi {
    switchTab: (tab: DefaultUnderboardTab) => void;
    focusEditor: () => void;
    focusCommenter: () => void;
}

interface UnderboardProps {
    tabs: UnderboardTab[];
    initialTab?: string;
    resizeData: ResizableData;
    onResize: (width: number, height: number) => void;
    storageKey?: string;
    explorerStorageKey?: string;
    buttonTestIdPrefix?: string;
    header?: ReactNode;
    sidePanelTabs?: DefaultUnderboardTab[];
}

const Underboard = forwardRef<UnderboardApi, UnderboardProps>(
    (
        {
            tabs,
            initialTab,
            resizeData,
            onResize,
            storageKey = 'underboardTab',
            explorerStorageKey,
            buttonTestIdPrefix = '',
            header,
            sidePanelTabs,
        },
        ref,
    ) => {
        const auth = useAuth();
        const { chess } = useChess();
        const { game, isOwner } = useGame();
        const [focusEditor, setFocusEditor] = useState(false);
        const [focusCommenter, setFocusCommenter] = useState(false);
        const [moreAnchor, setMoreAnchor] = useState<HTMLElement>();
        const [keyBindings] = useLocalStorage(ShortcutBindings.key, ShortcutBindings.default);

        const t = useTranslations('analysisBoard.underboard');
        const tSettings = useTranslations('analysisBoard.underboard.settings');

        const keyLabels = useMemo<Record<string, string>>(
            () => ({
                ArrowLeft: tSettings('keyArrowLeft'),
                ArrowRight: tSettings('keyArrowRight'),
                ArrowUp: tSettings('keyArrowUp'),
                ArrowDown: tSettings('keyArrowDown'),
                Space: tSettings('keySpace'),
                Enter: tSettings('keyEnter'),
                Escape: tSettings('keyEscape'),
                Tab: tSettings('keyTab'),
                Backspace: tSettings('keyBackspace'),
            }),
            [tSettings],
        );

        const tabInfo = useMemo(
            () => ({
                [DefaultUnderboardTab.Directories]: {
                    name: DefaultUnderboardTab.Directories,
                    tooltip: t('directoriesTab'),
                    icon: <Folder />,
                    shortcut: ShortcutAction.OpenFiles,
                },
                [DefaultUnderboardTab.PgnText]: {
                    name: DefaultUnderboardTab.PgnText,
                    tooltip: 'PGN Text',
                    icon: <Article />,
                    shortcut: ShortcutAction.OpenPgnText,
                },
                [DefaultUnderboardTab.Tags]: {
                    name: DefaultUnderboardTab.Tags,
                    tooltip: t('tagsTab'),
                    icon: <Sell />,
                    shortcut: ShortcutAction.OpenTags,
                },
                [DefaultUnderboardTab.Editor]: {
                    name: DefaultUnderboardTab.Editor,
                    tooltip: t('editorTab'),
                    icon: <Edit />,
                    shortcut: ShortcutAction.OpenEditor,
                },
                [DefaultUnderboardTab.Comments]: {
                    name: DefaultUnderboardTab.Comments,
                    tooltip: t('commentsTab'),
                    icon: <Chat />,
                    shortcut: ShortcutAction.OpenComments,
                },
                [DefaultUnderboardTab.Explorer]: {
                    name: DefaultUnderboardTab.Explorer,
                    tooltip: t('explorerTab'),
                    icon: <Storage />,
                    shortcut: ShortcutAction.OpenDatabase,
                },
                [DefaultUnderboardTab.Clocks]: {
                    name: DefaultUnderboardTab.Clocks,
                    tooltip: t('clocksTab'),
                    icon: <AccessAlarm />,
                    shortcut: ShortcutAction.OpenClocks,
                },
                [DefaultUnderboardTab.Share]: {
                    name: DefaultUnderboardTab.Share,
                    tooltip: t('shareTab'),
                    icon: <Share />,
                    shortcut: ShortcutAction.OpenShare,
                },
                [DefaultUnderboardTab.Settings]: {
                    name: DefaultUnderboardTab.Settings,
                    tooltip: t('settingsTab'),
                    icon: <SettingsIcon />,
                    shortcut: ShortcutAction.OpenSettings,
                },
                [DefaultUnderboardTab.Tools]: {
                    name: DefaultUnderboardTab.Tools,
                    tooltip: t('toolsTab'),
                    icon: <Construction />,
                },
            }),
            [t],
        );

        const maxTabs = Math.max(2, Math.floor(resizeData.width / MIN_TAB_BUTTON_WIDTH));
        let displayedTabs = tabs;
        let hiddenTabs: UnderboardTab[] = [];
        if (tabs.length > maxTabs) {
            displayedTabs = tabs.slice(0, maxTabs - 1);
            hiddenTabs = tabs.slice(maxTabs - 1);
        }

        const fallbackTab = useMemo(
            () =>
                isOwner
                    ? DefaultUnderboardTab.Editor
                    : game
                      ? DefaultUnderboardTab.Tags
                      : DefaultUnderboardTab.Explorer,
            [isOwner, game],
        );

        const [storedTab, setStoredTab] = useLocalStorage<string>(storageKey, fallbackTab);

        // Local override for pages with forced initialTab (puzzles, exams, analysis).
        // Allows tab switching without persisting to localStorage.
        const [localOverride, setLocalOverride] = useState<string | null>(null);

        const underboard = useMemo(() => {
            const tabExists = (tab?: string | null) =>
                Boolean(tab && tabs.some((t) => getTabName(t) === tab));
            const firstTab = tabs[0] ? getTabName(tabs[0]) : fallbackTab;

            if (localOverride && tabExists(localOverride)) {
                return localOverride;
            }
            if (initialTab && tabExists(initialTab)) {
                return initialTab;
            }
            if (tabExists(storedTab)) {
                return storedTab;
            }
            if (tabExists(fallbackTab)) {
                return fallbackTab;
            }
            return firstTab;
        }, [localOverride, initialTab, tabs, storedTab, fallbackTab]);

        const setUnderboard = useCallback(
            (tab: string) => {
                if (initialTab) {
                    setLocalOverride(tab);
                } else {
                    setStoredTab(tab);
                }
            },
            [initialTab, setStoredTab],
        );

        const light = useLightMode();

        useImperativeHandle(ref, () => {
            return {
                switchTab(tab: DefaultUnderboardTab) {
                    if (tabs.includes(tab)) {
                        setUnderboard(tab);
                    }
                },
                focusEditor() {
                    if (isOwner) {
                        setUnderboard(DefaultUnderboardTab.Editor);
                        setFocusEditor(true);
                    } else if (tabs.includes(DefaultUnderboardTab.Comments)) {
                        setUnderboard(DefaultUnderboardTab.Comments);
                        setFocusCommenter(true);
                    }
                },
                focusCommenter() {
                    if (tabs.includes(DefaultUnderboardTab.Comments)) {
                        setUnderboard(DefaultUnderboardTab.Comments);
                        setFocusCommenter(true);
                    }
                },
            };
        }, [tabs, setUnderboard, isOwner, setFocusEditor, setFocusCommenter]);

        const handleResize = (_: React.SyntheticEvent, data: ResizeCallbackData) => {
            onResize(Math.floor(data.size.width), Math.floor(data.size.height));
        };

        const isAuthenticated = auth.status === AuthStatus.Authenticated;

        if (tabs.length === 0) {
            return null;
        }

        const customTab = tabs.find(
            (tab) => typeof tab !== 'string' && tab.name === underboard,
        ) as CustomUnderboardTab;

        return (
            <Resizable
                width={resizeData.width}
                height={resizeData.height}
                onResize={handleResize}
                minConstraints={[resizeData.minWidth, resizeData.minHeight]}
                maxConstraints={[resizeData.maxWidth, resizeData.maxHeight]}
                handle={<ResizeHandle />}
            >
                <Stack
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        mt: { xs: 1, xl: 0 },
                        width: `${resizeData.width}px`,
                        height: `${resizeData.height}px`,
                        order: resizeData.order,
                        visibility: chess ? undefined : 'hidden',
                        gap: header ? 1 : 0,
                        minHeight: 0,
                    }}
                >
                    {header && <Stack sx={{ flexShrink: 0 }}>{header}</Stack>}

                    <Card
                        elevation={light ? undefined : 3}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'none',
                            maxHeight: { xl: 1 },
                            flexGrow: 1,
                            minHeight: 0,
                        }}
                        variant={light ? 'outlined' : 'elevation'}
                    >
                        {tabs.length > 1 && (
                            <Paper elevation={10} sx={{ boxShadow: 'none' }}>
                                <ToggleButtonGroup
                                    size='small'
                                    exclusive
                                    value={underboard}
                                    onChange={(_, val: string | null) => val && setUnderboard(val)}
                                    fullWidth
                                >
                                    {displayedTabs.map((tab, index) => {
                                        const info = getTabInfo(tab, tabInfo);

                                        return (
                                            <UnderboardButton
                                                key={info.name}
                                                tooltip={info.tooltip}
                                                value={info.name}
                                                shortcut={info.shortcut}
                                                testIdPrefix={buttonTestIdPrefix}
                                                sx={{
                                                    borderTop: light ? 0 : undefined,

                                                    borderLeft:
                                                        index === 0 && light ? 0 : undefined,
                                                    borderRight:
                                                        index === tabs.length - 1 && light
                                                            ? 0
                                                            : undefined,

                                                    borderBottomRightRadius: 0,
                                                    borderBottomLeftRadius: 0,
                                                }}
                                            >
                                                {info.icon}
                                            </UnderboardButton>
                                        );
                                    })}

                                    {hiddenTabs.length > 0 && (
                                        <UnderboardButton
                                            tooltip={t('more')}
                                            value='more'
                                            testIdPrefix={buttonTestIdPrefix}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setMoreAnchor(e.currentTarget);
                                            }}
                                        >
                                            <MoreHoriz />
                                        </UnderboardButton>
                                    )}
                                </ToggleButtonGroup>
                            </Paper>
                        )}

                        <Menu
                            anchorEl={moreAnchor}
                            open={!!moreAnchor}
                            onClose={() => setMoreAnchor(undefined)}
                        >
                            {hiddenTabs.map((tab) => {
                                const info = getTabInfo(tab, tabInfo);

                                if (info.shortcut) {
                                    const binding =
                                        keyBindings[info.shortcut] ||
                                        ShortcutBindings.default[info.shortcut];
                                    if (binding.key) {
                                        const keyLabel = keyLabels[binding.key] ?? binding.key;
                                        info.tooltip += ` (${binding.modifier ? `${binding.modifier}+` : ''}${keyLabel})`;
                                    }
                                }

                                return (
                                    <MenuItem
                                        key={info.name}
                                        onClick={() => {
                                            setUnderboard(info.name);
                                            setMoreAnchor(undefined);
                                        }}
                                        selected={info.name === underboard}
                                    >
                                        <ListItemIcon>{info.icon}</ListItemIcon>
                                        <ListItemText>{info.tooltip}</ListItemText>
                                    </MenuItem>
                                );
                            })}
                        </Menu>

                        <Stack
                            data-testid={`${buttonTestIdPrefix}underboard-tab-content`}
                            sx={{
                                overflowY:
                                    underboard === DefaultUnderboardTab.PgnText ? 'hidden' : 'auto',
                                flexGrow: 1,
                                minHeight: 0,
                            }}
                        >
                            {underboard === DefaultUnderboardTab.Directories && <Directories />}
                            {underboard === DefaultUnderboardTab.PgnText && <UnderboardPgnText />}
                            {underboard === DefaultUnderboardTab.Tags && (
                                <Tags game={game} allowEdits={isOwner} />
                            )}
                            {underboard === DefaultUnderboardTab.Editor && (
                                <Editor focusEditor={focusEditor} setFocusEditor={setFocusEditor} />
                            )}
                            {underboard === DefaultUnderboardTab.Explorer && (
                                <PlayerOpeningTreeProvider>
                                    <Explorer storageKey={explorerStorageKey} />
                                </PlayerOpeningTreeProvider>
                            )}
                            {underboard === DefaultUnderboardTab.Settings && (
                                <Settings showEditor={isOwner} sidePanelTabs={sidePanelTabs} />
                            )}
                            {underboard === DefaultUnderboardTab.Clocks && (
                                <ClockUsage showEditor={isOwner} />
                            )}
                            {underboard === DefaultUnderboardTab.Comments && (
                                <Comments
                                    isReadonly={!isAuthenticated}
                                    focusEditor={focusCommenter}
                                    setFocusEditor={setFocusCommenter}
                                />
                            )}
                            {underboard === DefaultUnderboardTab.Share && <ShareTab />}
                            {underboard === DefaultUnderboardTab.Tools && <Tools />}

                            {customTab?.element}
                        </Stack>
                    </Card>
                </Stack>
            </Resizable>
        );
    },
);
Underboard.displayName = 'Underboard';

interface UnderboardButtonProps extends ToggleButtonProps {
    tooltip: string;
    value: string;
    shortcut?: ShortcutAction;
    testIdPrefix?: string;
}

function UnderboardButton({
    children,
    value,
    tooltip,
    shortcut,
    testIdPrefix = '',
    ...props
}: UnderboardButtonProps) {
    const [keyBindings] = useLocalStorage(ShortcutBindings.key, ShortcutBindings.default);
    const tSettings = useTranslations('analysisBoard.underboard.settings');
    const keyLabels = useMemo<Record<string, string>>(
        () => ({
            ArrowLeft: tSettings('keyArrowLeft'),
            ArrowRight: tSettings('keyArrowRight'),
            ArrowUp: tSettings('keyArrowUp'),
            ArrowDown: tSettings('keyArrowDown'),
            Space: tSettings('keySpace'),
            Enter: tSettings('keyEnter'),
            Escape: tSettings('keyEscape'),
            Tab: tSettings('keyTab'),
            Backspace: tSettings('keyBackspace'),
        }),
        [tSettings],
    );
    if (shortcut) {
        const binding = keyBindings[shortcut] || ShortcutBindings.default[shortcut];
        if (binding.key) {
            const keyLabel = keyLabels[binding.key] ?? binding.key;
            tooltip += ` (${binding.modifier ? `${binding.modifier}+` : ''}${keyLabel})`;
        }
    }

    return (
        <Tooltip title={tooltip}>
            <ToggleButton
                data-testid={`${testIdPrefix}underboard-button-${value}`}
                value={value}
                {...props}
            >
                {children}
            </ToggleButton>
        </Tooltip>
    );
}

export default Underboard;
