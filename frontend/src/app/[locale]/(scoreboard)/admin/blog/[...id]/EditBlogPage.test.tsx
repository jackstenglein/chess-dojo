import { createBlog, updateBlog } from '@/api/blogApi';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { EditBlogPage } from './EditBlogPage';
vi.mock('@/api/blogApi', () => ({ createBlog: vi.fn(), updateBlog: vi.fn(), getBlog: vi.fn() }));
vi.mock('@/auth/Auth', () => ({
    AuthStatus: { Loading: 'loading' },
    useAuth: () => ({ status: 'authenticated', user: { isAdmin: true } }),
}));
vi.mock('@/hooks/useRouter', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/components/navigation/Link', () => ({
    Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('./MarkdownEditor', () => ({ MarkdownEditor: () => null }));
vi.mock('./BlogImageUpload', () => ({ BlogImageUpload: () => null }));
vi.mock('@mui/x-date-pickers-pro', () => ({ DatePicker: () => null }));
afterEach(cleanup);
it('updates the saved draft when publishing instead of creating a duplicate', async () => {
    vi.mocked(createBlog).mockResolvedValue({ data: { id: 'my-draft' } } as Awaited<
        ReturnType<typeof createBlog>
    >);
    vi.mocked(updateBlog).mockResolvedValue({ data: { id: 'my-draft' } } as Awaited<
        ReturnType<typeof updateBlog>
    >);
    render(<EditBlogPage />);
    for (const [name, value] of [
        ['URL slug', 'my-draft'],
        ['Title', 'Title'],
        ['Subtitle', 'Subtitle'],
        ['Description', 'Description'],
    ]) {
        fireEvent.change(screen.getByRole('textbox', { name: new RegExp(`^${name}`) }), {
            target: { value },
        });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Create post' }));
    await screen.findByRole('button', { name: 'Update post' });
    expect(screen.getByRole('textbox', { name: /URL slug/ })).toBeDisabled();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Published' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update post' }));
    await waitFor(() =>
        expect(updateBlog).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'my-draft', status: 'PUBLISHED' }),
        ),
    );
    expect(createBlog).toHaveBeenCalledTimes(1);
});
