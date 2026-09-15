import { CoursePurchaseOption } from '@/database/course';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PurchaseOptionsEditor } from './PurchaseOptionsEditor';

const theme = createTheme();

function Harness({ initial = [] }: { initial?: CoursePurchaseOption[] }) {
    const [options, setOptions] = useState(initial);
    return (
        <ThemeProvider theme={theme}>
            <PurchaseOptionsEditor options={options} onChange={setOptions} />
        </ThemeProvider>
    );
}

afterEach(cleanup);

describe('PurchaseOptionsEditor', () => {
    it('shows an empty state when there are no options', () => {
        render(<Harness />);
        expect(screen.getByText(/No purchase options/)).toBeInTheDocument();
    });

    it('adds a purchase option', () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
        expect(screen.getByLabelText('Option name')).toHaveValue('');
        expect(screen.getByLabelText('Full price (USD)')).toHaveValue(null);
        expect(screen.getByLabelText('Sale price (USD)')).toHaveValue(null);
    });

    it('converts dollar inputs to cents', () => {
        render(
            <Harness initial={[{ name: '', fullPrice: 0, currentPrice: 0, sellingPoints: [] }]} />,
        );
        fireEvent.change(screen.getByLabelText('Full price (USD)'), { target: { value: '49' } });
        fireEvent.change(screen.getByLabelText('Sale price (USD)'), { target: { value: '12.99' } });
        expect(screen.getByLabelText('Full price (USD)')).toHaveValue(49);
        expect(screen.getByLabelText('Sale price (USD)')).toHaveValue(12.99);
    });

    it('treats a blank price as zero', () => {
        render(
            <Harness
                initial={[{ name: 'Full', fullPrice: 4900, currentPrice: 1299, sellingPoints: [] }]}
            />,
        );
        expect(screen.getByLabelText('Full price (USD)')).toHaveValue(49);
        fireEvent.change(screen.getByLabelText('Full price (USD)'), { target: { value: '' } });
        expect(screen.getByLabelText('Full price (USD)')).toHaveValue(null);
    });

    it('renames an option', () => {
        render(
            <Harness
                initial={[{ name: '', fullPrice: 100, currentPrice: 0, sellingPoints: [] }]}
            />,
        );
        fireEvent.change(screen.getByLabelText('Option name'), { target: { value: 'Lifetime' } });
        expect(screen.getByLabelText('Option name')).toHaveValue('Lifetime');
    });

    it('adds, edits, and removes a selling point', () => {
        render(
            <Harness
                initial={[{ name: 'Full', fullPrice: 4900, currentPrice: 0, sellingPoints: [] }]}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Add selling point' }));
        fireEvent.change(screen.getByLabelText('Description'), {
            target: { value: 'All videos' },
        });
        expect(screen.getByLabelText('Description')).toHaveValue('All videos');
        expect(screen.getByLabelText('Included')).toBeChecked();

        fireEvent.click(screen.getByLabelText('Included'));
        expect(screen.getByLabelText('Included')).not.toBeChecked();

        fireEvent.click(screen.getByLabelText('Remove selling point'));
        expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    });

    it('removes a purchase option', () => {
        render(
            <Harness
                initial={[{ name: 'Full', fullPrice: 4900, currentPrice: 0, sellingPoints: [] }]}
            />,
        );
        fireEvent.click(screen.getByLabelText('Remove purchase option'));
        expect(screen.getByText(/No purchase options/)).toBeInTheDocument();
    });
});
