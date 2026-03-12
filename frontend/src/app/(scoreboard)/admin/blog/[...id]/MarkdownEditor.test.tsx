import { ThemeProvider, createTheme } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlogMarkdown, MarkdownEditor } from './MarkdownEditor';

vi.mock('@/app/(blog)/blog/player-spotlight/GameViewer', () => ({
    GameViewer: ({ cohort, id }: { cohort: string; id: string }) => (
        <div data-testid='game-viewer' data-cohort={cohort} data-game-id={id}>
            GameViewer mock
        </div>
    ),
}));

vi.mock('@/components/navigation/Link', () => ({
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

const theme = createTheme();

function renderWithTheme(ui: React.ReactElement) {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('MarkdownEditor', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders Write tab by default with textarea', () => {
        renderWithTheme(<MarkdownEditor value='' onChange={() => null} />);
        expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Write' })).toHaveAttribute('aria-selected', 'true');
    });

    it('shows all four tabs', () => {
        renderWithTheme(<MarkdownEditor value='' />);
        expect(screen.getByRole('tab', { name: 'Write' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Preview' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'List preview' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Syntax' })).toBeInTheDocument();
    });

    it('displays value in write mode', () => {
        renderWithTheme(<MarkdownEditor value='Hello world' onChange={() => null} />);
        const editor = screen.getByTestId('markdown-editor');
        const textbox = within(editor).getByRole('textbox');
        expect(textbox).toHaveValue('Hello world');
    });

    it('calls onChange when typing in write mode', () => {
        const onChange = vi.fn();
        renderWithTheme(<MarkdownEditor value='' onChange={onChange} />);
        const textbox = screen.getByRole('textbox');
        fireEvent.change(textbox, { target: { value: 'x' } });
        expect(onChange).toHaveBeenCalledWith('x');
    });

    it('uses custom placeholder in write mode', () => {
        renderWithTheme(
            <MarkdownEditor value='' placeholder='Custom placeholder' onChange={() => null} />,
        );
        expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('disables textarea when disabled', () => {
        renderWithTheme(<MarkdownEditor value='' disabled onChange={() => null} />);
        expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('Preview tab shows empty message when value is empty', () => {
        renderWithTheme(<MarkdownEditor value='' />);
        fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
        expect(
            screen.getByText('Nothing to preview. Switch to Write to add content.'),
        ).toBeInTheDocument();
    });

    it('Preview tab shows rendered content when value has markdown', () => {
        renderWithTheme(<MarkdownEditor value='# Title\n\nParagraph.' />);
        fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
        const headings = screen.getAllByRole('heading', { level: 1 });
        const contentHeading = headings.find((h) => h.textContent?.includes('Title'));
        expect(contentHeading).toBeDefined();
        expect(contentHeading).toHaveTextContent(/Title/);
        expect(screen.getByText(/Paragraph\./)).toBeInTheDocument();
    });

    it('Preview tab shows title and subtitle when provided', () => {
        renderWithTheme(
            <MarkdownEditor value='Body' title='Blog Title' subtitle='Blog Subtitle' />,
        );
        fireEvent.click(screen.getByRole('tab', { name: 'Preview' }));
        expect(screen.getByTestId('blog-header')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Blog Title' })).toBeInTheDocument();
        expect(screen.getByText('Blog Subtitle')).toBeInTheDocument();
    });

    it('List preview tab shows helper text and card with title and description', () => {
        renderWithTheme(
            <MarkdownEditor
                value=''
                title='My Post'
                description='Short description'
                date='2025-01-15'
            />,
        );
        fireEvent.click(screen.getByRole('tab', { name: 'List preview' }));
        expect(
            screen.getByText('How this post appears on the blog list page:'),
        ).toBeInTheDocument();
        expect(screen.getByTestId('markdown-list-preview')).toBeInTheDocument();
        const listItem = screen.getByTestId(/blog-list-item/);
        expect(within(listItem).getByTestId('list-item-title')).toHaveTextContent('My Post');
        expect(within(listItem).getByTestId('list-item-description')).toHaveTextContent(
            'Short description',
        );
    });

    it('Syntax tab shows Markdown syntax reference and Game viewer', () => {
        renderWithTheme(<MarkdownEditor value='' />);
        fireEvent.click(screen.getByRole('tab', { name: 'Syntax' }));
        expect(screen.getByText('Markdown syntax reference')).toBeInTheDocument();
        expect(screen.getByText('Game viewer')).toBeInTheDocument();
        expect(screen.getByText(/Headings/)).toBeInTheDocument();
        expect(screen.getByText(/Bold and italic/)).toBeInTheDocument();
    });
});

describe('BlogMarkdown', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders plain text as paragraph', () => {
        renderWithTheme(<BlogMarkdown>Plain text</BlogMarkdown>);
        expect(screen.getByText('Plain text')).toBeInTheDocument();
    });

    it('renders # heading as h1', () => {
        renderWithTheme(<BlogMarkdown># Main Title</BlogMarkdown>);
        expect(screen.getByRole('heading', { name: 'Main Title', level: 1 })).toBeInTheDocument();
    });

    it('renders ## and ### headings', () => {
        renderWithTheme(<BlogMarkdown>{'## Section\n\n### Subsection'}</BlogMarkdown>);
        expect(screen.getByRole('heading', { name: 'Section', level: 2 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Subsection', level: 3 })).toBeInTheDocument();
    });

    it('renders **bold** text', () => {
        renderWithTheme(<BlogMarkdown>Hello **bold** world</BlogMarkdown>);
        expect(screen.getByText('bold').closest('strong')).toBeInTheDocument();
    });

    it('renders *italic* text', () => {
        renderWithTheme(<BlogMarkdown>Hello *italic* world</BlogMarkdown>);
        expect(screen.getByText('italic').closest('em')).toBeInTheDocument();
    });

    it('renders [text](url) as link', () => {
        renderWithTheme(<BlogMarkdown>[Click here](https://example.com)</BlogMarkdown>);
        const link = screen.getByRole('link', { name: 'Click here' });
        expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders game:cohort/id link as GameViewer', () => {
        renderWithTheme(<BlogMarkdown>[View game](/game:my-cohort/game-123)</BlogMarkdown>);
        const viewer = screen.getByTestId('game-viewer');
        expect(viewer).toBeInTheDocument();
        expect(viewer).toHaveAttribute('data-cohort', 'my-cohort');
        expect(viewer).toHaveAttribute('data-game-id', 'game-123');
    });

    it('renders YouTube link as embed iframe', () => {
        renderWithTheme(
            <BlogMarkdown>[Watch](https://www.youtube.com/watch?v=dQw4w9WgXcQ)</BlogMarkdown>,
        );
        const iframe = screen.getByTitle('YouTube video');
        expect(iframe).toBeInTheDocument();
        expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('renders blockquote', () => {
        renderWithTheme(<BlogMarkdown>{'> Quoted line'}</BlogMarkdown>);
        expect(screen.getByText('Quoted line')).toBeInTheDocument();
    });

    it('renders inline code', () => {
        renderWithTheme(<BlogMarkdown>Use the `code` function</BlogMarkdown>);
        expect(screen.getByText('code').closest('code')).toBeInTheDocument();
    });

    it('renders horizontal rule', () => {
        const { container } = renderWithTheme(<BlogMarkdown>---</BlogMarkdown>);
        expect(container.querySelector('hr')).toBeInTheDocument();
    });

    it('renders image with correct size', () => {
        renderWithTheme(<BlogMarkdown>![alt](url "400x300")</BlogMarkdown>);
        const image = screen.getByRole('img', { name: 'alt' });
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('width', '400');
        expect(image).toHaveAttribute('height', '300');
    });
});
