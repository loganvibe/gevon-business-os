/**
 * Forecast Engine — reusable prediction pipelines.
 * No external AI services: deterministic statistical forecasters behind a
 * shared `Forecaster` interface, so an LLM/ML implementation can be dropped
 * in later without touching any caller.
 */
import type { ForecastPoint, ForecastResult, Forecaster, SeriesPoint } from "./types";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function emptyResult(method: ForecastResult["method"]): ForecastResult {
  return { method, points: [], projectedTotal: 0, confidence: 0, meta: { reason: "no_history" } };
}

function build(
  method: ForecastResult["method"],
  history: SeriesPoint[],
  horizonDays: number,
  predict: (index: number) => number,
  spread: number,
  confidence: number,
  meta: Record<string, any>,
): ForecastResult {
  const lastDate = history[history.length - 1]!.date;
  const points: ForecastPoint[] = [];
  for (let i = 1; i <= horizonDays; i++) {
    const value = Math.max(0, predict(i));
    points.push({
      date: addDays(lastDate, i),
      value: Math.round(value * 100) / 100,
      lower: Math.round(Math.max(0, value - spread) * 100) / 100,
      upper: Math.round((value + spread) * 100) / 100,
    });
  }
  const projectedTotal = Math.round(points.reduce((s, p) => s + p.value, 0) * 100) / 100;
  return { method, points, projectedTotal, confidence: Math.round(confidence), meta };
}

/** Simple moving average of the trailing window — stable, low variance. */
export class MovingAverageForecaster implements Forecaster {
  readonly method = "moving_average" as const;
  constructor(private readonly window = 7) {}

  forecast(history: SeriesPoint[], horizonDays: number): ForecastResult {
    if (history.length === 0) return emptyResult(this.method);
    const tail = history.slice(-this.window);
    const values = tail.map((p) => p.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = stdDev(values);
    const confidence = Math.max(25, Math.min(90, 90 - (avg > 0 ? (sd / avg) * 60 : 40)));
    return build(this.method, history, horizonDays, () => avg, sd, confidence, {
      window: this.window,
      average: Math.round(avg * 100) / 100,
    });
  }
}

/** Least-squares trend line — captures sustained growth or decline. */
export class LinearRegressionForecaster implements Forecaster {
  readonly method = "linear_regression" as const;

  forecast(history: SeriesPoint[], horizonDays: number): ForecastResult {
    if (history.length < 3) return new MovingAverageForecaster().forecast(history, horizonDays);
    const n = history.length;
    const xs = history.map((_, i) => i + 1);
    const ys = history.map((p) => p.value);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i]! - meanX) * (ys[i]! - meanY);
      den += (xs[i]! - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;
    const residuals = ys.map((y, i) => y - (intercept + slope * xs[i]!));
    const sd = stdDev(residuals);
    const confidence = Math.max(25, Math.min(88, 88 - (meanY > 0 ? (sd / meanY) * 60 : 40)));
    return build(
      this.method,
      history,
      horizonDays,
      (i) => intercept + slope * (n + i),
      sd,
      confidence,
      { slope: Math.round(slope * 1000) / 1000, intercept: Math.round(intercept * 100) / 100 },
    );
  }
}

/** Repeats the same weekday from the previous week — good for retail rhythms. */
export class SeasonalNaiveForecaster implements Forecaster {
  readonly method = "seasonal_naive" as const;
  constructor(private readonly season = 7) {}

  forecast(history: SeriesPoint[], horizonDays: number): ForecastResult {
    if (history.length < this.season) return new MovingAverageForecaster().forecast(history, horizonDays);
    const tail = history.slice(-this.season).map((p) => p.value);
    const sd = stdDev(tail);
    const mean = tail.reduce((a, b) => a + b, 0) / tail.length;
    const confidence = Math.max(25, Math.min(85, 85 - (mean > 0 ? (sd / mean) * 50 : 40)));
    return build(
      this.method,
      history,
      horizonDays,
      (i) => tail[(i - 1) % this.season]!,
      sd,
      confidence,
      { season: this.season },
    );
  }
}

export const FORECASTERS: Record<ForecastResult["method"], Forecaster> = {
  moving_average: new MovingAverageForecaster(),
  linear_regression: new LinearRegressionForecaster(),
  seasonal_naive: new SeasonalNaiveForecaster(),
};

/**
 * Picks the forecaster that best fits the history using a hold-out backtest.
 * Deterministic, cheap, and good enough for daily business series.
 */
export function autoForecast(history: SeriesPoint[], horizonDays: number): ForecastResult {
  if (history.length < 10) return new MovingAverageForecaster().forecast(history, horizonDays);
  const holdout = Math.min(7, Math.floor(history.length / 4));
  const train = history.slice(0, history.length - holdout);
  const test = history.slice(history.length - holdout);

  let best: { result: ForecastResult; error: number } | null = null;
  for (const forecaster of Object.values(FORECASTERS)) {
    const trial = forecaster.forecast(train, holdout);
    const error =
      trial.points.reduce((sum, p, i) => sum + Math.abs(p.value - (test[i]?.value ?? 0)), 0) /
      Math.max(1, holdout);
    if (!best || error < best.error) {
      best = { result: forecaster.forecast(history, horizonDays), error };
    }
  }
  const chosen = best!.result;
  return { ...chosen, meta: { ...chosen.meta, backtestMae: Math.round(best!.error * 100) / 100 } };
}

/** Fills gaps so the forecasters always see a continuous daily series. */
export function densifyDaily(points: SeriesPoint[], from: string, to: string): SeriesPoint[] {
  const map = new Map(points.map((p) => [p.date, p.value]));
  const out: SeriesPoint[] = [];
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard++ < 800) {
    out.push({ date: cursor, value: map.get(cursor) ?? 0 });
    cursor = addDays(cursor, 1);
  }
  return out;
}
