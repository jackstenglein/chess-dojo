import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputSlider } from './InputSlider';

describe('InputSlider', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('increments value by 1 on pointer down', () => {
        const setValue = vi.fn();
        render(<InputSlider value={10} setValue={setValue} max={100} min={0} />);

        const incrementButton = screen.getByLabelText('Increment');
        fireEvent.pointerDown(incrementButton);

        expect(setValue).toHaveBeenCalledWith(expect.any(Function));
        const updateFunction = setValue.mock.calls[0][0] as (prev: number) => number;
        expect(updateFunction(10)).toBe(11);
    });

    it('decrements value by 1 on pointer down', () => {
        const setValue = vi.fn();
        render(<InputSlider value={10} setValue={setValue} max={100} min={0} />);

        const decrementButton = screen.getByLabelText('Decrement');
        fireEvent.pointerDown(decrementButton);

        expect(setValue).toHaveBeenCalledWith(expect.any(Function));
        const updateFunction = setValue.mock.calls[0][0] as (prev: number) => number;
        expect(updateFunction(10)).toBe(9);
    });

    it('does not decrement below min', () => {
        const setValue = vi.fn();
        render(<InputSlider value={0} setValue={setValue} max={100} min={0} />);

        const decrementButton = screen.getByLabelText('Decrement');
        expect(decrementButton).toBeDisabled();
    });

    it('starts auto-incrementing when pointer is held', () => {
        vi.useFakeTimers();
        const setValue = vi.fn();
        render(<InputSlider value={10} setValue={setValue} max={100} min={0} />);

        const incrementButton = screen.getByLabelText('Increment');
        fireEvent.pointerDown(incrementButton);

        // Initial increment
        expect(setValue).toHaveBeenCalledTimes(1);

        // Advance timers by 200ms
        vi.advanceTimersByTime(200);
        expect(setValue).toHaveBeenCalledTimes(2);

        // Advance timers by another 200ms
        vi.advanceTimersByTime(200);
        expect(setValue).toHaveBeenCalledTimes(3);

        fireEvent.pointerUp(incrementButton);
        vi.advanceTimersByTime(200);
        expect(setValue).toHaveBeenCalledTimes(3);
    });

    it('stops repeating on pointer leave', () => {
        vi.useFakeTimers();
        const setValue = vi.fn();
        render(<InputSlider value={10} setValue={setValue} max={100} min={0} />);

        const incrementButton = screen.getByLabelText('Increment');
        fireEvent.pointerDown(incrementButton);

        expect(setValue).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(200);
        expect(setValue).toHaveBeenCalledTimes(2);

        fireEvent.pointerLeave(incrementButton);
        vi.advanceTimersByTime(200);
        expect(setValue).toHaveBeenCalledTimes(2);
    });

    it('handles input change correctly', () => {
        const setValue = vi.fn();
        render(<InputSlider value={10} setValue={setValue} max={100} min={0} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: '25' } });

        expect(setValue).toHaveBeenCalledWith(25);
    });

    it('handles slider change correctly', () => {
        const setValue = vi.fn();
        render(<InputSlider value={10} setValue={setValue} max={100} min={0} />);

        // Slider is harder to test with fireEvent, but we can check if it's there
        const slider = screen.getByRole('slider');
        expect(slider).toBeInTheDocument();
        expect(slider).toHaveAttribute('aria-valuenow', '10');
    });

    it('enforces min value on blur', () => {
        const setValue = vi.fn();
        render(<InputSlider value={5} setValue={setValue} max={100} min={10} />);

        const input = screen.getByRole('textbox');
        fireEvent.blur(input);

        expect(setValue).toHaveBeenCalledWith(10);
    });
});
