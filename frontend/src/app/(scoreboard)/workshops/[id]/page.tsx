import { mockWorkshops } from '@/database/workshop';
import { notFound } from 'next/navigation';
import React from 'react';
import WorkshopClient from './WorkshopClient';

/**
 * Server Component mapping workshop ID and rendering the client UI
 * @param {{ params: Promise<{ id: string }> }} props
 * @returns {Promise<JSX.Element>}
 */
export default async function WorkshopDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
    const { id } = await params;
    const workshop = mockWorkshops.find((w) => w.id === id);

    if (!workshop) {
        notFound();
    }

    return <WorkshopClient workshop={workshop} />;
}
