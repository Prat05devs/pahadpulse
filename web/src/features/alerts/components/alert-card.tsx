'use client';

import React from 'react';
import type { Alert } from '../schemas';

interface AlertCardProps {
  alert: Alert;
  /** Position in the list, for the entrance stagger. */
  index?: number;
}

// `unknown` is a real CAP severity, not a gap: a source may issue a warning without
// grading it, and that must render as neutral rather than crash the card.
const SEVERITY_COLORS: Record<string, string> = {
  minor: 'bg-blue-50 border-blue-200 text-blue-800',
  moderate: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  severe: 'bg-orange-50 border-orange-200 text-orange-800',
  extreme: 'bg-red-50 border-red-200 text-red-800',
  unknown: 'bg-gray-50 border-gray-200 text-gray-800',
};

const TYPE_ICONS = {
  weather: '🌦️',
  river: '🌊',
  flood: '💧',
  road: '🛣️',
  disaster: '🚨',
};

const STATUS_BADGES = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-800',
  superseded: 'bg-gray-100 text-gray-800',
};

export function AlertCard({ alert, index = 0 }: AlertCardProps) {
  const colorClass = SEVERITY_COLORS[alert.severity];
  const statusClass = STATUS_BADGES[alert.status];
  const icon = TYPE_ICONS[alert.type];

  const issuedDate = new Date(alert.issuedAt);
  const expiresDate = alert.expiresAt ? new Date(alert.expiresAt) : null;
  const now = new Date();
  const isExpired = expiresDate && expiresDate <= now;

  return (
    <div
      className={`pp-rise border rounded-lg p-4 ${colorClass}`}
      // Capped so a long warning list does not take three seconds to finish arriving.
      style={{ '--pp-delay': `${Math.min(index * 50, 400)}ms` } as React.CSSProperties}
    >
      <div className="flex items-start gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-sm">{alert.headline}</h3>
            <span className={`text-xs px-2 py-1 rounded ${statusClass}`}>
              {alert.status}
            </span>
          </div>
          <p className="text-xs opacity-75 mb-2">
            {alert.authority} · Issued {issuedDate.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {alert.areas && alert.areas.length > 0 && (
        <div className="mb-2">
          <p className="text-xs opacity-60">Affects:</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {alert.areas.map((area) => (
              <span
                key={area.id}
                className="text-xs bg-white/50 px-2 py-1 rounded"
              >
                {area.name.en}
              </span>
            ))}
          </div>
        </div>
      )}

      {alert.body && (
        <p className="text-sm mb-2 line-clamp-2">{alert.body}</p>
      )}

      <div className="flex items-center justify-between text-xs opacity-60">
        <span>
          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
        </span>
        {expiresDate && (
          <span>
            Expires: {expiresDate.toLocaleString('en-IN')}
            {isExpired && ' (expired)'}
          </span>
        )}
      </div>
    </div>
  );
}
