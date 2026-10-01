export type Unidad = "celsius" | "fahrenheit";

export type Ciudad = {
  id: number;
  nombre: string;
  admin1: string;
  pais: string;
  lat: number;
  lon: number;
  timezone: string;
};

export type Config = {
  ciudadDefaultId: number | null;
  ciudades: Ciudad[];
  unidad: Unidad;
};

export type DiaPronostico = {
  fecha: string;
  maxima: number;
  minima: number;
  descripcion: string;
};

export type Clima = {
  temperatura: number;
  maxima: number;
  minima: number;
  etiquetaUnidad: string;
  horaLocal: string;
  dias: DiaPronostico[];
};
