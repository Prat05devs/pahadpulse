import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeatherPanel } from './weather-panel';
import type { WeatherData } from '../schemas';

const station: WeatherData['station'] = {
  id: 3,
  sourceStationCode: 'open-meteo:chamoli',
  type: 'weather',
  // Chamoli's station sits at the district headquarters, Gopeshwar.
  name: { en: 'Gopeshwar', hi: 'गोपेश्वर' },
  areaId: 4,
  lat: 30.4,
  lng: 79.32,
  riverName: null,
  sourceId: 8,
};

function observation(metric: string, value: number, unit: string) {
  return {
    stationId: 3,
    metric,
    observedAt: '2026-09-06T07:00:00.000Z',
    value,
    unit,
    sourceId: 8,
    fetchedAt: '2026-09-06T07:13:57.000Z',
  };
}

const baseWeather: WeatherData = {
  station,
  temperature: observation('temperature_c', 21.4, '°C'),
  rainfall: observation('rainfall_mm', 3.2, 'mm'),
  humidity: observation('humidity_pct', 88, '%'),
  wind: observation('wind_speed_kmh', 8.7, 'km/h'),
  windDirection: observation('wind_direction_deg', 143, '°'),
  condition: { code: 51, condition: 'drizzle', label: { en: 'Drizzle', hi: 'बूंदाबांदी' } },
  observedAt: '2026-09-06T07:00:00.000Z',
  forecast: [
    {
      date: '2026-09-06',
      minTemperatureC: 21.7,
      maxTemperatureC: 28.2,
      precipitationMm: 3.2,
      condition: {
        code: 95,
        condition: 'thunderstorm',
        label: { en: 'Thunderstorm', hi: 'गरज के साथ तूफ़ान' },
      },
    },
    {
      date: '2026-09-07',
      minTemperatureC: 20.1,
      maxTemperatureC: 27.0,
      precipitationMm: 0,
      condition: { code: 3, condition: 'cloudy', label: { en: 'Cloudy', hi: 'बादल छाए' } },
    },
  ],
  source: {
    id: 8,
    key: 'open-meteo',
    department: { en: 'Open-Meteo', hi: 'ओपन-मीटियो' },
    attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
  },
};

describe('WeatherPanel', () => {
  it('names the town the reading is from, not just the district', () => {
    render(<WeatherPanel weather={baseWeather} />);

    // The honesty property: a district spans thousands of metres of elevation, so the
    // panel must say which place the number describes.
    expect(screen.getByText(/Gopeshwar/)).toBeInTheDocument();
  });

  it('renders the current measurements with their units', () => {
    render(<WeatherPanel weather={baseWeather} />);

    expect(screen.getByText('21.4°C')).toBeInTheDocument();
    expect(screen.getByText('3.2 mm')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });

  it('shows wind as a speed and a compass direction', () => {
    render(<WeatherPanel weather={baseWeather} />);

    expect(screen.getByText(/8\.7 km\/h/)).toBeInTheDocument();
    // 143° rounds to SE.
    expect(screen.getByText('SE')).toBeInTheDocument();
  });

  /**
   * Regression: the panel this replaced used `value || '—'`, which renders a real zero as
   * missing data. Zero is ordinary here — no rain is the normal state most of the year.
   */
  it('renders a zero measurement as zero, not as missing', () => {
    render(
      <WeatherPanel
        weather={{ ...baseWeather, rainfall: observation('rainfall_mm', 0, 'mm') }}
      />
    );

    expect(screen.getByText('0.0 mm')).toBeInTheDocument();
  });

  it('renders an em dash when a measurement is genuinely absent', () => {
    render(<WeatherPanel weather={{ ...baseWeather, humidity: undefined }} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('names the source, so a reader can check the figure', () => {
    render(<WeatherPanel weather={baseWeather} />);

    expect(screen.getByText(/Open-Meteo\.com/)).toBeInTheDocument();
  });

  it('labels the first forecast day as today', () => {
    render(<WeatherPanel weather={baseWeather} />);

    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('survives an API response that carries no forecast', () => {
    render(<WeatherPanel weather={{ ...baseWeather, forecast: undefined }} />);

    expect(screen.getByText('21.4°C')).toBeInTheDocument();
    expect(screen.queryByText('7-day forecast')).not.toBeInTheDocument();
  });

  it('renders without a condition, which an older API would not send', () => {
    render(<WeatherPanel weather={{ ...baseWeather, condition: null }} />);

    expect(screen.getByText('21.4°C')).toBeInTheDocument();
  });
});
