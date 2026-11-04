import { deleteBlog } from '@/api/blogApi';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DeleteBlogButton } from './DeleteBlogButton';
vi.mock('@/api/blogApi', () => ({ deleteBlog: vi.fn() }));
afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});
const props = { owner: 'chessdojo', id: 'draft/post', title: 'My draft', onDeleted: vi.fn() };
it('requires confirmation and supports canceling without deleting', () => {
    render(<DeleteBlogButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete post' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('My draft');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(deleteBlog).not.toHaveBeenCalled();
});
it('deletes and notifies the parent after confirmation', async () => {
    vi.mocked(deleteBlog).mockResolvedValue({
        data: { owner: props.owner, id: props.id },
    } as Awaited<ReturnType<typeof deleteBlog>>);
    render(<DeleteBlogButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete post' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    await waitFor(() => expect(props.onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteBlog).toHaveBeenCalledWith({ owner: props.owner, id: props.id });
});
it('keeps the confirmation open and shows failures without removing the post', async () => {
    vi.mocked(deleteBlog).mockRejectedValue(new Error('offline'));
    render(<DeleteBlogButton {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete post' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not delete');
    expect(props.onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeVisible();
});
