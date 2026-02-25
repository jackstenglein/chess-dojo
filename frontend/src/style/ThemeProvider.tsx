'use client';

import { RequirementCategory } from '@/database/requirement';
import { Box, CssBaseline } from '@mui/material';
import { blue, deepPurple } from '@mui/material/colors';
import {
    ThemeProvider as MuiThemeProvider,
    PaletteColor,
    createTheme,
    useColorScheme,
} from '@mui/material/styles';
import { ReactNode, useEffect } from 'react';

export const CategoryColors: Record<RequirementCategory, string> = {
    [RequirementCategory.SuggestedTasks]: '#c27ba0',
    [RequirementCategory.Welcome]: '#c27ba0',
    [RequirementCategory.Games]: '#faa137',
    [RequirementCategory.Tactics]: '#82e356',
    [RequirementCategory.Middlegames]: '#5f5ffa',
    [RequirementCategory.Endgame]: '#916af7',
    [RequirementCategory.Opening]: '#f05b5b',
    [RequirementCategory.Graduation]: '#fc6156',
    [RequirementCategory.NonDojo]: '#dbdbdb',
    [RequirementCategory.Pinned]: '#c27ba0',
};

// Extremely degen stuff to force the type system to accept the result
// of themeRequirementCategory as a valid theme value.
// TODO: figure out a way to migrate this.
enum requirementCategoryOverrides {
    forceOverride = 'forceOverride',
}

// Extremely degen stuff to force the type system to accept the result
// of themeRequirementCategory as a valid theme value.
// TODO: figure out a way to migrate this.
type RequirementCategoryOverrides = Partial<Record<requirementCategoryOverrides, true>>;

/**
 * Converts the given requirement category to a value that can be passed to
 * a MUI theme option.
 * @param category The category to convert.
 * @returns A value that can be passed to a MUI theme option.
 */
export function themeRequirementCategory(
    category: RequirementCategory,
): requirementCategoryOverrides {
    return category
        .toLowerCase()
        .replaceAll(/[^a-z]/g, '') as unknown as requirementCategoryOverrides;
}

type RequirementCategoryPalette = Partial<Record<requirementCategoryOverrides, PaletteColor>>;

declare module '@mui/material/styles' {
    interface Palette extends RequirementCategoryPalette {
        opening: Palette['primary'];
        endgame: Palette['primary'];
        dojoOrange: Palette['primary'];
        subscribe: Palette['primary'];
        coaching: Palette['primary'];
        liga: Palette['primary'];
        book: Palette['primary'];
        meet: Palette['primary'];
        explorerTotal: Palette['primary'];
        trainingPlanTaskComplete: Palette['primary'];

        // Calendar colors
        tomato: Palette['primary'];
        flamingo: Palette['primary'];
        tangerine: Palette['primary'];
        banana: Palette['primary'];
        sage: Palette['primary'];
        basil: Palette['primary'];
        peacock: Palette['primary'];
        blueberry: Palette['primary'];
        lavendar: Palette['primary'];
        grape: Palette['primary'];
        graphite: Palette['primary'];
    }
    interface PaletteOptions extends RequirementCategoryPalette {
        opening?: PaletteOptions['primary'];
        endgame?: Palette['primary'];
        dojoOrange?: PaletteOptions['primary'];
        subscribe?: PaletteOptions['primary'];
        coaching?: PaletteOptions['primary'];
        liga?: PaletteOptions['primary'];
        book?: Palette['primary'];
        meet?: Palette['primary'];
        explorerTotal?: Palette['primary'];
        trainingPlanTaskComplete?: Palette['primary'];
        DataGrid: {
            bg: string;
            headerBg: string;
            pinnedBg: string;
        };
        // Calendar colors
        tomato: Palette['primary'];
        flamingo: Palette['primary'];
        tangerine: Palette['primary'];
        banana: Palette['primary'];
        sage: Palette['primary'];
        basil: Palette['primary'];
        peacock: Palette['primary'];
        blueberry: Palette['primary'];
        lavendar: Palette['primary'];
        grape: Palette['primary'];
        graphite: Palette['primary'];
    }
}

declare module '@mui/material' {
    interface ChipPropsColorOverrides extends RequirementCategoryOverrides {
        opening: true;
        endgame: true;
        dojoOrange: true;
        subscribe: true;
        coaching: true;
        liga: true;
        book: true;
        meet: true;
    }

    interface CheckboxPropsColorOverrides extends RequirementCategoryOverrides {
        opening: true;
        endgame: true;
        dojoOrange: true;
        subscribe: true;
        coaching: true;
        liga: true;
        book: true;
        meet: true;
        trainingPlanTaskComplete: true;
    }

    interface ButtonPropsColorOverrides extends RequirementCategoryOverrides {
        opening: true;
        endgame: true;
        dojoOrange: true;
        subscribe: true;
        coaching: true;
        liga: true;
        book: true;
        meet: true;
        darkBlue: true;
    }

    interface SvgIconPropsColorOverrides extends RequirementCategoryOverrides {
        opening: true;
        endgame: true;
        dojoOrange: true;
        subscribe: true;
        coaching: true;
        liga: true;
        book: true;
        meet: true;
        youtube: true;
        twitch: true;
        darkBlue: true;
        sage: true;
    }
}

const defaultTheme = createTheme({});

