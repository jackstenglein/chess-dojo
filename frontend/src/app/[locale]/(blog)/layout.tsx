import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'ChessDojo Blog',
    description: 'Covering all topics related to Chess training and improvement',
    keywords: ['Chess', 'Dojo', 'Training', 'Improvement'],
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return children;
}
