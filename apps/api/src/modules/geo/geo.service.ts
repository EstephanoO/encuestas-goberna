import { Injectable } from '@nestjs/common';

export interface GeoJsonPointFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    id: string;
    label: string;
    createdAt: string;
  };
}

@Injectable()
export class GeoService {
  toGeoJsonFeatureCollection(
    points: Array<{
      id: string;
      latitude: number;
      longitude: number;
      label: string;
      createdAt: string;
    }>,
  ) {
    return {
      type: 'FeatureCollection' as const,
      features: points.map((p) => this.toFeature(p)),
    };
  }

  toFeature(point: {
    id: string;
    latitude: number;
    longitude: number;
    label: string;
    createdAt: string;
  }): GeoJsonPointFeature {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.longitude, point.latitude], // GeoJSON: lng first
      },
      properties: {
        id: point.id,
        label: point.label,
        createdAt: point.createdAt,
      },
    };
  }
}