const defaultPalette = {
    DataGrid: {
        bg: 'transparent',
        headerBg: 'var(--mui-palette-background-paper)',
        pinnedBg: 'var(--mui-palette-background-paper)',
    },
    meet: defaultTheme.palette.augmentColor({
        color: {
            main: '#93a84f',
        },
        name: 'meet',
    }),
    youtube: defaultTheme.palette.augmentColor({
        color: {
            main: '#FF0000',
        },
        name: 'youtube',
    }),
    twitch: defaultTheme.palette.augmentColor({
        color: {
            main: '#6441a5',
        },
        name: 'twitch',
    }),
    book: defaultTheme.palette.augmentColor({
        color: {
            main: '#d95dc6',
        },
        name: 'book',
    }),
    liga: defaultTheme.palette.augmentColor({
        color: {
            main: '#45b579',
        },
        name: 'liga',
    }),
    dojoOrange: defaultTheme.palette.augmentColor({
        color: {
            main: '#F7941F',
        },
        name: 'dojoOrange',
    }),
    subscribe: defaultTheme.palette.augmentColor({
        color: {
            main: '#1565c0',
        },
        name: 'subscribe',
    }),
    coaching: defaultTheme.palette.augmentColor({
        color: {
            main: deepPurple[200],
        },
        name: 'coaching',
    }),
    trainingPlanTaskComplete: defaultTheme.palette.augmentColor({
        color: {
            main: blue[800],
        },
        name: 'trainingPlanTaskComplete',
    }),
    darkBlue: defaultTheme.palette.augmentColor({
        color: {
            main: 'rgba(24, 117, 238, 1)',
        },
        name: 'darkBlue',
    }),
    tomato: defaultTheme.palette.augmentColor({
        color: {
            main: '#da5234',
        },
        name: 'tomato',
    }),
    flamingo: defaultTheme.palette.augmentColor({
        color: {
            main: '#d6837a',
        },
        name: 'flamingo',
    }),
    tangerine: defaultTheme.palette.augmentColor({
        color: {
            main: '#e3683e',
        },
        name: 'tangerine',
    }),
    banana: defaultTheme.palette.augmentColor({
        color: {
            main: '#e7ba51',
        },
        name: 'banana',
    }),
    sage: defaultTheme.palette.augmentColor({
        color: {
            main: '#55b080',
        },
        name: 'sage',
    }),
    basil: defaultTheme.palette.augmentColor({
        color: {
            main: '#489160',
        },
        name: 'basil',
    }),
    peacock: defaultTheme.palette.augmentColor({
        color: {
            main: '#4b99d2',
        },
        name: 'peacock',
    }),
    blueberry: defaultTheme.palette.augmentColor({
        color: {
            main: '#6e72c3',
        },
        name: 'blueberry',
    }),
    lavendar: defaultTheme.palette.augmentColor({
        color: {
            main: '#828bc2',
        },
        name: 'lavendar',
    }),
    grape: defaultTheme.palette.augmentColor({
        color: {
            main: '#a75aba',
        },
        name: 'grape',
    }),
    graphite: defaultTheme.palette.augmentColor({
        color: {
            main: '#7c7c7c',
        },
        name: 'graphite',
    }),
    ...Object.values(RequirementCategory).reduce<Record<string, PaletteColor>>((acc, category) => {
        acc[themeRequirementCategory(category)] = defaultTheme.palette.augmentColor({
            color: {
                main: CategoryColors[category],
            },
            name: themeRequirementCategory(category),
        });
        return acc;
    }, {}),
};

const theme = createTheme({
    cssVariables: {
        colorSchemeSelector: 'class',
    },
    defaultColorScheme: 'dark',
    colorSchemes: {
        light: {
            palette: {
                ...defaultPalette,
                trainingPlanTaskComplete: defaultTheme.palette.augmentColor({
                    color: {
                        main: blue[400],
                    },
                    name: 'trainingPlanTaskComplete',
                }),
                tomato: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#d50000',
                    },
                    name: 'tomato',
                }),
                flamingo: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#e67c73',
                    },
                    name: 'flamingo',
                }),
                tangerine: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#f4511e',
                    },
                    name: 'tangerine',
                }),
                banana: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#f6bf26',
                    },
                    name: 'banana',
                }),
                sage: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#33b679',
                    },
                    name: 'sage',
                }),
                basil: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#0b8043',
                    },
                    name: 'basil',
                }),
                peacock: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#039be5',
                    },
                    name: 'peacock',
                }),
                blueberry: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#3f51b5',
                    },
                    name: 'blueberry',
                }),
                lavendar: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#7986cb',
                    },
                    name: 'lavendar',
                }),
                grape: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#8e24aa',
                    },
                    name: 'grape',
                }),
                graphite: defaultTheme.palette.augmentColor({
                    color: {
                        main: '#616161',
                    },
                    name: 'graphite',
                }),
            },
        },
        dark: {
            palette: defaultPalette,
        },
    },
});

const ThemeProvider = ({ children }: { children: ReactNode }) => {
    return (
        <MuiThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            <DefaultDarkModeSetter>
                <Box sx={{ '--navbar-height': { xs: '60px', md: '75px' } }}>{children}</Box>
            </DefaultDarkModeSetter>
        </MuiThemeProvider>
    );
};

const DefaultDarkModeSetter = ({ children }: { children: ReactNode }) => {
    const { mode, setMode } = useColorScheme();
    useEffect(() => {
        if (mode === 'system') {
            setMode('dark');
        }
    }, [mode, setMode]);
    return children;
};

export default ThemeProvider;
