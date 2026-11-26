import { uploadBlogImage } from '@/api/blogApi';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BlogImageUpload } from './BlogImageUpload';
function getFileInput(container: HTMLElement): HTMLInputElement {
    const input = container.querySelector('input');
    if (!input) throw new Error('Upload file input was not rendered');
    return input;
}

vi.mock('@/api/blogApi', () => ({ uploadBlogImage: vi.fn() }));
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});
it('uploads an image and returns its permanent URL', async () => {
    vi.mocked(uploadBlogImage).mockResolvedValue('https://example.com/image.png');
    const onUpload = vi.fn();
    const { container } = render(<BlogImageUpload onUpload={onUpload} />);
    const file = new File(['image'], 'cover.png', { type: 'image/png' });
    fireEvent.change(getFileInput(container), { target: { files: [file] } });
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith('https://example.com/image.png'));
});
it('rejects unsupported files before uploading', () => {
    const { container } = render(<BlogImageUpload onUpload={vi.fn()} />);
    fireEvent.change(getFileInput(container), {
        target: { files: [new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('up to 3 MB');
    expect(uploadBlogImage).not.toHaveBeenCalled();
});
it('shows an error when uploading fails', async () => {
    vi.mocked(uploadBlogImage).mockRejectedValue(new Error('offline'));
    const onUpload = vi.fn();
    const { container } = render(<BlogImageUpload onUpload={onUpload} />);
    fireEvent.change(getFileInput(container), {
        target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Image upload failed');
    expect(onUpload).not.toHaveBeenCalled();
});
